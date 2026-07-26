import "server-only";
import { getStripe } from "./stripe";
import { supabaseAdmin } from "./supabase";

/* The single source-of-truth reconciler.
 *
 * Every subscription webhook and the post-checkout /verify both call this with
 * a Stripe customer id. It re-reads the customer's current subscription from
 * Stripe and overwrites the DB row. Because we always write Stripe's *current*
 * truth (never a patch derived from one event), webhook ordering and duplicate
 * delivery stop mattering — the classic split-brain bug is gone.
 *
 * Access is a pure function of what this writes: status ∈ {active, trialing}
 * OR still inside current_period_end (grace for cancel-at-period-end and brief
 * webhook lag). See lib/supabase.ts subscriptionStatus. */

function intervalLabel(recurring: { interval?: string; interval_count?: number } | undefined): string {
  const unit = recurring?.interval;
  const count = recurring?.interval_count ?? 1;
  if (unit === "year") return "annual";
  if (unit === "month" && count === 3) return "quarterly";
  if (unit === "month" && count === 12) return "annual";
  return "monthly";
}

/** Statuses that should grant access. Everything else is denied. */
const ACCESS_STATUSES = new Set(["active", "trialing"]);

export interface SyncResult {
  email: string | null;
  status: string;
  premium: boolean;
}

/**
 * Reconcile one Stripe customer's subscription into Supabase.
 * Returns the resolved state, or null if nothing could be synced.
 */
export async function syncSubscription(customerId: string): Promise<SyncResult | null> {
  const db = supabaseAdmin();
  if (!db || !customerId) return null;
  const stripe = getStripe();

  // Customer (for the email we key rows on).
  let email: string | null = null;
  try {
    const cust = (await stripe.customers.retrieve(customerId)) as any;
    email = cust?.deleted ? null : cust?.email ?? null;
  } catch {
    /* fall through */
  }

  // The customer's most recent subscription — the current truth. We list rather
  // than trust the webhook's embedded object so ordering can't fool us.
  let sub: any = null;
  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
      expand: ["data.items.data.price"],
    });
    sub = subs.data[0] ?? null;
  } catch {
    /* fall through */
  }

  // No subscription at all → nothing premium. Reflect that if we have an email.
  if (!sub) {
    if (email) {
      await db.from("profiles").update({ plan: "free" }).eq("email", email);
    }
    return email ? { email, status: "none", premium: false } : null;
  }

  const item = sub.items?.data?.[0];
  // Basil (2025-03-31) moved current_period_end onto the item; older APIs keep
  // it on the subscription. Read whichever is present so access checks don't
  // silently break on a version bump.
  const periodEndUnix = item?.current_period_end ?? sub.current_period_end ?? null;
  const status: string = sub.status;
  const premium = ACCESS_STATUSES.has(status);
  const plan = premium ? "premium" : "free";
  const interval = intervalLabel(item?.price?.recurring);

  const row = {
    email: email ?? sub.customer_email ?? null,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status,
    // Reflect real entitlement: only active/trialing (etc.) is "premium"; a
    // canceled/unpaid row must not read as premium if anything keys off plan.
    plan,
    interval,
    current_period_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    price_id: item?.price?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  // Upsert on the subscription id (unique) so retries can't duplicate rows.
  await db.from("subscriptions").upsert(row, { onConflict: "stripe_subscription_id" });

  // Mirror the access decision onto the profile for fast local reads.
  if (row.email) {
    await db.from("profiles").update({ plan }).eq("email", row.email);
  }

  return { email: row.email, status, premium };
}
