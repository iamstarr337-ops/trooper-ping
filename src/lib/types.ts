export type PingType = "moving" | "parked";

export interface Ping {
  id: string;
  lat: number;
  lng: number;
  type: PingType;
  note?: string;
  createdAt: string; // ISO
  flags: number;
  anonymous: boolean;
}

export interface CreatePingBody {
  lat: number;
  lng: number;
  type: PingType;
  note?: string;
  anonymous?: boolean;
}

export const SOFT_EXPIRE_MS = 45 * 60 * 1000; // 45 min
export const HARD_EXPIRE_MS = 2 * 60 * 60 * 1000; // 2 hr
export const DEFAULT_RADIUS_KM = 50;
export const MAX_NOTE_LENGTH = 140;
export const MAX_FLAGS_BEFORE_HIDE = 5;

/** Opacity 1 → ~0.25 over soft expire window; hidden after hard expire */
export function pingOpacity(createdAt: string, now = Date.now()): number {
  const age = now - new Date(createdAt).getTime();
  if (age >= HARD_EXPIRE_MS) return 0;
  if (age <= 0) return 1;
  if (age >= SOFT_EXPIRE_MS) {
    const t = (age - SOFT_EXPIRE_MS) / (HARD_EXPIRE_MS - SOFT_EXPIRE_MS);
    return Math.max(0.15, 0.35 * (1 - t));
  }
  return Math.max(0.35, 1 - (age / SOFT_EXPIRE_MS) * 0.65);
}

export function isHardExpired(createdAt: string, now = Date.now()): boolean {
  return now - new Date(createdAt).getTime() >= HARD_EXPIRE_MS;
}
