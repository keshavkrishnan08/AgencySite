"use client";

import type { Dimension, ScoredAnswer, Session } from "./types";
import { aggregateDimensions, computeOverall, scoreAnswer } from "./scoring";
import { generateQuestions } from "./questions";
import { exampleAnswer } from "./examples";
import { getProfile, saveSession, setProfile } from "./store";

/* Generates a believable upward-trending practice history so a first-time
   visitor can experience the full dashboard. Clearly labeled as sample data. */

// Small seeded PRNG for smooth, repeatable curves.
function lcg(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const SAMPLE_ANSWERS = [
  "Um, I guess I handled it pretty well. There was this coworker situation and I sort of dealt with it. It worked out okay in the end.",
  "When two people on my team left at once, I mapped out what only I could do, cross-trained two colleagues, and set up a daily check-in. We kept our on-time rate above 90% through the transition.",
  "I led the rollout of a new scheduling system. I trained 15 staff over two weeks and we cut missed appointments by 22% in the first month.",
  "I'm someone who stays calm under pressure. In my last role I managed a team of twelve and rebuilt our intake process, which reduced turnaround time by about 20%.",
];

export function seedSampleData(): void {
  const profile = getProfile();
  if (!profile.targetRole) {
    setProfile({
      targetRole: "Office Manager",
      situation: "returning",
      interviewGap: "3-5yr",
    });
  }
  const role = getProfile().targetRole || "Office Manager";
  const rand = lcg(20260606);
  const N = 12;
  const now = Date.now();

  for (let i = 0; i < N; i++) {
    const t = i / (N - 1); // 0..1 progress
    const daysAgo = Math.round((1 - t) * 26 + (i % 2)); // spread over ~26 days
    const createdAt = new Date(now - daysAgo * 86400000 - i * 3600000).toISOString();
    const questions = generateQuestions("returning", role, i);

    // Target curve: from ~48 to ~83 with gentle noise.
    const base = 48 + t * 35;
    const answers: ScoredAnswer[] = questions.map((q, qi) => {
      const txt = SAMPLE_ANSWERS[(i + qi) % SAMPLE_ANSWERS.length];
      const scored = scoreAnswer({
        question: q.text,
        answer: txt,
        targetRole: role,
        category: q.category,
        questionNumber: q.number,
      });
      // Nudge toward the target curve so the trend reads clearly.
      const lift = (target: number, val: number) =>
        Math.max(15, Math.min(98, Math.round(val * 0.45 + target * 0.55 + (rand() * 10 - 5))));
      const dims: Record<Dimension, number> = {
        clarity: lift(base + 4, scored.scores.clarity),
        relevance: lift(base + 8, scored.scores.relevance),
        specificity: lift(base - 6, scored.scores.specificity),
        confidence: lift(base, scored.scores.confidence),
        conciseness: lift(base + 6, scored.scores.conciseness),
      };
      return {
        ...scored,
        scores: { ...dims, overall: computeOverall(dims) },
        exampleAnswer: exampleAnswer(q.text, role, q.category),
      };
    });

    const dimensions = aggregateDimensions(answers);
    const session: Session = {
      id: `sample_${i}`,
      createdAt,
      targetRole: role,
      situation: "returning",
      mode: "practice",
      overall: computeOverall(dimensions),
      dimensions,
      durationSeconds: 9 * 60 + Math.round(rand() * 360),
      answers,
    };
    saveSession(session);
  }
}

export function hasSampleData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return JSON.parse(window.localStorage.getItem("pp:sessions") || "[]").some(
      (s: Session) => s.id.startsWith("sample_")
    );
  } catch {
    return false;
  }
}
