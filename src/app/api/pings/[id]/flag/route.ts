import { NextRequest, NextResponse } from "next/server";
import { flagPing } from "@/lib/store";
import { rateLimit } from "@/lib/rateLimit";
import { requireSubscribed } from "@/lib/session";

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = requireSubscribed();
  if (!gate.ok) return gate.response;

  const rl = rateLimit(`flag:${clientKey(req)}`, 20, 60 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const id = params.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const result = flagPing(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true, flags: result.flags });
}
