import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { providerById, type ProviderId } from "./providers";
import { COMPUTER_TOOLS } from "./tools";
import { readSettingsFile } from "./workspace";

export type ResolvedLlm = {
  provider: ProviderId;
  model: string;
  apiKey: string;
  baseUrl: string;
  kind: "openai" | "anthropic";
  extraHeaders?: Record<string, string>;
};

export async function resolveLlm(opts: {
  provider?: string;
  model?: string;
  providerKey?: string;
  baseUrl?: string;
  headerKey?: string | null;
}): Promise<ResolvedLlm | null> {
  const saved = await readSettingsFile();
  const provider = providerById(opts.provider || saved.activeProvider || "xai");
  const rec = saved.providers?.[provider.id];
  const apiKey =
    (opts.providerKey && opts.providerKey.trim()) ||
    (opts.headerKey && opts.headerKey.trim()) ||
    rec?.key ||
    process.env[provider.envVar] ||
    (provider.id === "xai" ? saved.apiKey || process.env.XAI_API_KEY : undefined);

  if (!apiKey) return null;

  const model = (opts.model || rec?.model || provider.defaultModel).trim();
  const baseUrl = (opts.baseUrl || rec?.baseUrl || provider.baseUrl).replace(/\/+$/, "");
  const extraHeaders =
    provider.id === "openrouter"
      ? { "HTTP-Referer": "https://grok-bot-six.vercel.app", "X-Title": "Grok Bot clone" }
      : undefined;

  return { provider: provider.id, model, apiKey, baseUrl, kind: provider.kind, extraHeaders };
}

export const OPENAI_TOOLS = COMPUTER_TOOLS;

export type LlmTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export const ANTHROPIC_TOOLS = COMPUTER_TOOLS.map((t) => ({
  name: t.function.name,
  description: t.function.description,
  input_schema: t.function.parameters as Record<string, unknown>,
}));

export function makeOpenAIClient(llm: ResolvedLlm): OpenAI {
  return new OpenAI({
    apiKey: llm.apiKey,
    baseURL: llm.baseUrl,
    timeout: 360_000,
    defaultHeaders: llm.extraHeaders,
  });
}

export async function streamOpenAI(opts: {
  llm: ResolvedLlm;
  messages: ChatCompletionMessageParam[];
  tools?: LlmTool[];
  onText: (t: string) => void;
}): Promise<{ text: string; calls: { id: string; name: string; args: string }[] }> {
  const tools = (opts.tools?.length ? opts.tools : OPENAI_TOOLS) as LlmTool[];
  const client = makeOpenAIClient(opts.llm);
  const completion = await client.chat.completions.create({
    model: opts.llm.model,
    messages: opts.messages,
    tools,
    stream: true,
  });

  let text = "";
  const toolAcc: Record<number, { id: string; name: string; args: string }> = {};

  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) {
      text += delta.content;
      opts.onText(delta.content);
    }
    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index ?? 0;
        if (!toolAcc[idx]) toolAcc[idx] = { id: tc.id || `call_${idx}`, name: "", args: "" };
        if (tc.id) toolAcc[idx].id = tc.id;
        if (tc.function?.name) toolAcc[idx].name += tc.function.name;
        if (tc.function?.arguments) toolAcc[idx].args += tc.function.arguments;
      }
    }
  }

  return { text, calls: Object.values(toolAcc).filter((t) => t.name) };
}

type AnthropicMessage =
  | { role: "user" | "assistant"; content: string | AnthropicBlock[] };

type AnthropicBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

export async function streamAnthropic(opts: {
  llm: ResolvedLlm;
  system: string;
  messages: AnthropicMessage[];
  tools?: LlmTool[];
  onText: (t: string) => void;
}): Promise<{ text: string; calls: { id: string; name: string; args: string }[]; raw: AnthropicBlock[] }> {
  const openaiTools = (opts.tools?.length ? opts.tools : OPENAI_TOOLS) as LlmTool[];
  const tools = openaiTools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters as Record<string, unknown>,
  }));
  const res = await fetch(`${opts.llm.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": opts.llm.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.llm.model,
      max_tokens: 8192,
      system: opts.system,
      messages: opts.messages,
      tools,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(err.slice(0, 800) || `Anthropic ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  const blocks: AnthropicBlock[] = [];
  let current: { type: string; id?: string; name?: string; json: string } | null = null;

  const flush = () => {
    if (!current) return;
    if (current.type === "text" && current.json) {
      blocks.push({ type: "text", text: current.json });
    }
    if (current.type === "tool_use" && current.id && current.name) {
      let input: Record<string, unknown> = {};
      try {
        input = JSON.parse(current.json || "{}");
      } catch {
        input = {};
      }
      blocks.push({ type: "tool_use", id: current.id, name: current.name, input });
    }
    current = null;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n");
    buf = parts.pop() || "";
    for (const line of parts) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let ev: Record<string, unknown>;
      try {
        ev = JSON.parse(payload);
      } catch {
        continue;
      }
      const type = String(ev.type || "");
      if (type === "content_block_start") {
        flush();
        const block = ev.content_block as { type?: string; id?: string; name?: string } | undefined;
        current = { type: block?.type || "text", id: block?.id, name: block?.name, json: "" };
      } else if (type === "content_block_delta") {
        const delta = ev.delta as { type?: string; text?: string; partial_json?: string } | undefined;
        if (!current) current = { type: "text", json: "" };
        if (delta?.text) {
          current.json += delta.text;
          text += delta.text;
          opts.onText(delta.text);
        }
        if (delta?.partial_json) current.json += delta.partial_json;
      } else if (type === "content_block_stop") {
        flush();
      } else if (type === "error") {
        const err = ev.error as { message?: string } | undefined;
        throw new Error(err?.message || "Anthropic stream error");
      }
    }
  }
  flush();

  const calls = blocks
    .filter((b): b is Extract<AnthropicBlock, { type: "tool_use" }> => b.type === "tool_use")
    .map((b) => ({ id: b.id, name: b.name, args: JSON.stringify(b.input || {}) }));

  return { text, calls, raw: blocks };
}

export function toAnthropicHistory(
  systemSkipped: { role: "user" | "assistant"; content: string }[]
): AnthropicMessage[] {
  return systemSkipped.map((m) => ({ role: m.role, content: m.content }));
}


