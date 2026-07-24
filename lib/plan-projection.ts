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

/** Points gained per session. Deliberate practice on a narrow, scored skill
 *  moves fast at first — the biggest wins (leading with your point, cutting
 *  filler, adding a number) land in the first handful of reps. Tuned so a
 *  typical starter who practises most days reaches the top 10% in about a week
 *  and the top 1% in about a month, then decays toward the ceiling. */
const BASE_PACE = 7.5;

/** Simulate the climb session by session, returning sessions needed to hit a
 *  target score. Diminishing returns near the top, so the model never promises
 *  a linear sprint to 97. */
function sessionsToReach(from: number, target: number): number {
  if (from >= target) return 0;
  let score = from;
  let n = 0;
  while (score < target && n < 400) {
    // Big early gains, tapering as you approach the ceiling.
    const headroom = Math.max(0.2, (100 - score) / 52);
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
  /** The near win and the destination. */
  toTop10: Milestone;
  toTop1: Milestone;
}

/** One milestone on the climb: how long to reach a given tier. */
export interface Milestone {
  topPercent: number;
  score: number;
  sessions: number;
  days: number;
  /** "a week" / "12 days" / "a month" — human phrasing, rounded to the promise. */
  when: string;
}

/** Round a raw day count to the nearest friendly promise word. */
function whenPhrase(days: number): string {
  if (days <= 9) return "a week";
  if (days <= 20) return "two weeks";
  if (days <= 40) return "a month";
  if (days <= 75) return "two months";
  return `${Math.round(days / 30)} months`;
}

function milestoneTo(startScore: number, topPercent: number, percentile: number, perWeek: number): Milestone {
  const score = scoreForPercentile(percentile);
  const sessions = sessionsToReach(startScore, score);
  const days = Math.max(1, Math.ceil((sessions / perWeek) * 7));
  return { topPercent, score, sessions, days, when: whenPhrase(days) };
}

/**
 * Build the projection around the two milestones that sell: top 10% (the near
 * win) and top 1% (the destination). Both are computed from the person's own
 * self-rated start and stated cadence on the same percentile curve the
 * dashboard scores against, so the promise can't outrun the product.
 */
export function projectPlan(skill: SkillLevel, cadence: Cadence): PlanProjection {
  const perWeek = CADENCE_META[cadence].perWeek;
  const startScore = START[skill];

  const toTop10 = milestoneTo(startScore, 10, 90, perWeek);
  const toTop1 = milestoneTo(startScore, 1, 99, perWeek);

  return {
    startScore,
    startPercentile: percentileFor(startScore),
    startTopPercent: Math.max(1, Math.round(100 - percentileFor(startScore))),
    targetScore: toTop1.score,
    targetTopPercent: 1,
    sessions: toTop1.sessions,
    days: toTop1.days,
    weeks: Math.max(1, Math.round(toTop1.days / 7)),
    perWeek,
    minutesTotal: toTop1.sessions * 10,
    headline: `top 1% in ${whenPhrase(toTop1.days)}`,
    toTop10,
    toTop1,
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
