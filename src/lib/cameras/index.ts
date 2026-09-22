import { distanceKm } from "@/lib/geo";
import { fetchMississippiCameras } from "./mississippi";
import { fetchTennesseeCameras } from "./tennessee";
import {
  Camera,
  CameraState,
  CAMERA_DISCLAIMER,
  CREDIT_MS,
  CREDIT_TN,
  CamerasResponse,
} from "./types";

const LIST_TTL_MS = 5 * 60_000;

interface ListCache {
  cameras: Camera[];
  fetchedAt: number;
}

const listCaches = new Map<string, ListCache>();

async function loadState(state: CameraState): Promise<Camera[]> {
  const cached = listCaches.get(state);
  if (cached && Date.now() - cached.fetchedAt < LIST_TTL_MS) {
    return cached.cameras;
  }
  const cameras =
    state === "MS"
      ? await fetchMississippiCameras()
      : await fetchTennesseeCameras();
  listCaches.set(state, { cameras, fetchedAt: Date.now() });
  return cameras;
}

export async function getCameras(opts: {
  states?: CameraState[];
  lat?: number;
  lng?: number;
  radiusKm?: number;
}): Promise<CamerasResponse> {
  const states = opts.states?.length
    ? opts.states
    : (["MS", "TN"] as CameraState[]);

  const results = await Promise.allSettled(states.map((s) => loadState(s)));
  let cameras: Camera[] = [];
  const counts: Partial<Record<CameraState, number>> = {};
  const credits: string[] = [];

  for (let i = 0; i < states.length; i++) {
    const state = states[i];
    const r = results[i];
    if (r.status === "fulfilled") {
      counts[state] = r.value.length;
      cameras = cameras.concat(r.value);
      if (state === "MS") credits.push(CREDIT_MS);
      if (state === "TN") credits.push(CREDIT_TN);
    } else {
      counts[state] = 0;
      console.error(`[cameras] ${state} fetch failed:`, r.reason);
    }
  }

  if (
    opts.lat != null &&
    opts.lng != null &&
    opts.radiusKm != null &&
    Number.isFinite(opts.lat) &&
    Number.isFinite(opts.lng) &&
    Number.isFinite(opts.radiusKm) &&
    opts.radiusKm > 0
  ) {
    cameras = cameras.filter(
      (c) =>
        distanceKm(opts.lat!, opts.lng!, c.lat, c.lng) <= opts.radiusKm!
    );
  }

  return {
    cameras,
    credits: Array.from(new Set(credits)),
    disclaimer: CAMERA_DISCLAIMER,
    counts,
  };
}

export {
  CAMERA_DISCLAIMER,
  CREDIT_MS,
  CREDIT_TN,
  MID_SOUTH_OVERVIEW,
  isFarFromCameraStates,
} from "./types";
export type { Camera, CameraState, CamerasResponse } from "./types";
export { fetchMississippiBubble } from "./mississippi";
