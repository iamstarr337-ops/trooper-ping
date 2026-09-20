"use client";

interface SpeedometerProps {
  mph: number | null;
  active: boolean;
  /** Horizontal GPS accuracy in meters, when known */
  accuracyM?: number | null;
}

/** Glanceable GPS speed readout (mph). Not a certified speedometer. */
export default function Speedometer({
  mph,
  active,
  accuracyM,
}: SpeedometerProps) {
  const has = mph != null && Number.isFinite(mph);
  const display = !has
    ? "—"
    : mph! < 10
      ? mph!.toFixed(1)
      : String(Math.round(mph!));

  const quality =
    accuracyM == null
      ? null
      : accuracyM <= 12
        ? "good"
        : accuracyM <= 30
          ? "ok"
          : "weak";

  return (
    <div
      className="pointer-events-none flex flex-col items-center"
      aria-live="polite"
      aria-label={
        !has ? "Speed unavailable" : `Current speed ${display} miles per hour`
      }
    >
      <div
        className={`relative h-[88px] w-[88px] rounded-full border-2 shadow-xl flex flex-col items-center justify-center ${
          active
            ? "bg-zinc-950/95 border-amber-500/70 ring-2 ring-amber-500/20"
            : "bg-zinc-900/90 border-zinc-600"
        }`}
      >
        <span className="text-[26px] font-black tabular-nums leading-none tracking-tight text-zinc-50">
          {display}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 mt-0.5">
          mph
        </span>
      </div>
      <p className="mt-1 text-[9px] text-zinc-500 text-center max-w-[6.5rem] leading-tight">
        {quality === "good" && "GPS lock · eyes on road"}
        {quality === "ok" && "GPS ok · eyes on road"}
        {quality === "weak" && "Weak GPS · eyes on road"}
        {quality == null && "GPS · eyes on road"}
      </p>
    </div>
  );
}
