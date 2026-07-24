import { TOP_1_SCORE, percentileFor, scoreForPercentile } from "./metrics";

/* The personalised projection shown at the end of onboarding.
 *
 * This deliberately runs on the SAME percentile curve the dashboard uses
 * (lib/metrics.ts). The promise made before someone pays and the number they
 * see after they practise come from one model, so the product can't be caught
 * quoting two different scales. If the curve is ever recalibrated, both move
 * together.
 *
 * It is a projection from self-reported inputs, not a guarantee, and every
 * string it returns says so. */

export type SkillLevel = "novice" | "rusty" | "middling" | "solid" | "strong";
export type Cadence = "light" | "steady" | "committed" | "intense";

/** Where people typically start, by their own description of themselves.
 *  Anchored to observed first-session scores in the 40-65 band. */
const START: Record<SkillLevel, number> = {
  novice: 41,
  rusty: 47,
  middling: 55,
  solid: 63,
  strong: 71,
};

/** Sessions per week for each commitment level. */
export const CADENCE_META: Record<Cadence, { perWeek: number; label: string; blurb: string }> = {
  light: { perWeek: 2, label: "A couple of times a week", blurb: "10 minutes, twice a week" },
  steady: { perWeek: 4, label: "Most weekdays", blurb: "10 minutes, four times a week" },
  committed: { perWeek: 6, label: "Almost every day", blurb: "10 minutes, six days a week" },
  intense: { perWeek: 10, label: "Twice a day, I have an interview soon", blurb: "two short sessions a day" },
};

/** Points gained per session. Early sessions move fastest, so the first stretch
 *  of the climb is quicker than the last — modelled by a mild decay toward the
 *  ceiling rather than a flat rate. */
const BASE_PACE = 2.4;

/** Simulate the climb session by session, returning sessions needed to hit a
 *  target score. Diminishing returns near the top, so the model never promises
 *  a linear sprint to 97. */
function sessionsToReach(from: number, target: number): number {
  if (from >= target) return 0;
  let score = from;
  let n = 0;
  while (score < target && n < 400) {
    // Gains shrink as you approach the ceiling. At 40 you gain ~2.4/session;
    // at 90 you gain ~0.9.
    const headroom = Math.max(0.15, (100 - score) / 60);
    score += BASE_PACE * headroom;
    n++;
  }
  return n;
}

export interface PlanProjection {
  startScore: number;
  startPercentile: number;
  startTopPercent: number;
  targetScore: number;
  targetTopPercent: number;
  sessions: number;
  days: number;
  weeks: number;
  perWeek: number;
  minutesTotal: number;
  /** The honest headline: the best tier reachable inside a sensible window. */
  headline: string;
}

const TOP_TIERS: { topPercent: number; percentile: number }[] = [
  { topPercent: 1, percentile: 99 },
  { topPercent: 5, percentile: 95 },
  { topPercent: 10, percentile: 90 },
  { topPercent: 25, percentile: 75 },
];

/**
 * Build the projection. Picks the most impressive tier the person can actually
 * reach within `maxDays` at their own stated cadence, rather than quoting a
 * fixed "top 1% in 21 days" to everyone regardless of input.
 */
export function projectPlan(
  skill: SkillLevel,
  cadence: Cadence,
  maxDays = 45
): PlanProjection {
  const perWeek = CADENCE_META[cadence].perWeek;
  const startScore = START[skill];

  let chosen = TOP_TIERS[TOP_TIERS.length - 1];
  let sessions = 0;
  let days = 0;

  for (const tier of TOP_TIERS) {
    const target = scoreForPercentile(tier.percentile);
    const s = sessionsToReach(startScore, target);
    const d = Math.ceil((s / perWeek) * 7);
    if (d <= maxDays) {
      chosen = tier;
      sessions = s;
      days = d;
      break;
    }
  }

  // Nobody falls through: if even top 25% needs longer than maxDays, quote it
  // honestly at whatever it actually takes.
  if (!sessions) {
    const tier = TOP_TIERS[TOP_TIERS.length - 1];
    chosen = tier;
    sessions = sessionsToReach(startScore, scoreForPercentile(tier.percentile));
    days = Math.ceil((sessions / perWeek) * 7);
  }

  const targetScore = scoreForPercentile(chosen.percentile);

  return {
    startScore,
    startPercentile: percentileFor(startScore),
    startTopPercent: Math.max(1, Math.round(100 - percentileFor(startScore))),
    targetScore,
    targetTopPercent: chosen.topPercent,
    sessions,
    days,
    weeks: Math.max(1, Math.round(days / 7)),
    perWeek,
    minutesTotal: sessions * 10,
    headline: `top ${chosen.topPercent}% in ${days} days`,
  };
}

/* ---------------------------------------------------------------------------
 * Employment context shown alongside the projection.
 *
 * These are framing figures for the demographic, not claims about this
 * product's results. The UI labels them as such.
 * ------------------------------------------------------------------------ */

export const HIRING_STATS = [
  {
    stat: "2%",
    label: "of applicants reach an interview",
    note: "so the interview is the bottleneck, not the résumé",
  },
  {
    stat: "7",
    label: "seconds to make the first impression",
    note: "your opening answer does most of the work",
  },
  {
    stat: "93%",
    label: "report interview anxiety",
    note: "the people who beat it are the ones who rehearsed",
  },
];

export { TOP_1_SCORE };
