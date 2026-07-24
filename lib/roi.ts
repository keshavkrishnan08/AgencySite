import { PLANS } from "./pricing";

/* Return on the subscription, framed against what the job is actually worth.
 *
 * The honest observation behind this: the plan costs less than an hour of the
 * salary it's meant to help you win, and landing even a week sooner is worth
 * more than a year of it. That comparison is the real argument for the price,
 * and it's stronger than any discount. Every figure here is derived, so the
 * page can show its working rather than asserting a multiple.
 *
 * Salary medians are US full-time by field, rounded. They're a reference point
 * for the person's own estimate, and the UI says so. */

const MEDIAN_SALARY: Record<string, number> = {
  healthcare: 62_000,
  education: 55_000,
  finance: 78_000,
  tech: 105_000,
  operations: 62_000,
  sales: 68_000,
  retail: 42_000,
  hospitality: 40_000,
  manufacturing: 52_000,
  logistics: 52_000,
  legal: 72_000,
  creative: 60_000,
  support: 45_000,
  nonprofit: 55_000,
  trades: 58_000,
  other: 58_000,
};

const WORK_HOURS_PER_YEAR = 2080;

export interface Roi {
  salary: number;
  monthlyPay: number;
  hourlyPay: number;
  planPrice: number;
  planLabel: string;
  /** Per-day cost of the plan, e.g. 0.22 */
  perDay: number;
  /** Minutes of work at their rate to cover the whole plan. */
  minutesToPayBack: number;
  /** One week of pay — what landing sooner is worth. */
  oneWeekSooner: number;
  /** Multiple returned if it helps you land one week sooner. */
  weekReturn: number;
  /** Multiple against a single month of pay. */
  monthReturn: number;
  /** A modest negotiation win, and its multiple. */
  negotiationWin: number;
  negotiationReturn: number;
}

export function computeRoi(industry: string | undefined, plan: "monthly" | "quarterly" = "quarterly"): Roi {
  const salary = MEDIAN_SALARY[industry || "other"] ?? MEDIAN_SALARY.other;
  const p = PLANS[plan];
  const planPrice = p.amountCents / 100;
  const days = p.months * 30;

  const monthlyPay = salary / 12;
  const hourlyPay = salary / WORK_HOURS_PER_YEAR;
  const oneWeekSooner = salary / 52;
  const negotiationWin = Math.round((salary * 0.05) / 100) * 100; // a 5% ask

  return {
    salary,
    monthlyPay,
    hourlyPay,
    planPrice,
    planLabel: p.toggle,
    perDay: planPrice / days,
    minutesToPayBack: (planPrice / hourlyPay) * 60,
    oneWeekSooner,
    weekReturn: oneWeekSooner / planPrice,
    monthReturn: monthlyPay / planPrice,
    negotiationWin,
    negotiationReturn: negotiationWin / planPrice,
  };
}

export function usd(n: number, decimals = 0): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** "$0.22" — the number that makes the price feel like nothing. */
export function perDayLabel(plan: "monthly" | "quarterly"): string {
  const p = PLANS[plan];
  const perDay = p.amountCents / 100 / (p.months * 30);
  return `$${perDay.toFixed(2)}`;
}
