import type { Dimension, ScoredAnswer } from "./types";

/* Mid-session coaching beats.
 *
 * A "beat" is the short coaching moment shown between questions so a session
 * feels like being coached, not clicking Next. It's derived deterministically
 * from how the person is actually doing so far — running dimension averages,
 * whether they're climbing — so it's specific, instant, and free (no model
 * call mid-session). Plain text; the UI styles it Stripe-flat. */

export interface Beat {
  eyebrow: string;
  title: string;
  body: string;
  focus?: { dimension: Dimension; label: string; drill: string };
  progressPct: number; // 0..100 through the session
}

const DIM_LABEL: Record<Dimension, string> = {
  clarity: "Clarity",
  relevance: "Relevance",
  specificity: "Specificity",
  confidence: "Confidence",
  conciseness: "Conciseness",
};

/* Per-dimension micro-lesson: the tell, the fix, and a one-line drill. */
const COACHING: Record<Dimension, { fix: string; drill: string }> = {
  clarity: {
    fix: "Lead with your answer, then tell the story. If your first sentence doesn't answer the question, reorder it.",
    drill: "Start your next answer with the outcome, then back into how you got there.",
  },
  relevance: {
    fix: "Answer the exact question first. A great story for the wrong question still misses.",
    drill: "In one sentence, restate what they asked before you dive in.",
  },
  specificity: {
    fix: "Numbers make it real. Put one concrete figure into every answer: a percent, a count, a timeframe.",
    drill: "Add a single number to your next result. 'Faster' becomes 'two weeks faster'.",
  },
  confidence: {
    fix: "Cut the hedges. Swap 'I think' and 'kind of' for 'I led', 'I decided', 'I cut'.",
    drill: "Say what YOU did, plainly, with no softening words in the first line.",
  },
  conciseness: {
    fix: "Land it and stop. Once you've said the result, resist adding more. A clean stop reads as confidence.",
    drill: "End your next answer on the outcome. Don't tack on a summary.",
  },
};

function avg(ns: number[]): number {
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
}

/** Compose the coaching beat from the answers given so far. */
export function sessionBeat(answers: ScoredAnswer[], answered: number, total: number): Beat {
  const progressPct = Math.round((answered / Math.max(1, total)) * 100);
  const DIMS: Dimension[] = ["clarity", "relevance", "specificity", "confidence", "conciseness"];

  // Running average per dimension across everything answered so far.
  const byDim = DIMS.map((d) => ({
    d,
    v: avg(answers.map((a) => a.scores?.[d] ?? 0).filter((x) => x > 0)),
  })).filter((x) => x.v > 0);

  const overalls = answers.map((a) => a.scores?.overall ?? 0);
  const recentTrend = overalls.length >= 2 ? overalls[overalls.length - 1] - overalls[0] : 0;

  // Encouragement tuned to how it's going.
  const last = overalls[overalls.length - 1] ?? 0;
  let eyebrow = "Coach's note";
  let title: string;
  let body: string;
  if (last >= 80) {
    title = "You're above the bar.";
    body = "That last answer would land in a real room. Now we hunt for the last few points, keep the ones you've earned.";
  } else if (recentTrend >= 6) {
    title = "You're climbing.";
    body = "Your scores are moving up as you go. Whatever you changed between answers, keep doing it.";
  } else if (last > 0 && last < 55) {
    title = "This is what practice is for.";
    body = "Nobody nails these cold. We fix one thing at a time, and the number moves. Here's the one thing.";
  } else {
    title = "Halfway check-in.";
    body = "Solid work so far. Before the next one, here's the single change that'll move your score the most.";
  }

  const weakest = byDim.length ? byDim.reduce((m, x) => (x.v < m.v ? x : m)) : null;
  const focus = weakest
    ? { dimension: weakest.d, label: DIM_LABEL[weakest.d], drill: COACHING[weakest.d].drill }
    : undefined;
  if (weakest) body = `${body} ${COACHING[weakest.d].fix}`;

  return { eyebrow, title, body, focus, progressPct };
}

/** Should a coaching beat appear after this answer? Placed at ~1/3 and ~2/3 for
    longer sessions, once in the middle for short ones, never on the last. */
export function isBeatPoint(answered: number, total: number): boolean {
  if (total < 4 || answered >= total) return false;
  if (total <= 5) return answered === Math.floor(total / 2);
  return answered === Math.floor(total / 3) || answered === Math.floor((2 * total) / 3);
}
