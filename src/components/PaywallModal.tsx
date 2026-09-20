"use client";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onSubscribe: () => void;
  busy?: boolean;
  error?: string | null;
}

export default function PaywallModal({
  open,
  onClose,
  onSubscribe,
  busy,
  error,
}: PaywallModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md mx-3 mb-3 sm:mb-0 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-6 text-zinc-100">
        <div className="flex justify-center mb-4">
          <img
            src="/brand/logo.png"
            alt="TrooperPing"
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover ring-2 ring-amber-500/50 shadow-lg"
          />
        </div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              TrooperPing Pro
            </p>
            <h2 className="text-xl font-extrabold tracking-tight mt-1">
              Unlock live nationwide pings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xl leading-none px-2"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
          Free preview shows a blurred Austin demo only. Subscribe for the full
          live map, nearby reports, and the ability to ping &amp; flag.
        </p>

        <ul className="text-sm text-zinc-300 space-y-2 mb-5">
          <li className="flex gap-2">
            <span className="text-sky-400">✓</span> Full US map + nearby live feed
          </li>
          <li className="flex gap-2">
            <span className="text-sky-400">✓</span> Create &quot;I see a trooper&quot; reports
          </li>
          <li className="flex gap-2">
            <span className="text-sky-400">✓</span> Flag inaccurate pings
          </li>
          <li className="flex gap-2">
            <span className="text-sky-400">✓</span> Cancel anytime via billing portal
          </li>
        </ul>

        <div className="rounded-xl bg-zinc-800/80 border border-zinc-700 px-4 py-3 mb-4 flex items-baseline justify-between">
          <span className="text-zinc-400 text-sm">Monthly</span>
          <span className="text-2xl font-extrabold text-white">
            $5.99
            <span className="text-sm font-semibold text-zinc-400">/mo</span>
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-400 mb-3" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={onSubscribe}
          className="w-full rounded-xl bg-gradient-to-b from-sky-400 to-sky-600 text-zinc-950 font-extrabold text-base py-3.5 shadow-[0_8px_28px_rgba(14,165,233,0.4)] disabled:opacity-50 active:scale-[0.98] transition"
        >
          {busy ? "Redirecting…" : "Subscribe — $5.99/mo"}
        </button>

        <p className="text-[10px] text-zinc-500 mt-3 text-center leading-relaxed">
          Secure checkout via Stripe.
        </p>
      </div>
    </div>
  );
}
