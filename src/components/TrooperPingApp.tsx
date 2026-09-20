"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Ping, DEFAULT_RADIUS_KM } from "@/lib/types";
import ReportSheet from "./ReportSheet";
import PaywallModal from "./PaywallModal";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-zinc-950 text-zinc-400">
      Loading map…
    </div>
  ),
});

const AUSTIN = { lat: 30.2672, lng: -97.7431 };

export default function TrooperPingApp() {
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [center, setCenter] = useState(AUSTIN);
  const [flyTo, setFlyTo] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const [demo, setDemo] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [meLoaded, setMeLoaded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Finding nearby pings…");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      if (!res.ok) throw new Error("me failed");
      const data = await res.json();
      setSubscribed(Boolean(data.subscribed));
      setMeLoaded(true);
      return Boolean(data.subscribed);
    } catch {
      setSubscribed(false);
      setMeLoaded(true);
      return false;
    }
  }, []);

  const fetchPings = useCallback(
    async (lat: number, lng: number, isSub?: boolean) => {
      const sub = isSub ?? subscribed;
      try {
        const res = await fetch(
          `/api/pings?lat=${lat}&lng=${lng}&radiusKm=${DEFAULT_RADIUS_KM}${
            sub ? "" : "&demo=1"
          }`
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setPings(data.pings || []);
        const isDemo = Boolean(data.demo) || !sub;
        setDemo(isDemo);
        if (isDemo) {
          setStatus(
            `Demo · ${data.count ?? 0} Austin sample ping${
              (data.count ?? 0) === 1 ? "" : "s"
            }`
          );
        } else {
          setStatus(
            `${data.count ?? 0} ping${(data.count ?? 0) === 1 ? "" : "s"} nearby`
          );
        }
      } catch {
        setStatus("Could not load pings");
      }
    },
    [subscribed]
  );

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      showToast("Geolocation not supported");
      fetchPings(AUSTIN.lat, AUSTIN.lng);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(p);
        if (subscribed) {
          setCenter(p);
          setFlyTo({ ...p, zoom: 13 });
          fetchPings(p.lat, p.lng, true);
        } else {
          // Free users stay on Austin demo map
          setCenter(AUSTIN);
          setFlyTo({ ...AUSTIN, zoom: 12 });
          fetchPings(AUSTIN.lat, AUSTIN.lng, false);
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        showToast(
          subscribed
            ? "Location denied — showing Austin"
            : "Showing Austin demo — subscribe for live nearby"
        );
        setCenter(AUSTIN);
        setFlyTo({ ...AUSTIN, zoom: 12 });
        fetchPings(AUSTIN.lat, AUSTIN.lng);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30_000 }
    );
  }, [fetchPings, showToast, subscribed]);

  // Complete Checkout return + load me
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const checkout = params.get("checkout");
      const sessionId = params.get("session_id");

      if (checkout === "success" && sessionId) {
        try {
          const res = await fetch("/api/checkout/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          });
          const data = await res.json().catch(() => ({}));
          if (!cancelled) {
            if (res.ok && data.subscribed) {
              setSubscribed(true);
              showToast("Welcome to TrooperPing Pro!");
            } else {
              showToast(data.message || "Checkout pending — try refreshing");
            }
          }
        } catch {
          if (!cancelled) showToast("Could not finalize checkout");
        }
        window.history.replaceState({}, "", "/");
      } else if (checkout === "cancel") {
        showToast("Checkout canceled");
        window.history.replaceState({}, "", "/");
      }

      const isSub = await refreshMe();
      if (cancelled) return;
      if (isSub) {
        // locate will run below via effect dependency — kick off Austin first then locate
        setCenter(AUSTIN);
        await fetchPings(AUSTIN.lat, AUSTIN.lng, true);
      } else {
        setCenter(AUSTIN);
        setFlyTo({ ...AUSTIN, zoom: 12 });
        await fetchPings(AUSTIN.lat, AUSTIN.lng, false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Locate after we know subscription status
  useEffect(() => {
    if (!meLoaded) return;
    locate();
    const id = setInterval(() => {
      if (subscribed) {
        const c = userPos || center;
        fetchPings(c.lat, c.lng, true);
      } else {
        fetchPings(AUSTIN.lat, AUSTIN.lng, false);
      }
    }, 45_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meLoaded, subscribed]);

  async function startCheckout() {
    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCheckoutError(
          data.message ||
            data.error ||
            "Checkout unavailable. Configure Stripe keys."
        );
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError("No checkout URL returned");
    } catch {
      setCheckoutError("Network error starting checkout");
    } finally {
      setCheckoutBusy(false);
    }
  }

  async function openBillingPortal() {
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Billing portal unavailable");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      showToast("Could not open billing portal");
    }
  }

  async function handleReport(data: {
    type: "moving" | "parked";
    note?: string;
    anonymous: boolean;
  }) {
    if (!subscribed) {
      setPaywallOpen(true);
      throw new Error("Subscribe to report live pings");
    }
    const pos = userPos || center;
    const res = await fetch("/api/pings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: pos.lat,
        lng: pos.lng,
        type: data.type,
        note: data.note,
        anonymous: data.anonymous,
      }),
    });
    if (res.status === 402) {
      setPaywallOpen(true);
      throw new Error("Subscribe to unlock reporting");
    }
    if (res.status === 429) {
      const j = await res.json().catch(() => ({}));
      throw new Error(
        `Slow down — try again in ${j.retryAfterSec ?? 60}s`
      );
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "Report failed");
    }
    showToast("Ping sent — thanks!");
    await fetchPings(pos.lat, pos.lng, true);
  }

  async function handleFlag(id: string) {
    if (!subscribed) {
      setPaywallOpen(true);
      return;
    }
    try {
      const res = await fetch(`/api/pings/${id}/flag`, { method: "POST" });
      if (res.status === 402) {
        setPaywallOpen(true);
        return;
      }
      if (res.ok) {
        showToast("Flagged — thanks for keeping it honest");
        const c = userPos || center;
        fetchPings(c.lat, c.lng, true);
      } else {
        showToast("Could not flag");
      }
    } catch {
      showToast("Could not flag");
    }
  }

  function openReport() {
    if (!subscribed) {
      setPaywallOpen(true);
      return;
    }
    if (!userPos) {
      showToast("Enable location to report accurately");
      locate();
      return;
    }
    setReportOpen(true);
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="absolute top-0 inset-x-0 z-20 pointer-events-none">
        <div className="pointer-events-auto mx-3 mt-3 flex items-center justify-between rounded-2xl bg-zinc-900/90 border border-zinc-700/80 backdrop-blur-md px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl shrink-0" aria-hidden>
              🚓
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold tracking-tight leading-none">
                Trooper<span className="text-sky-400">Ping</span>
                {subscribed && (
                  <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-300 align-middle">
                    Pro
                  </span>
                )}
              </h1>
              <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                {status}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {subscribed ? (
              <button
                type="button"
                onClick={openBillingPortal}
                className="text-[11px] text-zinc-300 hover:text-sky-300 border border-zinc-600 rounded-lg px-2 py-1"
              >
                Manage billing
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPaywallOpen(true)}
                className="text-[11px] font-bold text-zinc-950 bg-sky-400 hover:bg-sky-300 rounded-lg px-2.5 py-1"
              >
                Subscribe
              </button>
            )}
            <Link
              href="/privacy"
              className="text-[11px] text-zinc-400 hover:text-sky-300 underline-offset-2 hover:underline"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-[11px] text-zinc-400 hover:text-sky-300 underline-offset-2 hover:underline"
            >
              Terms
            </Link>
          </div>
        </div>
      </header>

      {/* Pricing banner for free users */}
      {!subscribed && meLoaded && (
        <div className="absolute top-[4.75rem] inset-x-0 z-20 px-3 pointer-events-none">
          <button
            type="button"
            onClick={() => setPaywallOpen(true)}
            className="pointer-events-auto w-full max-w-md mx-auto flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-sky-600/95 to-indigo-600/95 border border-sky-400/40 px-3.5 py-2.5 shadow-lg text-left"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-white">
                Demo map · Austin only
              </p>
              <p className="text-[10px] text-sky-100/90 truncate">
                Subscribe for live nationwide feed &amp; reporting
              </p>
            </div>
            <span className="shrink-0 text-xs font-extrabold bg-white text-sky-700 rounded-lg px-2.5 py-1.5">
              $5.99/mo
            </span>
          </button>
        </div>
      )}

      {/* Map */}
      <div className="absolute inset-0">
        <MapView
          center={center}
          userPos={subscribed ? userPos : null}
          pings={pings}
          onFlag={handleFlag}
          flyTo={flyTo}
          demo={demo || !subscribed}
        />
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 z-20 pb-[max(1rem,env(safe-area-inset-bottom))] px-4 pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-center gap-3 max-w-md mx-auto">
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="flex-1 rounded-2xl bg-zinc-900/95 border border-zinc-600 py-3.5 text-sm font-semibold shadow-lg hover:bg-zinc-800 disabled:opacity-60"
            >
              {locating ? "Locating…" : "📍 Locate me"}
            </button>
          </div>
          <button
            type="button"
            onClick={openReport}
            className="w-full rounded-2xl bg-gradient-to-b from-sky-400 to-sky-600 text-zinc-950 font-extrabold text-lg py-4 shadow-[0_8px_32px_rgba(14,165,233,0.45)] active:scale-[0.98] transition border border-sky-300/40"
          >
            {subscribed ? "I see a trooper" : "Subscribe to report — $5.99/mo"}
          </button>
          <p className="text-[10px] text-zinc-500 text-center px-2">
            Crowdsourced · fades after ~45m · obey the law · no unsafe driving
          </p>
        </div>
      </div>

      {toast && (
        <div className="absolute top-24 inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
          <div className="rounded-full bg-zinc-100 text-zinc-900 text-sm font-medium px-4 py-2 shadow-xl">
            {toast}
          </div>
        </div>
      )}

      <ReportSheet
        open={reportOpen}
        lat={(userPos || center).lat}
        lng={(userPos || center).lng}
        onClose={() => setReportOpen(false)}
        onSubmit={handleReport}
      />

      <PaywallModal
        open={paywallOpen}
        onClose={() => {
          setPaywallOpen(false);
          setCheckoutError(null);
        }}
        onSubscribe={startCheckout}
        busy={checkoutBusy}
        error={checkoutError}
      />
    </div>
  );
}
