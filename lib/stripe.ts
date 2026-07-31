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
      apiVersion: "2024-06-20" as any,
      typescript: true,
    });
  }
  return client;
}

/* Three plans (good/better/best). Amounts live in lib/pricing.ts; these are the
   matching Stripe Price IDs, env-gated.
   - weekly:    $7.99/wk   — "interview this week" impulse buy
   - monthly:   $18.97/mo  — standard
   - quarterly: $49.97/3mo — best value, covers a full search */
export const PRICES = {
  weekly: () => process.env.STRIPE_PRICE_ID_WEEKLY || process.env.STRIPE_PRICE_ID || "",
  monthly: () => process.env.STRIPE_PRICE_ID || "",
  quarterly: () => process.env.STRIPE_PRICE_ID_QUARTERLY || process.env.STRIPE_PRICE_ID || "",
};

export type PlanKey = keyof typeof PRICES;

export function isPlanKey(v: unknown): v is PlanKey {
  return v === "weekly" || v === "monthly" || v === "quarterly";
}

// Free trial on quarterly plan only. Set STRIPE_TRIAL_DAYS in env.
export const TRIAL_DAYS = Number(process.env.STRIPE_TRIAL_DAYS || "0");
