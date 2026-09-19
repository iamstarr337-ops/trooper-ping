"use client";

import { FormEvent, useState } from "react";

export default function SetupGithubPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/setup-github", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("err");
        setMessage((data.message || "Push failed") + (data.detail && data.detail !== data.message ? (" — " + data.detail) : ""));
        return;
      }
      setStatus("ok");
      setMessage(`Pushed ${data.sha?.slice(0, 7) || "ok"}`);
      setUrl(data.url || "https://github.com/iamstarr337-ops/trooper-ping");
      setToken("");
    } catch {
      setStatus("err");
      setMessage("Network error");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-5 py-10 text-zinc-100">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl sm:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
          TrooperPing setup
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Push to GitHub</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Paste your fine-grained token for{" "}
          <strong className="text-zinc-200">iamstarr337-ops/trooper-ping</strong>{" "}
          (Contents: Read and write). Sent only to this server — not chat.
        </p>
        <form className="mt-7 space-y-5" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-zinc-200">
            GitHub token
            <input
              required
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="github_pat_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 font-mono text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-60"
          >
            {status === "loading" ? "Pushing…" : "Push to GitHub"}
          </button>
        </form>
        {message && (
          <p className={`mt-5 text-sm ${status === "ok" ? "text-emerald-400" : "text-rose-400"}`}>
            {message}
            {url ? (
              <>
                {" "}
                <a className="underline" href={url} target="_blank" rel="noreferrer">
                  Open repo
                </a>
              </>
            ) : null}
          </p>
        )}
      </section>
    </main>
  );
}
