import { NextRequest, NextResponse } from "next/server";
import { getCameras, CameraState } from "@/lib/cameras";
import { isValidLatLng } from "@/lib/geo";
import { rateLimit } from "@/lib/rateLimit";

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

function parseStates(raw: string | null): CameraState[] {
  const allowed = new Set<CameraState>(["MS", "TN"]);
  if (!raw || !raw.trim()) return ["MS", "TN"];
  const parts = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is CameraState => allowed.has(s as CameraState));
  return parts.length ? parts : ["MS", "TN"];
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(`cameras:${clientKey(req)}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const { searchParams } = new URL(req.url);
  const states = parseStates(searchParams.get("states"));
  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");
  const radiusRaw = searchParams.get("radiusKm");

  let lat: number | undefined;
  let lng: number | undefined;
  let radiusKm: number | undefined;

  if (latRaw != null || lngRaw != null || radiusRaw != null) {
    lat = parseFloat(latRaw || "");
    lng = parseFloat(lngRaw || "");
    radiusKm = parseFloat(radiusRaw || "50");
    if (!isValidLatLng(lat, lng)) {
      return NextResponse.json(
        { error: "lat and lng must be valid when filtering by radius" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 800) {
      return NextResponse.json(
        { error: "radiusKm must be between 0 and 800" },
        { status: 400 }
      );
    }
  }

  try {
    const data = await getCameras({ states, lat, lng, radiusKm });
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (e) {
    console.error("[api/cameras]", e);
    return NextResponse.json(
      { error: "cameras_unavailable" },
      { status: 502 }
    );
  }
}
