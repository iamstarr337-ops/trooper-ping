import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  MAX_FLAGS_BEFORE_HIDE,
  Ping,
  PingType,
  isHardExpired,
} from "./types";
import { distanceKm } from "./geo";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "pings.json");

/** Austin, TX metro — demo seed when store is empty */
const AUSTIN = { lat: 30.2672, lng: -97.7431 };

function seedPings(): Ping[] {
  const now = Date.now();
  const mk = (
    lat: number,
    lng: number,
    type: PingType,
    ageMin: number,
    note?: string
  ): Ping => ({
    id: uuidv4(),
    lat,
    lng,
    type,
    note,
    createdAt: new Date(now - ageMin * 60_000).toISOString(),
    flags: 0,
    anonymous: true,
  });

  return [
    mk(30.2849, -97.7341, "moving", 5, "I-35 N near campus"),
    mk(30.2505, -97.7472, "parked", 12, "Radar on South Congress"),
    mk(30.3072, -97.7559, "moving", 22),
    mk(30.229, -97.796, "parked", 35, "Posted MoPac"),
    mk(30.398, -97.727, "moving", 8, "183 corridor"),
    mk(30.265, -97.69, "parked", 40),
  ];
}

function ensureStore(): Ping[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const seeds = seedPings();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seeds, null, 2), "utf8");
    return seeds;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Ping[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeds = seedPings();
      fs.writeFileSync(DATA_FILE, JSON.stringify(seeds, null, 2), "utf8");
      return seeds;
    }
    return parsed;
  } catch {
    const seeds = seedPings();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seeds, null, 2), "utf8");
    return seeds;
  }
}

function writeAll(pings: Ping[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(pings, null, 2), "utf8");
}

function prune(pings: Ping[]): Ping[] {
  const now = Date.now();
  return pings.filter((p) => !isHardExpired(p.createdAt, now));
}

export function getNearbyPings(
  lat: number,
  lng: number,
  radiusKm: number
): Ping[] {
  let pings = ensureStore();
  const before = pings.length;
  pings = prune(pings);
  if (pings.length !== before) writeAll(pings);

  return pings
    .filter((p) => p.flags < MAX_FLAGS_BEFORE_HIDE)
    .filter((p) => distanceKm(lat, lng, p.lat, p.lng) <= radiusKm)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

/** Austin demo seeds only — for free / unsubscribed users */
export function getDemoPings(): Ping[] {
  const pings = ensureStore();
  // Prefer pings near Austin (demo corridor); if none, regenerate seeds in memory
  const nearAustin = pings
    .filter((p) => p.flags < MAX_FLAGS_BEFORE_HIDE)
    .filter((p) => distanceKm(AUSTIN.lat, AUSTIN.lng, p.lat, p.lng) <= 40)
    .filter((p) => !isHardExpired(p.createdAt))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  if (nearAustin.length > 0) return nearAustin;
  return seedPings();
}

export function createPing(input: {
  lat: number;
  lng: number;
  type: PingType;
  note?: string;
  anonymous?: boolean;
}): Ping {
  const pings = prune(ensureStore());
  const ping: Ping = {
    id: uuidv4(),
    lat: input.lat,
    lng: input.lng,
    type: input.type,
    note: input.note,
    createdAt: new Date().toISOString(),
    flags: 0,
    anonymous: input.anonymous !== false,
  };
  pings.push(ping);
  writeAll(pings);
  return ping;
}

export function flagPing(
  id: string
): { ok: boolean; flags?: number; error?: string } {
  const pings = prune(ensureStore());
  const idx = pings.findIndex((p) => p.id === id);
  if (idx === -1) return { ok: false, error: "not_found" };
  pings[idx] = { ...pings[idx], flags: pings[idx].flags + 1 };
  writeAll(pings);
  return { ok: true, flags: pings[idx].flags };
}

export function getSeedCenter() {
  return AUSTIN;
}
