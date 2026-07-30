import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseConfigured, subscriptionStatus } from "./supabase";

/* Server-side entitlement gate for the premium AI routes.
 *
 * The paywall in the UI is only a blur; the real protection has to be here, or
 * anyone can curl these endpoints and get the paid product for free. This verifies
 * a REAL Supabase session (the JWT, not the spoofable x-user-id header) and checks
 * the un-forgeable `subscriptions` table.
 *
 * Trust model:
 *  - Fails OPEN only when there's no backend to check against (local dev / before
 *    go-live) or on a genuine infra error talking to Supabase, so a transient
 *    outage never locks a paying customer out.
 *  - Fails CLOSED (402) on a missing/invalid token or a definitively-unpaid
 *    account. A bad token makes getUser() return an error object (handled), not
 *    throw, so attackers can't trip the fail-open path.
 *
 * Kill switch: set ENTITLEMENT_ENFORCED=0 to disable without a code change. */

/* In-memory trial rate-limit store (fallback when Supabase is unavailable). */
const trialStore = new Map<string, { count: number; reset: number }>();

function deny(kind: "auth" | "pay"): Response {
  return NextResponse.json(
    kind === "auth"
      ? { error: "Please sign in to use this.", needsAuth: true }
      : { error: "This is a premium feature. Subscribe to continue.", needsPay: true },
    { status: 402 }
  );
}

function trialExhausted(): Response {
  return NextResponse.json(
    { error: "Trial limit reached. Sign up to continue practicing.", needsAuth: true },
    { status: 402 }
  );
}

export async function requirePremium(req: Request): Promise<Response | null> {
  if (process.env.ENTITLEMENT_ENFORCED === "0") return null; // manual kill switch
  if (!supabaseConfigured()) return null; // no backend to verify against (dev)
  const admin = supabaseAdmin();
  if (!admin) return null;

  const auth = req.headers.get("authorization") || "";
  const token = auth.slice(0, 7).toLowerCase() === "bearer " ? auth.slice(7).trim() : "";

  // Trial mode: allow unauthenticated users to generate/score up to 3 questions.
  // Tight per-IP cap: 6 calls/day (1 generate + 3 scores + 2 follow-ups max).
  // Uses the same rl_hit RPC as the main rate limiter for atomic counting.
  if (!token && req.headers.get("x-trial") === "1") {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
      || req.headers.get("x-real-ip") || "unknown";
    const TRIAL_LIMIT = 6;
    const db = supabaseAdmin();
    if (db) {
      try {
        const { data } = await db.rpc("rl_hit", {
          p_key: `trial:day:${ip}`, p_limit: TRIAL_LIMIT, p_window: 86400,
        });
        if (data === false) return trialExhausted();
      } catch { /* fail open on DB error */ }
    } else {
      const now = Date.now();
      const key = `trial:${ip}`;
      const existing = trialStore.get(key);
      if (existing && now < existing.reset) {
        existing.count++;
        if (existing.count > TRIAL_LIMIT) return trialExhausted();
      } else {
        trialStore.set(key, { count: 1, reset: now + 86400000 });
      }
    }
    return null;
  }

  if (!token) return deny("auth");

  try {
    const { data, error } = await admin.auth.getUser(token);
    const email = data?.user?.email || "";
    if (error || !email) return deny("auth");
    const sub = await subscriptionStatus(email);
    return sub.premium ? null : deny("pay");
  } catch {
    // Genuine infra error verifying the token / reading the subscription: fail
    // open so we never lock out a paying customer over a transient hiccup.
    return null;
  }
}
