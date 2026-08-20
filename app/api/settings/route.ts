import { NextRequest, NextResponse } from "next/server";
import { denyIfUnauthorized } from "@/lib/access";
import { KEY_COOKIE, parseKeyCookie, probeOpenAI, resolveLlm } from "@/lib/llm";
import { emptyProviderStatus, PROVIDERS, type ProviderId } from "@/lib/providers";
import { readSettingsFile, writeSettingsFile } from "@/lib/workspace";

export const runtime = "nodejs";

function envKey(id: string, envVar: string): string | undefined {
  const staticMap: Record<string, string | undefined> = {
    xai: process.env.XAI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    nvidia: process.env.NVIDIA_API_KEY,
    kimi: process.env.MOONSHOT_API_KEY,
    qwen: process.env.DASHSCOPE_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  };
  const v = staticMap[id] || process.env[envVar];
  return v && v.trim() ? v.trim() : undefined;
}

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: Boolean(process.env.VERCEL),
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

function buildStatus(
  saved: Awaited<ReturnType<typeof readSettingsFile>>,
  cookieKeys: Record<string, string>
) {
  const status = emptyProviderStatus();
  for (const p of PROVIDERS) {
    const rec = saved.providers?.[p.id];
    const fromEnv = envKey(p.id, p.envVar);
    const fromLegacy = p.id === "xai" ? saved.apiKey : undefined;
    const fromCookie = cookieKeys[p.id];
    const configured = Boolean(rec?.key || fromEnv || fromLegacy || fromCookie);
    status[p.id] = {
      configured,
      model: rec?.model || p.defaultModel,
      baseUrl: rec?.baseUrl || p.baseUrl,
      source: rec?.key || fromLegacy ? "saved" : fromEnv ? "env" : fromCookie ? "cookie" : null,
    };
  }
  const savedActive = saved.activeProvider || "xai";
  const active =
    status[savedActive as ProviderId]?.configured
      ? savedActive
      : Object.entries(status).find(([, s]) => s.configured)?.[0] || savedActive;
  return {
    status,
    activeProvider: active,
    apiKeyConfigured: Object.values(status).some((s) => s.configured),
  };
}

function seedCookie(
  saved: Awaited<ReturnType<typeof readSettingsFile>>,
  cookieKeys: Record<string, string>
): Record<string, string> {
  const next = { ...cookieKeys };
  if (saved.apiKey && !next.xai) next.xai = saved.apiKey;
  for (const [id, rec] of Object.entries(saved.providers || {})) {
    if (rec?.key && !next[id]) next[id] = rec.key;
  }
  return next;
}

export async function GET(req: NextRequest) {
  const saved = await readSettingsFile();
  const cookieKeys = parseKeyCookie(req.cookies.get(KEY_COOKIE)?.value);
  const { status, activeProvider, apiKeyConfigured } = buildStatus(saved, cookieKeys);
  return NextResponse.json({
    apiKeyConfigured,
    theme: saved.theme || "dark",
    accountName: saved.accountName || "You",
    activeProvider,
    providers: status,
  });
}

export async function POST(req: NextRequest) {
  const denied = denyIfUnauthorized(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const saved = await readSettingsFile();
  const cookieKeys = seedCookie(saved, parseKeyCookie(req.cookies.get(KEY_COOKIE)?.value));

  if (body.op === "probe") {
    const llm = await resolveLlm({
      provider: body.provider,
      model: body.model,
      providerKey: body.key,
      cookieKeys,
      headerKey: req.headers.get("x-api-key"),
    });
    if (!llm) {
      return NextResponse.json({ ok: false, error: "No API key for that provider" }, { status: 400 });
    }
    if (llm.kind === "anthropic") {
      const res = await fetch(`${llm.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": llm.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: llm.model,
          max_tokens: 4,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      const text = await res.text();
      return NextResponse.json({
        ok: res.ok,
        provider: llm.provider,
        model: llm.model,
        error: res.ok ? undefined : text.slice(0, 240),
      });
    }
    const probe = await probeOpenAI(llm);
    return NextResponse.json({
      ok: probe.ok,
      provider: llm.provider,
      model: llm.model,
      error: probe.error,
    });
  }

  const providers = { ...(saved.providers || {}) };

  if (typeof body.theme === "string") saved.theme = body.theme;
  if (typeof body.accountName === "string") saved.accountName = body.accountName;
  if (typeof body.activeProvider === "string") saved.activeProvider = body.activeProvider;

  if (typeof body.apiKey === "string" && body.apiKey.trim()) {
    saved.apiKey = body.apiKey.trim();
    providers.xai = { ...(providers.xai || {}), key: body.apiKey.trim() };
    cookieKeys.xai = body.apiKey.trim();
  }

  if (typeof body.provider === "string" && PROVIDERS.some((p) => p.id === body.provider)) {
    const id = body.provider as ProviderId;
    const cur = { ...(providers[id] || {}) };
    if (typeof body.key === "string") {
      if (body.key.trim()) {
        cur.key = body.key.trim();
        cookieKeys[id] = body.key.trim();
        saved.activeProvider = id;
      } else {
        delete cur.key;
        delete cookieKeys[id];
      }
    }
    if (typeof body.model === "string" && body.model.trim()) cur.model = body.model.trim();
    if (typeof body.baseUrl === "string") {
      if (body.baseUrl.trim()) cur.baseUrl = body.baseUrl.trim();
      else delete cur.baseUrl;
    }
    if (body.clear) {
      delete cur.key;
      delete cookieKeys[id];
    }
    providers[id] = cur;
    if (id === "xai") {
      if (cur.key) saved.apiKey = cur.key;
      else if (body.clear || body.key === "") delete saved.apiKey;
    }
  }

  await writeSettingsFile({
    theme: saved.theme,
    accountName: saved.accountName,
    activeProvider: saved.activeProvider,
    apiKey: saved.apiKey,
    providers,
  });

  const latest = await readSettingsFile();
  const { status, activeProvider, apiKeyConfigured } = buildStatus(latest, cookieKeys);
  const res = NextResponse.json({
    ok: true,
    apiKeyConfigured,
    activeProvider,
    providers: status,
  });
  res.cookies.set(KEY_COOKIE, JSON.stringify(cookieKeys), cookieOpts());
  return res;
}
