import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const REPO_DIR = "/workspace/trooper-ping";
const REPO_HTTPS = "https://github.com/iamstarr337-ops/trooper-ping.git";
const REPO_PAGE = "https://github.com/iamstarr337-ops/trooper-ping";

type ExecErr = Error & { stdout?: string; stderr?: string };

async function git(args: string[]) {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd: REPO_DIR,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_ASKPASS: "echo",
        GC_TERMINAL_PROMPT: "0",
      },
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (e) {
    const err = e as ExecErr;
    const detail = [err.stderr, err.stdout, err.message].filter(Boolean).join("\n");
    throw new Error(scrub(detail));
  }
}

function scrub(msg: string): string {
  return msg
    .replace(/x-access-token:[^@\s]+@/gi, "x-access-token:***@")
    .replace(/oauth2:[^@\s]+@/gi, "oauth2:***@")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***")
    .replace(/github_pat_[A-Za-z0-9_]+/g, "github_pat_***")
    .replace(/ghp_[A-Za-z0-9]+/g, "ghp_***")
    .slice(0, 500);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Send JSON { token }" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, message: "Send JSON { token }" }, { status: 400 });
  }
  const token =
    typeof (body as { token?: unknown }).token === "string"
      ? (body as { token: string }).token.trim()
      : "";
  if (!token || token.length < 20) {
    return NextResponse.json({ ok: false, message: "Invalid token" }, { status: 400 });
  }

  try {
    await git(["rev-parse", "--is-inside-work-tree"]);
    await git(["branch", "-M", "main"]).catch(() => undefined);

    await git(["add", "-A"]);
    await git(["reset", "HEAD", "--", ".env.local"]).catch(() => undefined);
    const status = await git(["status", "--porcelain"]);
    if (status.stdout) {
      await git([
        "-c",
        "user.email=bot@local",
        "-c",
        "user.name=TrooperPing Bot",
        "commit",
        "-m",
        "Add GitHub push setup page",
      ]).catch(() => undefined);
    }

    const remotes = await git(["remote"]).catch(() => ({ stdout: "", stderr: "" }));
    if (!remotes.stdout.split("\n").includes("origin")) {
      await git(["remote", "add", "origin", REPO_HTTPS]);
    } else {
      await git(["remote", "set-url", "origin", REPO_HTTPS]);
    }

    const { stdout: sha } = await git(["rev-parse", "HEAD"]);

    // Embed token in URL (most reliable for PATs). Encode special chars.
    const authUrl = `https://x-access-token:${encodeURIComponent(token)}@github.com/iamstarr337-ops/trooper-ping.git`;
    await git(["push", "-u", authUrl, "HEAD:main"]);
    await git(["remote", "set-url", "origin", REPO_HTTPS]);

    return NextResponse.json(
      { ok: true, url: REPO_PAGE, sha },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    const msg = scrub(err instanceof Error ? err.message : "Push failed");
    let hint = msg;
    if (/could not read Username|Authentication failed|401|403|denied|invalid|bad credentials/i.test(msg)) {
      hint =
        "GitHub rejected the token. Create a NEW fine-grained token: owner iamstarr337-ops, only repo trooper-ping, Contents = Read and write. Copy the full token and try again.";
    } else if (/non-fast-forward|rejected|fetch first/i.test(msg)) {
      hint =
        "GitHub repo isn't empty / has other commits. On github.com/iamstarr337-ops/trooper-ping delete any README commit, or reply and I’ll force-push.";
    }
    return NextResponse.json(
      { ok: false, message: hint, detail: msg },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
