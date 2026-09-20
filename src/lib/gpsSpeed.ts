/** Helpers for phone GPS speed (mph). Not a calibrated vehicle speedometer. */

const MS_TO_MPH = 2.23693629;

export function metersBetween(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) *
      Math.cos(toRad(bLat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

export type SpeedSample = {
  lat: number;
  lng: number;
  t: number;
  accuracy: number;
};

export type SpeedState = {
  mph: number;
  /** Horizontal accuracy in meters from the last accepted fix */
  accuracyM: number | null;
  /** Prefer native GPS speed when the OS provides it */
  source: "native" | "derived" | "hold";
};

/**
 * Turn a geolocation reading into a smoothed mph estimate.
 * Prefers coords.speed when present + accurate; else distance/time with jitter rejection.
 */
export function estimateMph(opts: {
  lat: number;
  lng: number;
  t: number;
  speedMs: number | null;
  accuracy: number | null;
  prev: SpeedSample | null;
  smoothedMph: number | null;
}): { mph: number; sample: SpeedSample; source: SpeedState["source"] } {
  const accuracy = opts.accuracy == null || opts.accuracy <= 0 ? 40 : opts.accuracy;
  const sample: SpeedSample = {
    lat: opts.lat,
    lng: opts.lng,
    t: opts.t,
    accuracy,
  };

  // Reject terrible fixes for speed (still update position upstream)
  if (accuracy > 55) {
    return {
      mph: opts.smoothedMph ?? 0,
      sample: opts.prev ?? sample,
      source: "hold",
    };
  }

  let raw: number | null = null;
  let source: SpeedState["source"] = "derived";

  const nativeOk =
    opts.speedMs != null &&
    !Number.isNaN(opts.speedMs) &&
    opts.speedMs >= 0 &&
    accuracy <= 35;

  if (nativeOk) {
    raw = (opts.speedMs as number) * MS_TO_MPH;
    source = "native";
  } else if (opts.prev) {
    const dtSec = (opts.t - opts.prev.t) / 1000;
    if (dtSec >= 1 && dtSec <= 10) {
      const meters = metersBetween(
        opts.prev.lat,
        opts.prev.lng,
        opts.lat,
        opts.lng
      );
      // Movement must beat GPS noise (~0.4–0.6 × reported accuracy)
      const minMove = Math.max(3, Math.min(accuracy, 45) * 0.5);
      if (meters < minMove) {
        raw = 0;
        source = "derived";
      } else {
        raw = (meters / dtSec) * MS_TO_MPH;
        source = "derived";
      }
    }
  } else {
    raw = 0;
    source = "derived";
  }

  if (raw == null) {
    return {
      mph: opts.smoothedMph ?? 0,
      sample,
      source: "hold",
    };
  }

  // Physical-ish clamp: no teleport spikes
  raw = Math.max(0, Math.min(raw, 100));

  let smoothed = raw;
  if (opts.smoothedMph != null) {
    const dtSec = opts.prev ? Math.max(0.5, (opts.t - opts.prev.t) / 1000) : 1;
    // Limit how fast displayed speed can jump (~12 mph/s)
    const maxDelta = 12 * dtSec;
    const capped = Math.max(
      opts.smoothedMph - maxDelta,
      Math.min(opts.smoothedMph + maxDelta, raw)
    );
    // EMA — slightly heavier weight on native
    const alpha = source === "native" ? 0.45 : 0.28;
    smoothed = alpha * capped + (1 - alpha) * opts.smoothedMph;
  }

  // Snap near-zero to 0 so parked doesn't flicker 1–3 mph
  if (smoothed < 1.25) smoothed = 0;

  return { mph: smoothed, sample, source };
}
