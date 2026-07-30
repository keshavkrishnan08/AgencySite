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
 * Free first session: authenticated users without a subscription get 6 API calls
 * (1 generate-questions + 3 score-answer + 2 follow-ups) so they can complete
 * one practice session before the paywall kicks in. Rate-limited per-email per-day.
 *
 * Kill switch: set ENTITLEMENT_ENFORCED=0 to disable without a code change. */

function deny(kind: "auth" | "pay"): Response {
  return NextResponse.json(
    kind === "auth"
      ? { error: "Please sign in to use this.", needsAuth: true }
      : { error: "Start your free trial to continue practicing.", needsPay: true },
    { status: 402 }
  );
}

/* In-memory fallback for the free-session rate limit (dev only). */
const freeSessionStore = new Map<string, { count: number; reset: number }>();

export async function requirePremium(req: Request): Promise<Response | null> {
  if (process.env.ENTITLEMENT_ENFORCED === "0") return null; // manual kill switch
  if (!supabaseConfigured()) return null; // no backend to verify against (dev)
  const admin = supabaseAdmin();
  if (!admin) return null;

  const auth = req.headers.get("authorization") || "";
  const token = auth.slice(0, 7).toLowerCase() === "bearer " ? auth.slice(7).trim() : "";
  if (!token) return deny("auth");

  try {
    const { data, error } = await admin.auth.getUser(token);
    const email = data?.user?.email || "";
    if (error || !email) return deny("auth");
    const sub = await subscriptionStatus(email);
    if (sub.premium) return null; // paying user — allow everything

    // Non-premium authenticated user: allow a limited free session (6 API calls/day)
    // so they can experience the product before paying.
    const FREE_SESSION_LIMIT = 6;
    const limitKey = `free:day:${email}`;
    try {
      const { data: allowed } = await admin.rpc("rl_hit", {
        p_key: limitKey, p_limit: FREE_SESSION_LIMIT, p_window: 86400,
      });
      if (allowed === false) return deny("pay");
    } catch {
      // Fail open on rate-limit error — never block a potential customer
      // over a transient DB issue. The 6-call cap is a soft guard anyway.
    }
    return null;
  } catch {
    return null;
  }
}
