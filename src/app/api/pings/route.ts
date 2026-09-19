import { NextRequest, NextResponse } from "next/server";
import { createPing, getNearbyPings, getDemoPings } from "@/lib/store";
import { isValidLatLng } from "@/lib/geo";
import { rateLimit } from "@/lib/rateLimit";
import { getSessionFromCookies, requireSubscribed } from "@/lib/session";
import {
  DEFAULT_RADIUS_KM,
  MAX_NOTE_LENGTH,
  PingType,
} from "@/lib/types";

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radiusKm = parseFloat(
    searchParams.get("radiusKm") || String(DEFAULT_RADIUS_KM)
  );
  const wantDemo = searchParams.get("demo") === "1";

  if (!isValidLatLng(lat, lng)) {
    return NextResponse.json(
      { error: "lat and lng are required and must be valid" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 200) {
    return NextResponse.json(
      { error: "radiusKm must be between 0 and 200" },
      { status: 400 }
    );
  }

  const rl = rateLimit(`get:${clientKey(req)}`, 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const { subscribed } = getSessionFromCookies();

  if (!subscribed || wantDemo) {
    const pings = getDemoPings();
    return NextResponse.json({
      pings,
      count: pings.length,
      demo: true,
      subscribed: false,
    });
  }

  const pings = getNearbyPings(lat, lng, radiusKm);
  return NextResponse.json({
    pings,
    count: pings.length,
    demo: false,
    subscribed: true,
  });
}

export async function POST(req: NextRequest) {
  const gate = requireSubscribed();
  if (!gate.ok) return gate.response;

  const rl = rateLimit(`post:${clientKey(req)}`, 5, 15 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  const type = b.type as PingType;
  const note =
    typeof b.note === "string" ? b.note.trim().slice(0, MAX_NOTE_LENGTH) : undefined;
  const anonymous = b.anonymous !== false;

  if (!isValidLatLng(lat, lng)) {
    return NextResponse.json({ error: "invalid_location" }, { status: 400 });
  }
  if (type !== "moving" && type !== "parked") {
    return NextResponse.json(
      { error: "type must be moving or parked" },
      { status: 400 }
    );
  }

  const ping = createPing({ lat, lng, type, note: note || undefined, anonymous });
  return NextResponse.json({ ping }, { status: 201 });
}
