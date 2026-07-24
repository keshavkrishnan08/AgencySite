/* Single source of truth for what we charge.
 *
 * The landing page, the paywall, the upgrade screen and the checkout route all
 * read from here, so a price can never be right in one place and stale in
 * another. The Stripe Price IDs live in env (see lib/stripe.ts) and must match
 * these amounts — that pairing is the one thing to check before going live.
 *
 * A good/better/best ladder:
 *   monthly    $18.97/mo   — entry, for a search you expect to be short
 *   3 months   $49.97      — the default; a search runs about three months
 *   yearly     $119/yr     — best value anchor, prepaid and churn-immune
 *
 * The cheapest effective rate (yearly, ~33¢/day) is what "from" copy leads with.
 */

export type PlanKey = "monthly" | "quarterly" | "annual";

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
  /** "$16.66 a month" */
  perMonth: string;
  /** Percent saved vs paying monthly. 0 for the monthly plan. */
  savePct: number;
  /** Dollar amount saved vs paying monthly, formatted. */
  saveAmount: string | null;
  /** One-line reason this plan exists. */
  pitch: string;
  /** Badge shown on the card, or null. */
  badge: string | null;
}

const MONTHLY_CENTS = 1897;
const QUARTERLY_CENTS = 4997;
const ANNUAL_CENTS = 11900;

const quarterlyFull = MONTHLY_CENTS * 3; // 5691
const quarterlySave = quarterlyFull - QUARTERLY_CENTS; // 694
const annualFull = MONTHLY_CENTS * 12; // 22764
const annualSave = annualFull - ANNUAL_CENTS; // 10864

function usd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function perMonthLabel(cents: number, months: number): string {
  return `$${(cents / 100 / months).toFixed(2)} a month`;
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
    perMonth: perMonthLabel(MONTHLY_CENTS, 1),
    savePct: 0,
    saveAmount: null,
    pitch: "For a search you expect to be short.",
    badge: null,
  },
  quarterly: {
    key: "quarterly",
    toggle: "3 months",
    price: usd(QUARTERLY_CENTS),
    amountCents: QUARTERLY_CENTS,
    months: 3,
    was: usd(quarterlyFull),
    cadence: "billed once every 3 months · cancel anytime",
    perMonth: perMonthLabel(QUARTERLY_CENTS, 3),
    savePct: Math.round((quarterlySave / quarterlyFull) * 100), // 12
    saveAmount: usd(quarterlySave),
    pitch: "Covers the whole search. What most people pick.",
    badge: "Most popular",
  },
  annual: {
    key: "annual",
    toggle: "Yearly",
    price: usd(ANNUAL_CENTS),
    amountCents: ANNUAL_CENTS,
    months: 12,
    was: usd(annualFull),
    cadence: "billed once a year · cancel anytime",
    perMonth: perMonthLabel(ANNUAL_CENTS, 12),
    savePct: Math.round((annualSave / annualFull) * 100), // 48
    saveAmount: usd(annualSave),
    pitch: "A whole year at the lowest rate. Best value.",
    badge: "Best value",
  },
};

/** Display order for the pricing cards, cheapest-effective last so the eye
    lands on the anchor. */
export const PLAN_ORDER: PlanKey[] = ["monthly", "quarterly", "annual"];

/** The number to lead with in marketing copy: the cheapest effective rate. */
export const FROM_PRICE = PLANS.annual.perMonth;
export const HEADLINE_PRICE = `${PLANS.annual.perMonth.replace(" a month", "")}/mo`;

/** Price split for big-type display: ["49", "97"]. Keeps the pricing cards
    from hardcoding digits that then drift when the amount changes. */
export function priceParts(plan: PlanKey): [dollars: string, cents: string] {
  const cents = PLANS[plan].amountCents;
  return [String(Math.floor(cents / 100)), String(cents % 100).padStart(2, "0")];
}

/** Per-day cost, in whole cents, for a plan — the "33¢ a day" framing that
    makes the price feel like nothing. Derived, so it tracks the amount. */
export function perDayCents(plan: PlanKey = "annual"): number {
  const p = PLANS[plan];
  return Math.round(p.amountCents / (p.months * 30));
}

/** "$0.33 a day" — the marketing subtext, from the cheapest plan. Dollar format
    (not "33¢") for consistency with every other price on the page. */
export const FROM_PER_DAY = `$${(perDayCents("annual") / 100).toFixed(2)} a day`;
