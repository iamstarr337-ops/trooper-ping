import { NextRequest, NextResponse } from "next/server";
import { fetchMississippiBubble, CREDIT_MS, CAMERA_DISCLAIMER } from "@/lib/cameras";
import { rateLimit } from "@/lib/rateLimit";

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

export async function GET(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const rl = rateLimit(`cameras-ms:${clientKey(req)}`, 90, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const siteId = params.siteId?.replace(/[^\d]/g, "") || "";
  if (!siteId) {
    return NextResponse.json({ error: "invalid_site" }, { status: 400 });
  }

  try {
    const { snapshotUrl, videoUrl } = await fetchMississippiBubble(siteId);
    return NextResponse.json({
      id: `ms-${siteId}`,
      state: "MS",
      snapshotUrl,
      videoUrl,
      credit: CREDIT_MS,
      disclaimer: CAMERA_DISCLAIMER,
      sourceUrl: `https://www.mdottraffic.com/mapbubbles/camerasite.aspx?site=${siteId}`,
    });
  } catch (e) {
    console.error("[api/cameras/ms]", e);
    return NextResponse.json(
      { error: "bubble_unavailable" },
      { status: 502 }
    );
  }
}
