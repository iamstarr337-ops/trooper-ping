import { Camera, CREDIT_TN } from "./types";

const TDOT_URL =
  "https://www.tdot.tn.gov/opendata/api/public/RoadwayCameras";
const PUBLIC_TDOT_KEY = "8d3b7a82635d476795c09b2c41facc60";

interface TdotCamera {
  id: number | string;
  title?: string;
  description?: string;
  name?: string;
  lat?: number;
  lng?: number;
  thumbnailUrl?: string | null;
  httpsVideoUrl?: string | null;
  active?: string | boolean;
  jurisdiction?: string;
  route?: string;
}

function apiKey(): string {
  return process.env.TDOT_API_KEY?.trim() || PUBLIC_TDOT_KEY;
}

export async function fetchTennesseeCameras(): Promise<Camera[]> {
  const res = await fetch(TDOT_URL, {
    headers: { ApiKey: apiKey() },
    next: { revalidate: 0 },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`TDOT cameras HTTP ${res.status}`);
  }
  const data = (await res.json()) as TdotCamera[];
  if (!Array.isArray(data)) {
    throw new Error("TDOT cameras: unexpected payload");
  }

  const out: Camera[] = [];
  for (const c of data) {
    if (String(c.active ?? "").toLowerCase() !== "true") continue;
    const lat = Number(c.lat);
    const lng = Number(c.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const name =
      (c.title || c.description || c.name || `Camera ${c.id}`).trim() ||
      `TN ${c.id}`;
    out.push({
      id: `tn-${c.id}`,
      state: "TN",
      name,
      lat,
      lng,
      snapshotUrl: c.thumbnailUrl || null,
      videoUrl: c.httpsVideoUrl || null,
      credit: CREDIT_TN,
      sourceUrl: "https://smartway.tn.gov/traffic",
    });
  }
  return out;
}
