import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isActiveStatus, getByCustomerId, SubStatus } from "./subscribers";

export const SESSION_COOKIE = "tp_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  customerId: string;
  email?: string;
  status: SubStatus;
  exp: number;
}

function secret(): string {
  return process.env.SESSION_SECRET || "dev-insecure-session-secret-change-me";
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

export function signSession(payload: Omit<SessionPayload, "exp">): string {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  };
  const body = b64url(JSON.stringify(full));
  const sig = createHmac("sha256", secret()).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", secret()).update(body).digest();
  let got: Buffer;
  try {
    got = fromB64url(sig);
  } catch {
    return null;
  }
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) {
    return null;
  }
  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as SessionPayload;
    if (!payload.customerId || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}

export function setSessionCookie(
  res: NextResponse,
  payload: Omit<SessionPayload, "exp">
): void {
  res.cookies.set(SESSION_COOKIE, signSession(payload), sessionCookieOptions());
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}

/** Read session from request cookies; refresh status from subscribers store. */
export function getSessionFromCookies(): {
  session: SessionPayload | null;
  subscribed: boolean;
} {
  const jar = cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session) return { session: null, subscribed: false };

  const stored = getByCustomerId(session.customerId);
  const status = (stored?.status || session.status) as SubStatus;
  const subscribed = isActiveStatus(status);
  return {
    session: { ...session, status, email: stored?.email || session.email },
    subscribed,
  };
}

export function requireSubscribed(): {
  ok: true;
  customerId: string;
} | {
  ok: false;
  response: NextResponse;
} {
  const { session, subscribed } = getSessionFromCookies();
  if (!subscribed || !session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "subscription_required", message: "Subscribe to unlock live pings and reporting." },
        { status: 402 }
      ),
    };
  }
  return { ok: true, customerId: session.customerId };
}
