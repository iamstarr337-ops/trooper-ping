import Link from "next/link";

export const metadata = {
  title: "Terms & Disclaimer — TrooperPing",
};

export default function TermsPage() {
  return (
    <main className="min-h-[100dvh] bg-zinc-950 text-zinc-100 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link
          href="/"
          className="text-sky-400 text-sm hover:underline mb-6 inline-block"
        >
          ← Back to map
        </Link>
        <h1 className="text-2xl font-extrabold mb-1">
          Trooper<span className="text-sky-400">Ping</span>
        </h1>
        <h2 className="text-lg text-zinc-400 mb-6">Terms & Disclaimer</h2>

        <div className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <p>
            TrooperPing is a <strong>crowdsourced</strong> map of user-submitted
            law-enforcement / state-trooper sightings. Content is{" "}
            <strong>user-generated</strong>, unverified, and may be wrong,
            outdated, or incomplete.
          </p>
          <p>
            <strong>Obey all laws.</strong> Do not use this app to evade law
            enforcement, speed, or commit any crime. Sightings are for
            situational awareness only — always drive carefully and legally.
          </p>
          <p>
            <strong>No unsafe driving.</strong> Never interact with the app
            while driving in a way that distracts you. Pull over safely before
            reporting or browsing. You are solely responsible for how you use
            the app.
          </p>
          <p>
            Reports may be anonymous. We may rate-limit, fade, expire, or remove
            pings (including after community flags). Soft fade ~45 minutes; hard
            expire ~2 hours.
          </p>
          <p>
            Provided <strong>as-is</strong> with no warranties. By using
            TrooperPing you agree to these terms and accept all risk. If you
            disagree, do not use the app.
          </p>
          <p className="text-zinc-500 text-xs pt-4">
            MVP build · Not affiliated with any law-enforcement agency.
          </p>
        </div>
      </div>
    </main>
  );
}
