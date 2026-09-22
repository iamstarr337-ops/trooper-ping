import { NextRequest, NextResponse } from "next/server";
import { fetchMississippiBubble, getCameras, CAMERA_DISCLAIMER } from "@/lib/cameras";
import { rateLimit } from "@/lib/rateLimit";

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rl = rateLimit(`cameras-id:${clientKey(req)}`, 90, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const id = params.id || "";
  const msMatch = id.match(/^ms-(\d+)$/i);
  if (msMatch) {
    try {
      const siteId = msMatch[1];
      const { snapshotUrl, videoUrl } = await fetchMississippiBubble(siteId);
      const list = await getCameras({ states: ["MS"] });
      const base = list.cameras.find((c) => c.id === `ms-${siteId}`);
      return NextResponse.json({
        camera: {
          id: `ms-${siteId}`,
          state: "MS" as const,
          name: base?.name || `Camera site ${siteId}`,
          lat: base?.lat ?? null,
          lng: base?.lng ?? null,
          snapshotUrl,
          videoUrl,
          credit: base?.credit,
          sourceUrl:
            base?.sourceUrl ||
            `https://www.mdottraffic.com/mapbubbles/camerasite.aspx?site=${siteId}`,
        },
        disclaimer: CAMERA_DISCLAIMER,
      });
    } catch (e) {
      console.error("[api/cameras/id ms]", e);
      return NextResponse.json(
        { error: "camera_unavailable" },
        { status: 502 }
      );
    }
  }

  const tnMatch = id.match(/^tn-(.+)$/i);
  if (tnMatch) {
    try {
      const list = await getCameras({ states: ["TN"] });
      const camera = list.cameras.find((c) => c.id === id);
      if (!camera) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      return NextResponse.json({ camera, disclaimer: CAMERA_DISCLAIMER });
    } catch (e) {
      console.error("[api/cameras/id tn]", e);
      return NextResponse.json(
        { error: "camera_unavailable" },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
