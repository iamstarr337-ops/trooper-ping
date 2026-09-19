"use client";

import { useState } from "react";
import { PingType, MAX_NOTE_LENGTH } from "@/lib/types";

interface ReportSheetProps {
  open: boolean;
  lat: number;
  lng: number;
  onClose: () => void;
  onSubmit: (data: {
    type: PingType;
    note?: string;
    anonymous: boolean;
  }) => Promise<void>;
}

export default function ReportSheet({
  open,
  lat,
  lng,
  onClose,
  onSubmit,
}: ReportSheetProps) {
  const [type, setType] = useState<PingType>("moving");
  const [note, setNote] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        type,
        note: note.trim() || undefined,
        anonymous,
      });
      setNote("");
      setType("moving");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md mx-3 mb-3 sm:mb-0 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-5 text-zinc-100"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight">Report a trooper</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xl leading-none px-2"
          >
            ×
          </button>
        </div>

        <p className="text-xs text-zinc-500 mb-4 font-mono">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setType("moving")}
            className={`rounded-xl py-3 px-2 text-sm font-semibold border transition ${
              type === "moving"
                ? "bg-orange-500/20 border-orange-400 text-orange-200"
                : "bg-zinc-800 border-zinc-700 text-zinc-400"
            }`}
          >
            🚗 Moving
          </button>
          <button
            type="button"
            onClick={() => setType("parked")}
            className={`rounded-xl py-3 px-2 text-sm font-semibold border transition ${
              type === "parked"
                ? "bg-red-500/20 border-red-400 text-red-200"
                : "bg-zinc-800 border-zinc-700 text-zinc-400"
            }`}
          >
            📍 Parked / Posted
          </button>
        </div>

        <label className="block text-xs text-zinc-400 mb-1">
          Note (optional)
        </label>
        <input
          type="text"
          value={note}
          maxLength={MAX_NOTE_LENGTH}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. I-35 N exit ramp"
          className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        <label className="flex items-center gap-2 text-sm text-zinc-300 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="rounded accent-sky-500"
          />
          Report anonymously
        </label>

        {error && (
          <p className="text-sm text-red-400 mb-3" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-zinc-950 font-bold py-3.5 text-base transition"
        >
          {busy ? "Sending…" : "Ping it"}
        </button>

        <p className="text-[10px] text-zinc-500 mt-3 text-center leading-relaxed">
          Only report what you see. Obey traffic laws. Never use while driving
          unsafely.
        </p>
      </form>
    </div>
  );
}
