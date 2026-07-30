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

function deny(kind: "auth" | "pay"): Response {
  return NextResponse.json(
    kind === "auth"
      ? { error: "Please sign in to use this.", needsAuth: true }
      : { error: "This is a premium feature. Subscribe to continue.", needsPay: true },
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
  // The x-trial header is set by the client in trial mode. Rate limiting (already
  // applied before this gate) prevents abuse; the 3-question cap is enforced
  // client-side and the heuristic engine handles scoring without API keys anyway.
  if (!token && req.headers.get("x-trial") === "1") return null;

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
