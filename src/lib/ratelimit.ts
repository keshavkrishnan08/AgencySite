import { NextResponse } from 'next/server';

/**
 * Fixed-window rate limiter for the AI routes.
 *
 * These routes cost real money per call, so the limit is a spend control as
 * much as an abuse control. It is deliberately in-process: a single Vercel
 * region holds one map, and the worst case for a user who lands on a cold
 * instance is that they get one extra call — acceptable, whereas a Redis
 * round-trip on every generate is not. Swap `store` for Redis if the app ever
 * runs wide enough that per-instance windows stop biting.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

/** Keeps the map from growing without bound on a long-lived instance. */
function sweep(now: number) {
  if (store.size < 5_000) return;
  for (const [k, w] of store) if (w.resetAt <= now) store.delete(k);
}

export interface Limit {
  /** Calls allowed per window. */
  max: number;
  /** Window length in seconds. */
  windowSec: number;
}

export const LIMITS = {
  /** The full reading. Expensive, generated once per chart, ever. */
  reading: { max: 4, windowSec: 3_600 },
  /** Daily briefing. One per day in practice; the rest is retries. */
  brief: { max: 10, windowSec: 3_600 },
  /** Chat. The advertised product limit is 15/day. */
  chat: { max: 15, windowSec: 86_400 },
  /**
   * The free taste. One answer per day for an unpaid visitor.
   *
   * A hard lock on chat converts worse than letting them feel the thing work
   * once — the paywall lands after the value, not before it.
   */
  chatFree: { max: 1, windowSec: 86_400 },
  /** Weekly and monthly outlooks. */
  outlook: { max: 8, windowSec: 3_600 },
  /** Anonymous chart computation — cheap, but a spam vector. */
  chart: { max: 20, windowSec: 3_600 },
} as const satisfies Record<string, Limit>;

export interface RateResult {
  ok: boolean;
  remaining: number;
  limit: number;
  /** Unix ms when the window resets. */
  resetAt: number;
  retryAfterSec: number;
}

export function rateLimit(bucket: string, key: string, limit: Limit): RateResult {
  const now = Date.now();
  sweep(now);

  const id = `${bucket}:${key}`;
  const existing = store.get(id);
  const window: Window =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + limit.windowSec * 1_000 };

  window.count += 1;
  store.set(id, window);

  const ok = window.count <= limit.max;
  return {
    ok,
    limit: limit.max,
    remaining: Math.max(0, limit.max - window.count),
    resetAt: window.resetAt,
    retryAfterSec: Math.max(1, Math.ceil((window.resetAt - now) / 1_000)),
  };
}

/**
 * The caller's identity for limiting: the signed-in user where there is one,
 * otherwise the client IP. Falling back to a shared constant would let one
 * abuser lock out every anonymous visitor, so an unknown IP gets its own
 * bucket keyed by the header set it did send.
 */
export function callerKey(request: Request, userId: string | null): string {
  if (userId) return `u_${userId}`;

  const forwarded = request.headers.get('x-forwarded-for');
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('cf-connecting-ip')?.trim();

  return ip ? `ip_${ip}` : `ua_${request.headers.get('user-agent')?.slice(0, 80) ?? 'unknown'}`;
}

/** Standard headers so clients can back off without guessing. */
export function rateHeaders(r: RateResult): Record<string, string> {
  return {
    'RateLimit-Limit': String(r.limit),
    'RateLimit-Remaining': String(r.remaining),
    'RateLimit-Reset': String(Math.ceil((r.resetAt - Date.now()) / 1_000)),
  };
}

/** The 429 body. Always JSON — clients parse every response. */
export function tooMany(r: RateResult, message: string): NextResponse {
  return NextResponse.json(
    { error: message, retryAfter: r.retryAfterSec },
    {
      status: 429,
      headers: { ...rateHeaders(r), 'Retry-After': String(r.retryAfterSec) },
    },
  );
}

/**
 * Guard an AI route in one call. Returns a 429 response to return early, or
 * null to proceed.
 */
export function guard(
  request: Request,
  bucket: keyof typeof LIMITS,
  userId: string | null,
  message: string,
): NextResponse | null {
  const result = rateLimit(bucket, callerKey(request, userId), LIMITS[bucket]);
  return result.ok ? null : tooMany(result, message);
}
