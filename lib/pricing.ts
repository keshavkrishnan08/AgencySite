/* Single source of truth for what we charge.
 *
 * The landing page, the paywall, the upgrade screen and the checkout route all
 * read from here, so a price can never be right in one place and stale in
 * another. The Stripe Price IDs live in env (see lib/stripe.ts) and must match
 * these amounts — that pairing is the one thing to check before going live.
 *
 * Why monthly + 3 months instead of monthly + annual: a job search takes about
 * three months. A yearly plan asks someone to buy nine months they hope not to
 * need, which is a worse offer and a worse promise. Three months covers the
 * search, prepays it in one go, and is cheaper than two months bought alone.
 */

export type PlanKey = "monthly" | "quarterly";

export interface PlanCopy {
  key: PlanKey;
  /** Label on the toggle. */
  toggle: string;
  /** Total charged, formatted. */
  price: string;
  /** Amount in cents, for anyone who needs the number. */
  amountCents: number;
  /** Billing period in months. */
  months: number;
  /** Struck-through anchor price, or null when there's nothing to anchor to. */
  was: string | null;
  /** "billed monthly" / "billed once every 3 months". */
  cadence: string;
  /** "$6.66 a month" */
  perMonth: string;
  /** Percent saved vs paying monthly. 0 for the monthly plan. */
  savePct: number;
  /** Dollar amount saved vs paying monthly, formatted. */
  saveAmount: string | null;
  /** One-line reason this plan exists. */
  pitch: string;
}

const MONTHLY_CENTS = 999;
const QUARTERLY_CENTS = 1999;

const quarterlyFull = MONTHLY_CENTS * 3; // 2997
const quarterlySave = quarterlyFull - QUARTERLY_CENTS; // 998

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export const PLANS: Record<PlanKey, PlanCopy> = {
  monthly: {
    key: "monthly",
    toggle: "Monthly",
    price: usd(MONTHLY_CENTS),
    amountCents: MONTHLY_CENTS,
    months: 1,
    was: null,
    cadence: "billed monthly · cancel anytime",
    perMonth: "$9.99 a month",
    savePct: 0,
    saveAmount: null,
    pitch: "For a search you expect to be short.",
  },
  quarterly: {
    key: "quarterly",
    toggle: "3 months",
    price: usd(QUARTERLY_CENTS),
    amountCents: QUARTERLY_CENTS,
    months: 3,
    was: usd(quarterlyFull),
    cadence: "billed once every 3 months · cancel anytime",
    perMonth: "$6.66 a month",
    savePct: Math.round((quarterlySave / quarterlyFull) * 100), // 33
    saveAmount: usd(quarterlySave),
    pitch: "The whole search, for less than two months bought alone.",
  },
};

/** The number to lead with in marketing copy: the cheapest effective rate. */
export const FROM_PRICE = PLANS.quarterly.perMonth; // "$6.66 a month"
export const HEADLINE_PRICE = "$6.66/mo";
