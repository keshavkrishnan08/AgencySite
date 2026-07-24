import "server-only";
import Stripe from "stripe";

/* Real Stripe, key-gated. With keys set, the upgrade flow runs live Checkout
   and actually charges. Without them, the app falls back to a demo flow so the
   product stays runnable. See MONETIZATION.md for the go-live steps. */

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

let client: Stripe | null = null;
export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      // Pinned; cast keeps us compatible across SDK minor versions.
      apiVersion: "2024-06-20" as any,
      typescript: true,
    });
  }
  return client;
}

/* Two plans, both sized to a real job search.
   - monthly:   $18.97/mo, for people who expect to land fast.
   - quarterly: $49.97 every 3 months ($16.66/mo). Most searches run
     about three months, so this is the plan that actually covers the job you're
     interviewing for — and it prepays the whole search in one go. */
export const PRICES = {
  monthly: () => process.env.STRIPE_PRICE_ID || "",
  quarterly: () => process.env.STRIPE_PRICE_ID_QUARTERLY || process.env.STRIPE_PRICE_ID || "",
};

export type PlanKey = keyof typeof PRICES;

export function isPlanKey(v: unknown): v is PlanKey {
  return v === "monthly" || v === "quarterly";
}

// No free trial: charge immediately on subscribe. Set STRIPE_TRIAL_DAYS to
// re-enable one later. checkout/route.ts only adds a trial when this is > 0.
export const TRIAL_DAYS = Number(process.env.STRIPE_TRIAL_DAYS || "0");
