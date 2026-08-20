import { NextRequest, NextResponse } from "next/server";

/** Optional gate for public deploys. If APP_SECRET is unset, APIs stay open (local/dev). */
export function denyIfUnauthorized(req: NextRequest): NextResponse | null {
  const secret = process.env.APP_SECRET?.trim();
  if (!secret) return null;
  const got = req.headers.get("x-app-secret") || req.cookies.get("app-secret")?.value || "";
  if (got !== secret) {
    return NextResponse.json({ error: "Unauthorized. Set x-app-secret or the app-secret cookie." }, { status: 401 });
  }
  return null;
}
