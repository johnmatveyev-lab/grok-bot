import { NextRequest, NextResponse } from "next/server";
import { emptyProviderStatus, PROVIDERS, type ProviderId } from "@/lib/providers";
import { readSettingsFile, writeSettingsFile } from "@/lib/workspace";

function envKey(envVar: string): string | undefined {
  const v = process.env[envVar];
  return v && v.trim() ? v.trim() : undefined;
}

export async function GET() {
  const saved = await readSettingsFile();
  const status = emptyProviderStatus();
  for (const p of PROVIDERS) {
    const rec = saved.providers?.[p.id];
    const fromEnv = envKey(p.envVar);
    const fromLegacy = p.id === "xai" ? saved.apiKey : undefined;
    const configured = Boolean(rec?.key || fromEnv || fromLegacy);
    status[p.id] = {
      configured,
      model: rec?.model || p.defaultModel,
      baseUrl: rec?.baseUrl || p.baseUrl,
    };
  }
  const any = Object.values(status).some((s) => s.configured);
  return NextResponse.json({
    apiKeyConfigured: any,
    theme: saved.theme || "dark",
    accountName: saved.accountName || "You",
    activeProvider: saved.activeProvider || "xai",
    providers: status,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const saved = await readSettingsFile();
  const providers = { ...(saved.providers || {}) };

  if (typeof body.theme === "string") saved.theme = body.theme;
  if (typeof body.accountName === "string") saved.accountName = body.accountName;
  if (typeof body.activeProvider === "string") saved.activeProvider = body.activeProvider;

  if (typeof body.apiKey === "string" && body.apiKey.trim()) {
    saved.apiKey = body.apiKey.trim();
    providers.xai = { ...(providers.xai || {}), key: body.apiKey.trim() };
  }

  if (typeof body.provider === "string" && PROVIDERS.some((p) => p.id === body.provider)) {
    const id = body.provider as ProviderId;
    const cur = { ...(providers[id] || {}) };
    if (typeof body.key === "string") {
      if (body.key.trim()) cur.key = body.key.trim();
      else delete cur.key;
    }
    if (typeof body.model === "string" && body.model.trim()) cur.model = body.model.trim();
    if (typeof body.baseUrl === "string") {
      if (body.baseUrl.trim()) cur.baseUrl = body.baseUrl.trim();
      else delete cur.baseUrl;
    }
    if (body.clear) {
      delete cur.key;
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

  const status = emptyProviderStatus();
  const latest = await readSettingsFile();
  for (const p of PROVIDERS) {
    const rec = latest.providers?.[p.id];
    status[p.id] = {
      configured: Boolean(rec?.key || envKey(p.envVar) || (p.id === "xai" && latest.apiKey)),
      model: rec?.model || p.defaultModel,
      baseUrl: rec?.baseUrl || p.baseUrl,
    };
  }
  return NextResponse.json({
    ok: true,
    apiKeyConfigured: Object.values(status).some((s) => s.configured),
    activeProvider: latest.activeProvider || "xai",
    providers: status,
  });
}
