import { Camera, CREDIT_MS } from "./types";

const LOAD_URL = "https://www.mdottraffic.com/Default.aspx/LoadCameraData";
const BUBBLE_BASE =
  "https://www.mdottraffic.com/mapbubbles/camerasite.aspx?site=";

interface MsMarker {
  markerid?: string;
  tooltip?: string;
  lat?: number;
  lon?: number;
  framehtml?: string;
}

interface BubbleCacheEntry {
  snapshotUrl: string | null;
  videoUrl: string | null;
  fetchedAt: number;
}

const BUBBLE_TTL_MS = 10 * 60_000; // 10 min mid-range of 5–15
const bubbleCache = new Map<string, BubbleCacheEntry>();

function extractSiteId(marker: MsMarker): string | null {
  const mid = marker.markerid || "";
  const fromId = mid.match(/camsite_(\d+)/i);
  if (fromId) return fromId[1];
  const html = marker.framehtml || "";
  const fromHtml = html.match(/camerasite\.aspx\?site=(\d+)/i);
  if (fromHtml) return fromHtml[1];
  return null;
}

export async function fetchMississippiCameras(): Promise<Camera[]> {
  const res = await fetch(LOAD_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: "{}",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`MDOT cameras HTTP ${res.status}`);
  }
  const data = (await res.json()) as { d?: MsMarker[] };
  const markers = data.d;
  if (!Array.isArray(markers)) {
    throw new Error("MDOT cameras: unexpected payload");
  }

  const out: Camera[] = [];
  for (const m of markers) {
    const siteId = extractSiteId(m);
    if (!siteId) continue;
    const lat = Number(m.lat);
    const lng = Number(m.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const name = (m.tooltip || `Camera site ${siteId}`).trim();
    out.push({
      id: `ms-${siteId}`,
      state: "MS",
      name,
      lat,
      lng,
      snapshotUrl: null,
      videoUrl: null,
      credit: CREDIT_MS,
      sourceUrl: `${BUBBLE_BASE}${siteId}`,
    });
  }
  return out;
}

/** Derive Wowza HLS playlist from an MDOT thumbnail URL when possible. */
function hlsFromSnapshotUrl(snapshotUrl: string | null): string | null {
  if (!snapshotUrl) return null;
  let parsed: URL;
  try {
    parsed = new URL(snapshotUrl);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  if (!host.includes("streamingjxn") || !host.endsWith(".mdottraffic.com")) {
    return null;
  }
  const streamname = parsed.searchParams.get("streamname");
  if (!streamname) return null;
  const name = streamname.endsWith(".stream")
    ? streamname
    : `${streamname}.stream`;
  return `https://${parsed.hostname}/rtplive/${name}/playlist.m3u8`;
}

export function parseMsBubbleHtml(html: string): {
  snapshotUrl: string | null;
  videoUrl: string | null;
} {
  let snapshotUrl: string | null = null;
  const javaMatch = html.match(/javaimgsrc\s*=\s*"([^"]+)"/i);
  if (javaMatch?.[1]) {
    snapshotUrl = javaMatch[1];
  } else {
    const thumbMatch = html.match(
      /https?:\/\/[^"'\s>]+thumbnail\?[^"'\s>]+/i
    );
    if (thumbMatch) snapshotUrl = thumbMatch[0];
  }

  // Prefer direct HLS from thumbnail host/streamname; streamcam.aspx is a
  // maintenance interstitial and must not be used.
  const videoUrl = hlsFromSnapshotUrl(snapshotUrl);

  return { snapshotUrl, videoUrl };
}

export async function fetchMississippiBubble(
  siteId: string
): Promise<{ snapshotUrl: string | null; videoUrl: string | null }> {
  const id = String(siteId).replace(/[^\d]/g, "");
  if (!id) {
    throw new Error("invalid site id");
  }

  const cached = bubbleCache.get(id);
  if (cached && Date.now() - cached.fetchedAt < BUBBLE_TTL_MS) {
    return {
      snapshotUrl: cached.snapshotUrl,
      videoUrl: cached.videoUrl,
    };
  }

  const res = await fetch(`${BUBBLE_BASE}${id}`, {
    headers: {
      Accept: "text/html",
      "User-Agent": "TrooperPing/1.0 (traffic-camera preview)",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`MDOT bubble HTTP ${res.status}`);
  }
  const html = await res.text();
  const parsed = parseMsBubbleHtml(html);
  const videoUrl =
    parsed.videoUrl ?? `${BUBBLE_BASE}${id}`;
  const result = {
    snapshotUrl: parsed.snapshotUrl,
    videoUrl,
  };
  bubbleCache.set(id, { ...result, fetchedAt: Date.now() });
  return result;
}
