/**
 * Simple in-memory rate limiter (resets on process restart).
 * Good enough for MVP / single-instance deploys.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  const remaining = Math.max(0, limit - b.count);
  if (b.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((b.resetAt - now) / 1000),
    };
  }
  return { ok: true, remaining, retryAfterSec: 0 };
}

/** Periodic cleanup to avoid unbounded growth */
setInterval(() => {
  const now = Date.now();
  buckets.forEach((b, k) => {
    if (now >= b.resetAt) buckets.delete(k);
  });
}, 60_000).unref?.();
