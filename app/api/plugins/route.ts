import { NextRequest, NextResponse } from "next/server";
import { PLUGIN_CATALOG } from "@/lib/plugins";
import { testPlugin } from "@/lib/plugin-runtime";
import { readSettingsFile, writeSettingsFile } from "@/lib/workspace";

export async function GET() {
  const saved = await readSettingsFile();
  const creds = saved.pluginCreds || {};
  return NextResponse.json({
    plugins: PLUGIN_CATALOG.map((p) => ({
      id: p.id,
      connected: Boolean(creds[p.id] && Object.values(creds[p.id]).some(Boolean)),
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!PLUGIN_CATALOG.some((p) => p.id === id)) {
    return NextResponse.json({ error: "Unknown plugin" }, { status: 400 });
  }
  const saved = await readSettingsFile();
  const pluginCreds = { ...(saved.pluginCreds || {}) };

  if (body.op === "clear") {
    delete pluginCreds[id];
    await writeSettingsFile({ pluginCreds });
    return NextResponse.json({ ok: true, connected: false });
  }

  const creds = (body.creds || {}) as Record<string, string>;
  const test = await testPlugin(id, creds);
  if (!test.ok) {
    return NextResponse.json({ ok: false, error: test.error }, { status: 400 });
  }
  pluginCreds[id] = creds;
  await writeSettingsFile({ pluginCreds });
  return NextResponse.json({ ok: true, connected: true, label: test.label });
}
