import { transitReport, type TransitHit } from './transits';
import type { Chart } from './reading';

/**
 * Best Day — "when should I do this?", answered with dates.
 *
 * Every other surface in the product describes the user. This one answers the
 * question they actually arrived with, and answers it with a date they can put
 * in a calendar. It is deterministic astronomy scored against the natal chart,
 * not model output, so the same question always returns the same answer and
 * costs nothing to run.
 */

export type Intent = 'launch' | 'ask' | 'hire' | 'pitch' | 'hard-conversation' | 'rest';

export const INTENTS: { id: Intent; label: string; blurb: string }[] = [
  { id: 'launch', label: 'Launch something', blurb: 'Ship, announce, go public.' },
  { id: 'ask', label: 'Make the ask', blurb: 'Price, raise, terms, the number.' },
  { id: 'pitch', label: 'Pitch or present', blurb: 'A room you need to convince.' },
  { id: 'hire', label: 'Hire or partner', blurb: 'Bring someone in for the long run.' },
  { id: 'hard-conversation', label: 'Have the hard conversation', blurb: 'The one you keep deferring.' },
  { id: 'rest', label: 'Step back', blurb: 'Recover without losing ground.' },
];

/**
 * Which natal points matter for each intent, and how a contact to them scores.
 *
 * Harmonious aspects help a visible move and hinder a confrontation; hard
 * aspects are the reverse. A hard conversation genuinely goes better under a
 * square — the friction is the point — which is why this is not one scale.
 */
const WEIGHTS: Record<Intent, { points: string[]; harmonious: number; hard: number }> = {
  launch:              { points: ['Sun', 'Midheaven', 'Jupiter', 'Mars'],     harmonious: 3, hard: -2 },
  ask:                 { points: ['Venus', 'Jupiter', 'Sun', 'Mercury'],      harmonious: 3, hard: -2 },
  pitch:               { points: ['Mercury', 'Midheaven', 'Sun', 'Venus'],    harmonious: 3, hard: -2 },
  hire:                { points: ['Saturn', 'Midheaven', 'Venus', 'Moon'],    harmonious: 3, hard: -1 },
  'hard-conversation': { points: ['Mars', 'Mercury', 'Pluto', 'Saturn'],      harmonious: 1, hard: 2 },
  rest:                { points: ['Moon', 'Saturn', 'Neptune'],               harmonious: 1, hard: 2 },
};

const HARMONIOUS = new Set(['Trine', 'Sextile']);
const HARD = new Set(['Square', 'Opposition']);

export interface DayScore {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  score: number;
  /** Plain-English reasons, strongest first. */
  reasons: string[];
  /** The single best contact that day, if any. */
  headline: string;
  moonSign: string;
  moonPhase: string;
  /** True when nothing in the sky argues either way. */
  quiet: boolean;
}

function scoreHit(hit: TransitHit, intent: Intent): number {
  const w = WEIGHTS[intent];
  if (!w.points.includes(hit.natal)) return 0;

  const base = HARMONIOUS.has(hit.type) ? w.harmonious : HARD.has(hit.type) ? w.hard : 1;
  // A tight orb is a stronger statement than a wide one, and an applying
  // contact is building rather than fading.
  const tightness = 1 + (3 - Math.min(hit.orb, 3)) / 3;
  return base * tightness * (hit.applying ? 1.15 : 0.85);
}

/**
 * Scores each day in the window. Pure astronomy — no model call, so this is
 * instant, free, and identical on every run for the same inputs.
 */
export function bestDays(
  chart: Chart,
  intent: Intent,
  days = 30,
  from = new Date(),
): DayScore[] {
  const out: DayScore[] = [];
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());

  for (let i = 0; i < days; i += 1) {
    const when = new Date(start + i * 86_400_000);
    const report = transitReport(chart, when);

    let score = 0;
    const scored: { hit: TransitHit; value: number }[] = [];
    for (const hit of report.hits) {
      const value = scoreHit(hit, intent);
      if (value !== 0) scored.push({ hit, value });
      score += value;
    }
    scored.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    // A void-of-course-ish quiet day is genuinely bad for launching and
    // genuinely good for resting; neutrality is information either way.
    if (intent === 'rest' && scored.length === 0) score += 2;
    if (intent === 'launch' && scored.length === 0) score -= 1;

    const reasons = scored.slice(0, 3).map(({ hit, value }) => {
      const helps = value > 0;
      const verb = hit.applying ? 'tightening into' : 'separating from';
      return `${hit.transiting} is ${verb} a ${hit.type.toLowerCase()} to your ${hit.natal} (orb ${hit.orb}°) — ${helps ? 'this supports the move' : 'this argues against it'}.`;
    });

    out.push({
      date: when.toISOString().slice(0, 10),
      score: Math.round(score * 10) / 10,
      reasons,
      headline: scored.length
        ? `${scored[0].hit.transiting} ${scored[0].hit.type.toLowerCase()} your ${scored[0].hit.natal}`
        : `Quiet sky · Moon in ${report.moonSign}`,
      moonSign: report.moonSign,
      moonPhase: report.moonPhase,
      quiet: scored.length === 0,
    });
  }

  return out;
}

/** The best days in the window, strongest first, ties broken by earliest. */
export function rankDays(scores: DayScore[], take = 3): DayScore[] {
  return [...scores]
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, take);
}

/** The day to actively avoid — useful, and it makes the ranking credible. */
export function worstDay(scores: DayScore[]): DayScore | null {
  const sorted = [...scores].sort((a, b) => a.score - b.score);
  const worst = sorted[0];
  return worst && worst.score < 0 ? worst : null;
}

/** A verdict for a single named day, which is the other way people ask this. */
export function verdictFor(
  chart: Chart,
  intent: Intent,
  date: Date,
): { score: number; verdict: 'go' | 'workable' | 'wait'; day: DayScore } {
  const [day] = bestDays(chart, intent, 1, date);
  const verdict = day.score >= 3 ? 'go' : day.score >= 0 ? 'workable' : 'wait';
  return { score: day.score, verdict, day };
}
