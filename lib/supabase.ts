import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Server-side Supabase admin client (service role), used by the Stripe webhook
   to record subscriptions and by subscription lookups. Env-gated: when keys are
   absent, supabaseAdmin() returns null and callers fall back to the demo path.
   Run supabase/schema.sql first. */

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let client: SupabaseClient | null = null;
export function supabaseAdmin(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false } }
    );
  }
  return client;
}

export interface SubStatus {
  premium: boolean;
  status: string; // active | trialing | canceled | past_due | none ...
  until: string | null; // current_period_end ISO
  interval: string | null; // 'monthly' | 'quarterly' | 'annual' (legacy) | null
}

/* Authoritative access for an account, straight from the subscription row.
 *
 * Access ONLY while the subscription is genuinely `active` or `trialing`.
 *
 * Why not "still inside current_period_end"? Because Stripe advances the billing
 * period BEFORE it attempts the renewal charge — so the instant a renewal fails,
 * `current_period_end` jumps to the next, UNPAID period while status flips to
 * `past_due`/`canceled`. Trusting that date (the old logic) handed a non-paying
 * user a full free period. https://docs.stripe.com/billing/subscriptions/overview
 *
 * The two "keep access at end of period" cases are still handled correctly:
 *   - Voluntary cancel: Stripe keeps status = "active" (with cancel_at_period_end)
 *     until the paid period actually ends, then fires subscription.deleted. So
 *     the grace is covered by the `active` check — no date-trusting needed.
 *   - Trial: status = "trialing" → access.
 *
 * Involuntary (card fails): the paid period has ended, so access ends — with an
 * optional short dunning grace so a card that just needs a retry isn't cut mid-
 * dunning. DUNNING_GRACE_DAYS (default 3) bounds it; set 0 for a hard cut.
 * status "none" means no subscription row exists at all. */
export async function subscriptionStatus(email: string): Promise<SubStatus> {
  const db = supabaseAdmin();
  if (!db || !email) return { premium: false, status: "none", until: null, interval: null };
  const { data } = await db
    .from("subscriptions")
    .select("status, current_period_end, interval, updated_at")
    .eq("email", email)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { premium: false, status: "none", until: null, interval: null };

  const status: string = data.status;
  const active = status === "active" || status === "trialing";

  // Short dunning grace on past_due only (never on canceled/unpaid). Bounded by
  // the last event time, so it covers Stripe's retry window and cuts once Stripe
  // gives up (which flips status to canceled/unpaid and drops `active` anyway).
  const graceDays = Number(process.env.DUNNING_GRACE_DAYS ?? "3");
  const inGrace =
    status === "past_due" && graceDays > 0 && data.updated_at
      ? Date.now() - new Date(data.updated_at as string).getTime() < graceDays * 86400000
      : false;

  return {
    premium: active || inGrace,
    status,
    until: data.current_period_end ?? null,
    interval: data.interval ?? null,
  };
}

/** Back-compat: boolean access for an email. */
export async function isEmailPremium(email: string): Promise<boolean> {
  return (await subscriptionStatus(email)).premium;
}
