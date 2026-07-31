/* Single source of truth for what we charge.
 *
 * The landing page, the paywall, the upgrade screen and the checkout route all
 * read from here, so a price can never be right in one place and stale in
 * another. The Stripe Price IDs live in env (see lib/stripe.ts) and must match
 * these amounts — that pairing is the one thing to check before going live.
 *
 * A good/better/best ladder:
 *   weekly     $7.99/wk    — "I have an interview this week." Impulse buy.
 *   monthly    $18.97/mo   — standard, covers most searches
 *   3 months   $49.97      — the default; a search runs about three months
 *
 * The cheapest effective rate (quarterly, ~$0.55/day) is what "from" copy leads with.
 */

export type PlanKey = "weekly" | "monthly" | "quarterly";

export interface PlanCopy {
  key: PlanKey;
  /** Label on the toggle. */
  toggle: string;
  /** Total charged, formatted. */
  price: string;
  /** Amount in cents, for anyone who needs the number. */
  amountCents: number;
  /** Billing period in months (0.25 for weekly). */
  months: number;
  /** Struck-through anchor price, or null when there's nothing to anchor to. */
  was: string | null;
  /** "billed weekly" / "billed monthly" / "billed once every 3 months". */
  cadence: string;
  /** "$7.99 a week" / "$18.97 a month" */
  perMonth: string;
  /** Percent saved vs paying weekly. 0 for the weekly plan. */
  savePct: number;
  /** Dollar amount saved vs paying weekly, formatted. */
  saveAmount: string | null;
  /** One-line reason this plan exists. */
  pitch: string;
  /** Badge shown on the card, or null. */
  badge: string | null;
}

const WEEKLY_CENTS = 799;
const MONTHLY_CENTS = 1897;
const QUARTERLY_CENTS = 4997;

// Compare everything to weekly rate for savings
const monthlyAtWeeklyRate = WEEKLY_CENTS * 4; // ~3196 per month at weekly rate
const monthlySave = monthlyAtWeeklyRate - MONTHLY_CENTS; // 1299
const quarterlyAtWeeklyRate = WEEKLY_CENTS * 13; // ~10387 for 3 months at weekly rate
const quarterlySave = quarterlyAtWeeklyRate - QUARTERLY_CENTS; // 5390

function usd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export const PLANS: Record<PlanKey, PlanCopy> = {
  weekly: {
    key: "weekly",
    toggle: "Weekly",
    price: usd(WEEKLY_CENTS),
    amountCents: WEEKLY_CENTS,
    months: 0.25,
    was: null,
    cadence: "billed weekly · cancel anytime",
    perMonth: "$7.99 a week",
    savePct: 0,
    saveAmount: null,
    pitch: "Interview this week? Start here.",
    badge: null,
  },
  monthly: {
    key: "monthly",
    toggle: "Monthly",
    price: usd(MONTHLY_CENTS),
    amountCents: MONTHLY_CENTS,
    months: 1,
    was: usd(monthlyAtWeeklyRate),
    cadence: "billed monthly · cancel anytime",
    perMonth: "$18.97 a month",
    savePct: Math.round((monthlySave / monthlyAtWeeklyRate) * 100),
    saveAmount: usd(monthlySave),
    pitch: "For an active job search.",
    badge: null,
  },
  quarterly: {
    key: "quarterly",
    toggle: "3 months",
    price: usd(QUARTERLY_CENTS),
    amountCents: QUARTERLY_CENTS,
    months: 3,
    was: usd(quarterlyAtWeeklyRate),
    cadence: "billed once every 3 months · cancel anytime",
    perMonth: "$16.66 a month",
    savePct: Math.round((quarterlySave / quarterlyAtWeeklyRate) * 100),
    saveAmount: usd(quarterlySave),
    pitch: "Covers the whole search. Best value.",
    badge: "Best value",
  },
};

/** Display order for the pricing cards. */
export const PLAN_ORDER: PlanKey[] = ["weekly", "monthly", "quarterly"];

/** The number to lead with in marketing copy: the cheapest effective rate. */
export const FROM_PRICE = PLANS.quarterly.perMonth;
export const HEADLINE_PRICE = `${PLANS.quarterly.perMonth.replace(" a month", "")}/mo`;

/** Price split for big-type display: ["49", "97"]. */
export function priceParts(plan: PlanKey): [dollars: string, cents: string] {
  const cents = PLANS[plan].amountCents;
  return [String(Math.floor(cents / 100)), String(cents % 100).padStart(2, "0")];
}

/** Per-day cost, in whole cents, for a plan. */
export function perDayCents(plan: PlanKey = "quarterly"): number {
  const p = PLANS[plan];
  return Math.round(p.amountCents / (p.months * 30));
}

/** "$0.55 a day" — the marketing subtext, from the cheapest plan. */
export const FROM_PER_DAY = `$${(perDayCents("quarterly") / 100).toFixed(2)} a day`;
