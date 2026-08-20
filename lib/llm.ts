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

function envKeyFor(id: ProviderId): string | undefined {
  const map: Record<ProviderId, string | undefined> = {
    xai: process.env.XAI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    nvidia: process.env.NVIDIA_API_KEY,
    kimi: process.env.MOONSHOT_API_KEY,
    qwen: process.env.DASHSCOPE_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  };
  const direct = map[id]?.trim();
  if (direct) return direct;
  const dyn = process.env[providerById(id).envVar];
  return dyn?.trim() || undefined;
}

export const KEY_COOKIE = "gb-provider-keys";

export function parseKeyCookie(raw?: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

type KeyExtras = {
  requestedId?: ProviderId;
  providerKey?: string;
  headerKey?: string | null;
  providerKeys?: Record<string, string>;
  cookieKeys?: Record<string, string>;
};

function keyForProvider(
  id: ProviderId,
  saved: Awaited<ReturnType<typeof readSettingsFile>>,
  extras: KeyExtras
): string | undefined {
  const rec = saved.providers?.[id];
  const fromMap = (map?: Record<string, string>) => map?.[id]?.trim();
  const requested = extras.requestedId === id;
  return (
    (requested ? extras.providerKey?.trim() : undefined) ||
    (requested || id === "xai" ? extras.headerKey?.trim() : undefined) ||
    fromMap(extras.providerKeys) ||
    fromMap(extras.cookieKeys) ||
    rec?.key?.trim() ||
    envKeyFor(id) ||
    (id === "xai" ? saved.apiKey?.trim() : undefined)
  );
}

export async function resolveLlm(opts: {
  provider?: string;
  model?: string;
  providerKey?: string;
  providerKeys?: Record<string, string>;
  cookieKeys?: Record<string, string>;
  baseUrl?: string;
  headerKey?: string | null;
}): Promise<ResolvedLlm | null> {
  const saved = await readSettingsFile();
  const requested = providerById(opts.provider || saved.activeProvider || "xai");
  const extras: KeyExtras = {
    requestedId: requested.id,
    providerKey: opts.providerKey,
    headerKey: opts.headerKey,
    providerKeys: opts.providerKeys,
    cookieKeys: opts.cookieKeys,
  };
  const fallback = [requested.id, saved.activeProvider, "nvidia", "xai", "openai", "kimi", "qwen", "openrouter", "anthropic"]
    .filter(Boolean)
    .map((id) => providerById(String(id)));
  const provider = fallback.find((p) => keyForProvider(p.id, saved, extras)) || requested;
  const rec = saved.providers?.[provider.id];
  const apiKey = keyForProvider(provider.id, saved, extras);

  if (!apiKey) return null;

  const model = (opts.model || rec?.model || provider.defaultModel).trim();
  const baseUrl = (opts.baseUrl || rec?.baseUrl || provider.baseUrl).replace(/\/+$/, "");
  const extraHeaders =
    provider.id === "openrouter"
      ? { "HTTP-Referer": "https://grok-bot-six.vercel.app", "X-Title": "Open teammate bots" }
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

function humanizeLlmError(provider: string, status: number, body: string): string {
  let detail = body.slice(0, 400);
  try {
    const parsed = JSON.parse(body) as { detail?: string; title?: string; error?: { message?: string } | string; message?: string };
    detail =
      parsed.detail ||
      (typeof parsed.error === "string" ? parsed.error : parsed.error?.message) ||
      parsed.message ||
      parsed.title ||
      detail;
  } catch {
    /* keep raw */
  }
  if (status === 401 || status === 403) {
    return `${provider} rejected this API key (${detail}). Check Settings → Models.`;
  }
  return `${provider} ${status}: ${detail}`.slice(0, 500);
}

function deltaText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String((part as { text?: string }).text || "");
        return "";
      })
      .join("");
  }
  return "";
}

async function postChatCompletions(
  llm: ResolvedLlm,
  payload: Record<string, unknown>
): Promise<Response> {
  const res = await fetch(`${llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${llm.apiKey}`,
      ...llm.extraHeaders,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(humanizeLlmError(llm.provider, res.status, err));
  }
  if (!res.body) throw new Error(`${llm.provider} returned an empty body`);
  return res;
}

export async function probeOpenAI(llm: ResolvedLlm): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${llm.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${llm.apiKey}`,
        ...llm.extraHeaders,
      },
      body: JSON.stringify({
        model: llm.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 4,
        stream: false,
        ...(llm.provider === "nvidia" ? { chat_template_kwargs: { enable_thinking: false } } : {}),
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return { ok: false, error: humanizeLlmError(llm.provider, res.status, err) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "probe failed" };
  }
}

export async function streamOpenAI(opts: {
  llm: ResolvedLlm;
  messages: ChatCompletionMessageParam[];
  tools?: LlmTool[];
  onText: (t: string) => void;
}): Promise<{ text: string; calls: { id: string; name: string; args: string }[] }> {
  const tools = (opts.tools?.length ? opts.tools : OPENAI_TOOLS) as LlmTool[];
  const payload: Record<string, unknown> = {
    model: opts.llm.model,
    messages: opts.messages,
    stream: true,
    ...(tools.length ? { tools, tool_choice: "auto" } : {}),
    ...(opts.llm.provider === "nvidia"
      ? { max_tokens: 2048, chat_template_kwargs: { enable_thinking: false } }
      : {}),
  };

  let res: Response;
  try {
    res = await postChatCompletions(opts.llm, payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (tools.length && /tool|function.?call|does not support|400|invalid/i.test(msg)) {
      const { tools: _t, tool_choice: _c, ...rest } = payload;
      res = await postChatCompletions(opts.llm, rest);
    } else {
      throw e;
    }
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  const toolAcc: Record<number, { id: string; name: string; args: string }> = {};

  const consume = (payloadLine: string) => {
    if (!payloadLine || payloadLine === "[DONE]") return;
    let ev: {
      error?: { message?: string };
      choices?: { delta?: { content?: unknown; tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[] } }[];
    };
    try {
      ev = JSON.parse(payloadLine);
    } catch {
      return;
    }
    if (ev.error?.message) throw new Error(ev.error.message);
    const delta = ev.choices?.[0]?.delta;
    const piece = deltaText(delta?.content);
    if (piece) {
      text += piece;
      opts.onText(piece);
    }
    const calls = Array.isArray(delta?.tool_calls) ? delta!.tool_calls! : [];
    for (const tc of calls) {
      const idx = tc.index ?? 0;
      if (!toolAcc[idx]) toolAcc[idx] = { id: tc.id || `call_${idx}`, name: "", args: "" };
      if (tc.id) toolAcc[idx].id = tc.id;
      if (tc.function?.name) toolAcc[idx].name += tc.function.name;
      if (tc.function?.arguments) toolAcc[idx].args += tc.function.arguments;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n");
    buf = parts.pop() || "";
    for (const line of parts) {
      if (!line.startsWith("data:")) continue;
      consume(line.slice(5).trim());
    }
  }
  if (buf.startsWith("data:")) consume(buf.slice(5).trim());

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


