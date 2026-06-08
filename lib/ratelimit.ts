import "server-only";
import { NextResponse } from "next/server";

/* In-memory rate limiter for the AI routes. The API key lives only on the
   server, so the real abuse vector is someone hammering the public routes to
   burn tokens. This caps requests per IP (the un-spoofable defense) and per
   account (nicer ceiling for signed-in users). For multi-instance production,
   swap the Map for Upstash/Redis; the interface stays the same. */

type Hit = { count: number; reset: number };
const store = new Map<string, Hit>();

function bump(key: string, limit: number, windowMs: number, now: number): boolean {
  const h = store.get(key);
  if (!h || now > h.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  h.count += 1;
  return h.count <= limit;
}

function ipOf(req: Request): string {
  const xf = req.headers.get("x-forwarded-for") || "";
  return xf.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

const MIN = 60_000;
const DAY = 86_400_000;

/** Returns a 429 Response if over any limit, otherwise null. */
export function rateLimit(req: Request): Response | null {
  const now = Date.now();

  // Opportunistic prune so the map can't grow unbounded.
  if (store.size > 5000) {
    store.forEach((v, k) => {
      if (now > v.reset) store.delete(k);
    });
  }

  const ip = ipOf(req);
  const uid = (req.headers.get("x-user-id") || "").slice(0, 120);

  const ok =
    bump(`ip:min:${ip}`, 30, MIN, now) &&
    bump(`ip:day:${ip}`, 300, DAY, now) &&
    (!uid || (bump(`u:min:${uid}`, 60, MIN, now) && bump(`u:day:${uid}`, 500, DAY, now)));

  if (ok) return null;
  return NextResponse.json(
    { error: "Too many requests. Please slow down for a moment.", rateLimited: true },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}
