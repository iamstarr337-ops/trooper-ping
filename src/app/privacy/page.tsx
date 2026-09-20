import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — TrooperPing",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-zinc-950 text-zinc-100 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link
          href="/"
          className="text-sky-400 text-sm hover:underline mb-6 inline-block"
        >
          ← Back to map
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/brand/logo.png"
            alt="TrooperPing"
            width={72}
            height={72}
            className="h-[72px] w-[72px] rounded-full object-cover ring-1 ring-amber-500/40"
          />
          <div>
            <h1 className="text-2xl font-extrabold mb-0.5">
              Trooper<span className="text-sky-400">Ping</span>
            </h1>
            <h2 className="text-lg text-zinc-400">Privacy Policy</h2>
          </div>
        </div>

        <div className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <p className="text-amber-200/90 text-xs border border-amber-500/30 rounded-lg px-3 py-2 bg-amber-500/5">
            MVP draft for store listings and transparency. This is not a
            substitute for counsel-reviewed legal text. Last updated: September
            20, 2026.
          </p>

          <p>
            TrooperPing is a <strong>crowdsourced</strong> map of user-submitted
            highway law-enforcement / state-trooper sightings for drivers in the
            United States. This page describes what information we process when
            you use the web app or a store wrapper that loads it.
          </p>

          <h3 className="text-zinc-100 font-semibold pt-2">
            Location
          </h3>
          <p>
            If you use locate-me, the map, or the in-app speedometer, we may
            process <strong>precise or approximate location</strong> (and
            derived GPS speed) from your device with your permission — to center
            the map, show nearby sightings, estimate mph, or attach a location
            to a report you submit. Speed is a GPS estimate only, not a
            certified speedometer. You can deny location permission in your
            browser or device settings; some features may not work without it.
          </p>

          <h3 className="text-zinc-100 font-semibold pt-2">
            Account &amp; session
          </h3>
          <p>
            We may store a session cookie or similar identifier so we can
            recognize you across visits. If you subscribe, we may associate an
            email address or Stripe customer ID with your subscription status so
            we can unlock paid features and manage billing.
          </p>

          <h3 className="text-zinc-100 font-semibold pt-2">Payments</h3>
          <p>
            Web subscriptions are processed by <strong>Stripe</strong>. We do
            not store full card numbers on our servers. Stripe&apos;s privacy
            policy applies to payment data they process. In Google Play / App
            Store apps, digital subscriptions may later use in-app purchases
            (Play Billing / StoreKit) instead of or in addition to Stripe.
          </p>

          <h3 className="text-zinc-100 font-semibold pt-2">Sighting reports</h3>
          <p>
            Reports you submit may be shown to other users on the map. Reports
            may be anonymous. We may rate-limit, fade, expire, flag, or remove
            pings (including after community flags). Soft fade is typically
            around 45 minutes; hard expire around 2 hours.
          </p>

          <h3 className="text-zinc-100 font-semibold pt-2">
            Analytics &amp; crash data
          </h3>
          <p>
            We do not currently run a third-party analytics or crash-reporting
            SDK on the core web app. If we add one later, we will update this
            policy.
          </p>

          <h3 className="text-zinc-100 font-semibold pt-2">
            How we use data
          </h3>
          <p>
            We use the information above to operate TrooperPing, provide the
            map and subscription features, prevent abuse, and improve
            reliability. <strong>We do not sell personal data.</strong>
          </p>

          <h3 className="text-zinc-100 font-semibold pt-2">Contact</h3>
          <p>
            Privacy questions:{" "}
            <a
              href="mailto:iamstarr337@gmail.com"
              className="text-sky-400 hover:underline"
            >
              iamstarr337@gmail.com
            </a>
            .
          </p>

          <p>
            See also our{" "}
            <Link href="/terms" className="text-sky-400 hover:underline">
              Terms &amp; Disclaimer
            </Link>
            .
          </p>

          <p className="text-zinc-500 text-xs pt-4">
            MVP build · Not affiliated with any law-enforcement agency.
          </p>
        </div>
      </div>
    </main>
  );
}
