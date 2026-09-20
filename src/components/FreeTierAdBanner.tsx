"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface FreeTierAdBannerProps {
  /** When true, render nothing (Pro / subscribed). */
  hidden?: boolean;
  onUpgrade?: () => void;
}

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() || "";
const SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID?.trim() || "";
const adsConfigured = Boolean(CLIENT && SLOT && CLIENT.startsWith("ca-pub-"));

/**
 * Banner for free-tier users only. Loads Google AdSense when publisher IDs
 * are configured; otherwise shows a reserved sponsored slot (Pro removes ads).
 */
export default function FreeTierAdBanner({
  hidden,
  onUpgrade,
}: FreeTierAdBannerProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (hidden || !adsConfigured || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* AdSense may block until the site is approved */
    }
  }, [hidden]);

  if (hidden) return null;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-zinc-700/80 bg-zinc-900/95 shadow-lg">
      <div className="flex items-center justify-between px-2.5 py-1 border-b border-zinc-800">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
          Sponsored
        </span>
        {onUpgrade && (
          <button
            type="button"
            onClick={onUpgrade}
            className="text-[9px] font-semibold text-sky-400 hover:text-sky-300"
          >
            Remove ads · Pro
          </button>
        )}
      </div>

      {adsConfigured ? (
        <>
          <Script
            id="adsense-loader"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
          <ins
            className="adsbygoogle"
            style={{ display: "block", minHeight: 60 }}
            data-ad-client={CLIENT}
            data-ad-slot={SLOT}
            data-ad-format="horizontal"
            data-full-width-responsive="true"
          />
        </>
      ) : (
        <button
          type="button"
          onClick={onUpgrade}
          className="w-full px-3 py-3 text-left hover:bg-zinc-800/60 transition"
        >
          <p className="text-xs font-semibold text-zinc-200">
            Free tier includes ads
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
            Ad network connects after AdSense/AdMob setup. Tap for Pro — no ads
            + live nationwide map.
          </p>
        </button>
      )}
    </div>
  );
}
