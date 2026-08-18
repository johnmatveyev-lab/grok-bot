export type ProviderId = "xai" | "openai" | "nvidia" | "kimi" | "qwen" | "openrouter" | "anthropic";

export type ProviderKind = "openai" | "anthropic";

export type ProviderDef = {
  id: ProviderId;
  name: string;
  kind: ProviderKind;
  envVar: string;
  baseUrl: string;
  docs: string;
  placeholder: string;
  hint: string;
  allowBaseUrl: boolean;
  defaultModel: string;
  models: { id: string; label: string }[];
};

export const PROVIDERS: ProviderDef[] = [
  {
    id: "xai",
    name: "xAI (Grok)",
    kind: "openai",
    envVar: "XAI_API_KEY",
    baseUrl: "https://api.x.ai/v1",
    docs: "https://console.x.ai",
    placeholder: "xai-...",
    hint: "SpaceXAI / xAI. Default for this clone.",
    allowBaseUrl: false,
    defaultModel: "grok-4.6",
    models: [
      { id: "grok-4.6", label: "Grok 4.6" },
      { id: "grok-4.5", label: "Grok 4.5" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    kind: "openai",
    envVar: "OPENAI_API_KEY",
    baseUrl: "https://api.openai.com/v1",
    docs: "https://platform.openai.com/api-keys",
    placeholder: "sk-...",
    hint: "Official OpenAI API.",
    allowBaseUrl: false,
    defaultModel: "gpt-5.6-terra",
    models: [
      { id: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
      { id: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
      { id: "gpt-5.6-luna", label: "GPT-5.6 Luna" },
      { id: "gpt-5.5", label: "GPT-5.5" },
      { id: "gpt-4.1", label: "GPT-4.1" },
    ],
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    kind: "openai",
    envVar: "NVIDIA_API_KEY",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    docs: "https://build.nvidia.com",
    placeholder: "nvapi-...",
    hint: "Hosted NIM at integrate.api.nvidia.com, or your own NIM base URL.",
    allowBaseUrl: true,
    defaultModel: "nvidia/nemotron-3-super-120b-a12b",
    models: [
      { id: "nvidia/nemotron-3-super-120b-a12b", label: "Nemotron 3 Super" },
      { id: "nvidia/nemotron-3-nano-30b-a3b", label: "Nemotron 3 Nano" },
      { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
    ],
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot)",
    kind: "openai",
    envVar: "MOONSHOT_API_KEY",
    baseUrl: "https://api.moonshot.ai/v1",
    docs: "https://platform.kimi.ai",
    placeholder: "sk-...",
    hint: "Kimi K3 via Moonshot. China endpoint: https://api.moonshot.cn/v1",
    allowBaseUrl: true,
    defaultModel: "kimi-k3",
    models: [
      { id: "kimi-k3", label: "Kimi K3" },
      { id: "kimi-k2.7-code", label: "Kimi K2.7 Code" },
    ],
  },
  {
    id: "qwen",
    name: "Qwen (DashScope)",
    kind: "openai",
    envVar: "DASHSCOPE_API_KEY",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    docs: "https://www.alibabacloud.com/help/en/model-studio",
    placeholder: "sk-...",
    hint: "International DashScope by default. China: https://dashscope.aliyuncs.com/compatible-mode/v1",
    allowBaseUrl: true,
    defaultModel: "qwen3.5-plus",
    models: [
      { id: "qwen3.5-plus", label: "Qwen3.5 Plus" },
      { id: "qwen3.8-max", label: "Qwen3.8 Max" },
      { id: "qwen-plus", label: "Qwen Plus" },
      { id: "qwen-max", label: "Qwen Max" },
      { id: "qwen3-coder-plus", label: "Qwen3 Coder Plus" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    kind: "openai",
    envVar: "OPENROUTER_API_KEY",
    baseUrl: "https://openrouter.ai/api/v1",
    docs: "https://openrouter.ai/keys",
    placeholder: "sk-or-...",
    hint: "One key for hundreds of models. Use provider/model slugs.",
    allowBaseUrl: false,
    defaultModel: "moonshotai/kimi-k3",
    models: [
      { id: "moonshotai/kimi-k3", label: "Kimi K3" },
      { id: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5" },
      { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra" },
      { id: "qwen/qwen3.5-plus", label: "Qwen3.5 Plus" },
      { id: "x-ai/grok-4.5", label: "Grok 4.5" },
      { id: "openrouter/auto", label: "OpenRouter Auto" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    kind: "anthropic",
    envVar: "ANTHROPIC_API_KEY",
    baseUrl: "https://api.anthropic.com",
    docs: "https://console.anthropic.com/settings/keys",
    placeholder: "sk-ant-...",
    hint: "Claude Messages API.",
    allowBaseUrl: false,
    defaultModel: "claude-sonnet-5",
    models: [
      { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
      { id: "claude-opus-5", label: "Claude Opus 5" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    ],
  },
];

export function providerById(id: string | undefined | null): ProviderDef {
  return PROVIDERS.find((p) => p.id === id) || PROVIDERS[0];
}

export type ProviderConfig = {
  key?: string;
  model?: string;
  baseUrl?: string;
};

export type ProviderStatus = {
  configured: boolean;
  model: string;
  baseUrl?: string;
};

export function emptyProviderStatus(): Record<ProviderId, ProviderStatus> {
  return Object.fromEntries(
    PROVIDERS.map((p) => [p.id, { configured: false, model: p.defaultModel, baseUrl: p.baseUrl }])
  ) as Record<ProviderId, ProviderStatus>;
}

const KEYS_STORE = "grok-bot-provider-keys";

export function loadLocalProviderKeys(): Partial<Record<ProviderId, ProviderConfig>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEYS_STORE);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveLocalProviderKeys(data: Partial<Record<ProviderId, ProviderConfig>>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS_STORE, JSON.stringify(data));
}

export function upsertLocalProviderKey(id: ProviderId, patch: ProviderConfig) {
  const cur = loadLocalProviderKeys();
  const next = { ...cur, [id]: { ...cur[id], ...patch } };
  if (patch.key === "") {
    const { key: _k, ...rest } = next[id] || {};
    next[id] = rest;
  }
  saveLocalProviderKeys(next);
  return next;
}
