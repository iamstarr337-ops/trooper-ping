"use client";

import { FormEvent, useState } from "react";

export default function SetupStripePage() {
  const [secretKey, setSecretKey] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch(`/api/setup-stripe${window.location.search}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          STRIPE_SECRET_KEY: secretKey,
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: publishableKey,
        }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Setup could not be completed.");
      }

      setStatus("success");
      setMessage("Keys saved. Restart npm run start to load them.");
      setSecretKey("");
      setPublishableKey("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Setup could not be completed.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-5 py-10 text-zinc-100">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl sm:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
          TrooperPing setup
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Connect Stripe</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Paste your Stripe <strong className="text-zinc-200">Test mode</strong> API keys below.
          They are sent directly to this server and are not put in chat.
        </p>

        <form className="mt-7 space-y-5" onSubmit={submit}>
          <label className="block text-sm font-medium text-zinc-200">
            STRIPE_SECRET_KEY
            <input
              required
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              value={secretKey}
              onChange={(event) => setSecretKey(event.target.value)}
              placeholder="sk_test_..."
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 font-mono text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-200">
            NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
            <input
              required
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              value={publishableKey}
              onChange={(event) => setPublishableKey(event.target.value)}
              placeholder="pk_test_..."
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 font-mono text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>

          <button
            type="submit"
            disabled={status === "saving"}
            className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-60"
          >
            {status === "saving" ? "Saving…" : "Save Stripe test keys"}
          </button>
        </form>

        <p className="mt-5 text-xs leading-5 text-zinc-500">
          Use Test mode keys only. Never paste live keys here. This setup route is intended for
          one-time server configuration.
        </p>
        {message ? (
          <p
            role="status"
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              status === "success"
                ? "bg-emerald-950/60 text-emerald-300"
                : "bg-red-950/60 text-red-300"
            }`}
          >
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
