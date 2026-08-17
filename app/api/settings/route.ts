import { NextRequest, NextResponse } from "next/server";
import { readSettingsFile, resolveApiKeyAsync, writeSettingsFile } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const headerKey = req.headers.get("x-api-key");
  const key = await resolveApiKeyAsync(headerKey);
  const saved = await readSettingsFile();
  return NextResponse.json({
    apiKeyConfigured: Boolean(key),
    theme: saved.theme || "dark",
    accountName: saved.accountName || "You",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body.apiKey === "string") patch.apiKey = body.apiKey.trim();
  if (typeof body.theme === "string") patch.theme = body.theme;
  if (typeof body.accountName === "string") patch.accountName = body.accountName;
  await writeSettingsFile(patch);
  const key = await resolveApiKeyAsync(null);
  return NextResponse.json({ ok: true, apiKeyConfigured: Boolean(key || patch.apiKey) });
}
