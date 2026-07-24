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
 * search and prepays it in one go.
 *
 * NOTE on the current gap: at $18.97/mo vs $49.97/3mo the discount is only 12%
 * ($6.94). That is a thin incentive — most people will just take monthly. If the
 * 3-month plan is meant to be the default choice, it wants to land nearer $44
 * (≈23% off). Deliberate call either way, but the copy must not overstate it.
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

const MONTHLY_CENTS = 1897;
const QUARTERLY_CENTS = 4997;

const quarterlyFull = MONTHLY_CENTS * 3; // 5691
const quarterlySave = quarterlyFull - QUARTERLY_CENTS; // 694

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
    perMonth: "$18.97 a month",
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
    perMonth: "$16.66 a month",
    savePct: Math.round((quarterlySave / quarterlyFull) * 100), // 12
    saveAmount: usd(quarterlySave),
    pitch: "Covers the whole search, and cheaper than paying by the month.",
  },
};

/** The number to lead with in marketing copy: the cheapest effective rate. */
export const FROM_PRICE = PLANS.quarterly.perMonth; // "$16.66 a month"
export const HEADLINE_PRICE = "$16.66/mo";

/** Price split for big-type display: ["49", "97"]. Keeps the pricing cards
    from hardcoding digits that then drift when the amount changes. */
export function priceParts(plan: PlanKey): [dollars: string, cents: string] {
  const cents = PLANS[plan].amountCents;
  return [String(Math.floor(cents / 100)), String(cents % 100).padStart(2, "0")];
}
