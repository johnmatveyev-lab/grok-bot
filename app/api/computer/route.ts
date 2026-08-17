import { NextRequest, NextResponse } from "next/server";
import {
  browseUrl,
  deleteSafe,
  execInWorkspace,
  listDir,
  mkdirSafe,
  readComputerState,
  readFileSafe,
  writeComputerState,
  writeFileSafe,
} from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const op = req.nextUrl.searchParams.get("op") || "state";
  const p = req.nextUrl.searchParams.get("path") || "";
  try {
    if (op === "state") return NextResponse.json(await readComputerState());
    if (op === "list") return NextResponse.json({ files: await listDir(p) });
    if (op === "read") return NextResponse.json({ path: p, content: await readFileSafe(p) });
    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const op = body.op as string;
  try {
    if (op === "write") {
      const path = await writeFileSafe(body.path, String(body.content ?? ""));
      return NextResponse.json({ path });
    }
    if (op === "mkdir") {
      return NextResponse.json({ path: await mkdirSafe(body.path) });
    }
    if (op === "delete") {
      await deleteSafe(body.path);
      return NextResponse.json({ ok: true });
    }
    if (op === "exec") {
      const result = await execInWorkspace(String(body.command || ""));
      const state = await writeComputerState({
        lastCommand: body.command,
        lastOutput: (result.stdout || result.stderr).slice(0, 2000),
        app: "terminal",
      });
      return NextResponse.json({ ...result, state });
    }
    if (op === "browse") {
      const page = await browseUrl(String(body.url || ""));
      const state = await writeComputerState({
        url: page.url,
        pageTitle: page.title,
        pageText: page.text,
        app: "browser",
      });
      return NextResponse.json({ ...page, state });
    }
    if (op === "state") {
      return NextResponse.json(await writeComputerState(body.state || {}));
    }
    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
