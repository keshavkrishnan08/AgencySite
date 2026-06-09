import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase";

/* Rate limiter for the AI routes. The API key is server-only, so the real
   abuse vector is hammering the public routes to burn tokens.

   Two backends:
   - Supabase (preferred): an atomic SQL counter that works across serverless
     instances. This is what protects you in production on Vercel.
   - In-memory (fallback): used only when Supabase isn't configured, e.g. local
     dev. Correct for a single long-running process.

   Caps: per IP 30/min + 300/day (the un-spoofable ceiling), per account 60/min.
   Fails open on a backend error so a hiccup never takes the app down. */

const MIN = 60;
const DAY = 86_400;

function ipOf(req: Request): string {
  const xf = req.headers.get("x-forwarded-for") || "";
  return xf.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

function tooMany(): Response {
  return NextResponse.json(
    { error: "Too many requests. Please slow down for a moment.", rateLimited: true },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}

/* ---- in-memory fallback ---- */
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
function memoryLimit(ip: string, uid: string): boolean {
  const now = Date.now();
  if (store.size > 5000) store.forEach((v, k) => { if (now > v.reset) store.delete(k); });
  return (
    bump(`ip:min:${ip}`, 30, MIN * 1000, now) &&
    bump(`ip:day:${ip}`, 300, DAY * 1000, now) &&
    (!uid || bump(`u:min:${uid}`, 60, MIN * 1000, now))
  );
}

export async function rateLimit(req: Request): Promise<Response | null> {
  const ip = ipOf(req);
  const uid = (req.headers.get("x-user-id") || "").slice(0, 120);

  const db = supabaseAdmin();
  if (db) {
    try {
      const checks = [
        db.rpc("rl_hit", { p_key: `ip:min:${ip}`, p_limit: 30, p_window: MIN }),
        db.rpc("rl_hit", { p_key: `ip:day:${ip}`, p_limit: 300, p_window: DAY }),
      ];
      if (uid) checks.push(db.rpc("rl_hit", { p_key: `u:min:${uid}`, p_limit: 60, p_window: MIN }));
      const results = await Promise.all(checks);
      // data === false means the limit was exceeded; errors fail open.
      const blocked = results.some((r) => r.data === false);
      return blocked ? tooMany() : null;
    } catch {
      return null; // fail open
    }
  }

  return memoryLimit(ip, uid) ? null : tooMany();
}
