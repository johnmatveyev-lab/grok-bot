import { NextRequest } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { resolveLlm, streamAnthropic, streamOpenAI } from "@/lib/llm";
import { buildSystemPrompt } from "@/lib/system-prompt";
import type { Chat, Plugin, Skill } from "@/lib/types";
import {
  browseUrl,
  execInWorkspace,
  listDir,
  readFileSafe,
  writeComputerState,
  writeFileSafe,
} from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 120;

type Incoming = {
  chat: Chat;
  roster: { name: string; title?: string }[];
  skills: Skill[];
  plugins: Plugin[];
  userText: string;
  provider?: string;
  model?: string;
  providerKey?: string;
  baseUrl?: string;
};

function sse(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  send: (o: unknown) => void
): Promise<string> {
  try {
    if (name === "list_files") {
      const p = String(args.path || "/workspace");
      await writeComputerState({ app: "files", cwd: p, status: "working" });
      send({ type: "computer", app: "files", cwd: p });
      const files = await listDir(p);
      return files.map((f) => `${f.type === "dir" ? "dir" : "file"} ${f.path}`).join("\n") || "(empty)";
    }
    if (name === "read_file") {
      const p = String(args.path || "");
      await writeComputerState({ app: "files", cwd: p, status: "working" });
      send({ type: "computer", app: "files", cwd: p });
      return await readFileSafe(p);
    }
    if (name === "write_file") {
      const p = String(args.path || "");
      const written = await writeFileSafe(p, String(args.content ?? ""));
      const cwd = written.replace(/\/[^/]+$/, "") || "/workspace";
      await writeComputerState({ app: "files", cwd, status: "working" });
      send({ type: "computer", app: "files", cwd, file: written });
      return `Wrote ${written}`;
    }
    if (name === "run_command") {
      const command = String(args.command || "");
      await writeComputerState({ app: "terminal", lastCommand: command, status: "working" });
      send({ type: "computer", app: "terminal", command });
      const result = await execInWorkspace(command);
      const out = [result.stdout, result.stderr].filter(Boolean).join("\n") || `(exit ${result.code})`;
      await writeComputerState({ lastOutput: out.slice(0, 2000), lastCommand: command });
      send({ type: "computer", app: "terminal", output: out.slice(0, 2000) });
      return out.slice(0, 8000);
    }
    if (name === "browse_page") {
      const url = String(args.url || "");
      await writeComputerState({ app: "browser", url, status: "working" });
      send({ type: "computer", app: "browser", url });
      const page = await browseUrl(url);
      await writeComputerState({ url: page.url, pageTitle: page.title, pageText: page.text });
      send({ type: "computer", app: "browser", url: page.url, title: page.title });
      return `# ${page.title}\nURL: ${page.url}\n\n${page.text}`;
    }
    if (name === "save_memory") {
      const note = String(args.note || "");
      send({ type: "memory", note });
      return `Remembered: ${note}`;
    }
    if (name === "create_routine") {
      const routine = {
        name: String(args.name || "Routine"),
        schedule: String(args.schedule || ""),
        instructions: String(args.instructions || ""),
      };
      send({ type: "routine", routine });
      return `Routine created: ${routine.name} (${routine.schedule})`;
    }
    if (name === "create_skill") {
      const skill = {
        name: String(args.name || "Skill"),
        description: String(args.description || ""),
        instructions: String(args.instructions || ""),
      };
      send({ type: "skill", skill });
      return `Skill saved: ${skill.name}`;
    }
    if (name === "request_approval") {
      const approval = {
        action: String(args.action || "Action"),
        detail: String(args.detail || ""),
      };
      send({ type: "approval", approval });
      return `Approval requested for: ${approval.action}. Wait for the human.`;
    }
    if (name === "message_bot") {
      const handoff = { bot: String(args.bot_name || ""), message: String(args.message || "") };
      send({ type: "handoff", handoff });
      return `Queued a message to ${handoff.bot}.`;
    }
    return `Unknown tool ${name}`;
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "tool failed"}`;
  }
}

async function demoLoop(body: Incoming, send: (o: unknown) => Promise<void> | void) {
  const text = body.userText.toLowerCase();
  const name = body.chat.name;
  await send({ type: "status", status: "working" });

  const wantsWrite = /write|create|save|draft|template|agreement|markdown|\.md/.test(text);
  const wantsList = /\b(ls|list files|list the files|what's in)\b/.test(text) || (/\/workspace/.test(text) && !wantsWrite);
  const url = body.userText.match(/https?:\/\/\S+/)?.[0];
  const wantsRoutine = /every (day|weekday|morning)|schedule|routine/.test(text);

  if (wantsList) {
    await send({ type: "tool", id: "t1", name: "list_files", status: "running", args: { path: "/workspace" } });
    const result = await runTool("list_files", { path: "/workspace" }, send);
    await send({ type: "tool", id: "t1", name: "list_files", status: "done", result });
    if (!wantsWrite && !url) {
      await send({
        type: "text",
        text: `On the shared computer at \`/workspace\`:\n\n\`\`\`\n${result}\n\`\`\`\n\nSay what you want created, opened, or summarized.`,
      });
      return;
    }
  }

  if (url) {
    await send({ type: "tool", id: "t2", name: "browse_page", status: "running", args: { url } });
    const result = await runTool("browse_page", { url }, send);
    await send({ type: "tool", id: "t2", name: "browse_page", status: "done", result: result.slice(0, 500) });
    await send({
      type: "text",
      text: `Opened it on the shared computer.\n\n${result.slice(0, 900)}\n\nSay what you want extracted or saved.`,
    });
    return;
  }

  if (wantsWrite) {
    const folder = body.chat.title?.toLowerCase().includes("sales")
      ? "projects/outbound"
      : body.chat.title?.toLowerCase().includes("bug")
        ? "projects/bugs"
        : body.chat.title?.toLowerCase().includes("expense")
          ? "projects/expenses"
          : body.chat.title?.toLowerCase().includes("talent")
            ? "projects/talent"
            : body.chat.title?.toLowerCase().includes("performance")
              ? "projects/performance"
              : body.chat.title?.toLowerCase().includes("chief")
                ? "projects/ops"
                : "drafts";
    const named = body.userText.match(/(\/workspace\/[\w./-]+\.\w+)/)?.[1];
    const path = named || `/workspace/${folder}/note.md`;
    const content = `# ${body.chat.name}\n\nAsked: ${body.userText}\n\n## Working notes\n- Left on the shared computer so any Bot can continue this.\n- Approval required before sending, paying, or changing production.\n`;
    await send({ type: "tool", id: "t3", name: "write_file", status: "running", args: { path } });
    const result = await runTool("write_file", { path, content }, send);
    await send({ type: "tool", id: "t3", name: "write_file", status: "done", result });
    await send({
      type: "text",
      text: `Done — left this on the shared computer at \`${path}\`.\n\nI treated this as a first-pass note, not a send. Add an xAI API key in Settings → General if you want me to think with Grok 4.6 instead of this local stand-in.`,
    });
    return;
  }

  if (wantsRoutine) {
    await send({
      type: "tool",
      id: "t4",
      name: "create_routine",
      status: "running",
      args: { name: "Morning sweep", schedule: "Weekdays 8:00 AM" },
    });
    const result = await runTool(
      "create_routine",
      {
        name: "Morning sweep",
        schedule: "Weekdays 8:00 AM",
        instructions: body.userText,
      },
      send
    );
    await send({ type: "tool", id: "t4", name: "create_routine", status: "done", result });
    await send({
      type: "text",
      text: `Routine is on my board: **Morning sweep**, weekdays at 8:00 AM. I'll post the result here and stop short of anything that needs your approval.`,
    });
    return;
  }

  await send({
    type: "text",
    text: `Hey — ${name} here. I can already use the shared computer (files, terminal, browser) from this chat.\n\nGive me a concrete outcome, the sources that matter, and what I must not do without you. Example: “Write a one-page brief to /workspace/drafts/brief.md from this link, cite everything, don’t email anyone.”\n\nAdd an API key in Settings → Models to run OpenAI, NVIDIA NIM, Kimi K3, Qwen, OpenRouter, Anthropic, or Grok.`,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Incoming;
  const llm = await resolveLlm({
    provider: body.provider,
    model: body.model,
    providerKey: body.providerKey,
    baseUrl: body.baseUrl,
    headerKey: req.headers.get("x-api-key"),
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(sse(obj)));
      try {
        if (!llm) {
          await demoLoop(body, send);
          await writeComputerState({ status: "idle" });
          send({ type: "done" });
          controller.close();
          return;
        }

        send({ type: "model", provider: llm.provider, model: llm.model });

        const system = buildSystemPrompt({
          chat: body.chat,
          roster: body.roster,
          skills: body.skills || [],
          plugins: body.plugins || [],
        });

        const prior = body.chat.messages
          .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim())
          .slice(-24);
        if (prior.at(-1)?.role === "user" && prior.at(-1)?.content === body.userText) {
          prior.pop();
        }

        send({ type: "status", status: "working" });
        await writeComputerState({ status: "working", screenBotId: body.chat.id });

        if (llm.kind === "anthropic") {
          type AMsg = { role: "user" | "assistant"; content: string | unknown[] };
          const messages: AMsg[] = [
            ...prior.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
            { role: "user", content: body.userText },
          ];
          for (let round = 0; round < 8; round++) {
            const { text, calls, raw } = await streamAnthropic({
              llm,
              system,
              messages: messages as Parameters<typeof streamAnthropic>[0]["messages"],
              onText: (t) => send({ type: "text", text: t }),
            });
            if (!calls.length) break;
            messages.push({ role: "assistant", content: raw });
            const results: unknown[] = [];
            for (const call of calls) {
              let parsed: Record<string, unknown> = {};
              try {
                parsed = JSON.parse(call.args || "{}");
              } catch {
                parsed = {};
              }
              send({ type: "tool", id: call.id, name: call.name, status: "running", args: parsed });
              const result = await runTool(call.name, parsed, send);
              send({ type: "tool", id: call.id, name: call.name, status: "done", result: result.slice(0, 2000) });
              results.push({ type: "tool_result", tool_use_id: call.id, content: result });
            }
            messages.push({ role: "user", content: results });
            void text;
          }
        } else {
          const history: ChatCompletionMessageParam[] = [
            { role: "system", content: system },
            ...prior.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
            { role: "user", content: body.userText },
          ];
          for (let round = 0; round < 8; round++) {
            const { text, calls } = await streamOpenAI({
              llm,
              messages: history,
              onText: (t) => send({ type: "text", text: t }),
            });
            if (!calls.length) break;
            history.push({
              role: "assistant",
              content: text || null,
              tool_calls: calls.map((c) => ({
                id: c.id,
                type: "function" as const,
                function: { name: c.name, arguments: c.args || "{}" },
              })),
            });
            for (const call of calls) {
              let parsed: Record<string, unknown> = {};
              try {
                parsed = JSON.parse(call.args || "{}");
              } catch {
                parsed = {};
              }
              send({ type: "tool", id: call.id, name: call.name, status: "running", args: parsed });
              const result = await runTool(call.name, parsed, send);
              send({ type: "tool", id: call.id, name: call.name, status: "done", result: result.slice(0, 2000) });
              history.push({ role: "tool", tool_call_id: call.id, content: result });
            }
          }
        }

        await writeComputerState({ status: "idle" });
        send({ type: "done" });
      } catch (e) {
        send({ type: "error", error: e instanceof Error ? e.message : "Chat failed" });
        await writeComputerState({ status: "idle" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
