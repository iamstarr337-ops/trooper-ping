export type CameraState = "MS" | "TN";

export interface Camera {
  id: string;
  state: CameraState;
  name: string;
  lat: number;
  lng: number;
  snapshotUrl?: string | null;
  videoUrl?: string | null;
  credit: string;
  sourceUrl?: string;
}

export interface CamerasResponse {
  cameras: Camera[];
  credits: string[];
  disclaimer: string;
  counts: Partial<Record<CameraState, number>>;
}

export const CAMERA_DISCLAIMER =
  "As-is DOT feed; not affiliated with MDOT, TDOT, or any state agency.";

export const CREDIT_MS = "Mississippi DOT (MDOT Traffic)";
export const CREDIT_TN = "Tennessee DOT (TDOT SmartWay)";

export const MID_SOUTH_OVERVIEW = {
  lat: 33.5,
  lng: -89.5,
  zoom: 7,
} as const;

/** Rough center of MS+TN — used to decide if user is "far" from camera coverage */
export function isFarFromCameraStates(lat: number, lng: number): boolean {
  // Bounding box roughly covering MS+TN with margin
  return lat < 29 || lat > 38 || lng < -95 || lng > -80;
}
