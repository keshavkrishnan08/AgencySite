"use client";

/* ===========================================================================
 * The mega context layer — builder (client side).
 *
 * Pulls together every signal the product holds about a person — profile,
 * preferences, the full derived metrics engine, streaks, the job-family
 * breakdown, and the artifacts they've generated (predicted questions, saved
 * gap story) — into ONE object. That object is the shared "operating system"
 * every AI surface reads: scoring, follow-ups, and the coach chat all speak to
 * the same person with the same memory.
 *
 * buildContext() reads local state (which is itself synced to Supabase), so the
 * context is always current and always free-flowing from the same source the
 * dashboard draws. encodeContext() then compresses it for the model.
 * ======================================================================== */

import { getProfile, getSessions, getStreak, getPrefs, getGoal, getLatestPredictedSet, getGapAnswers } from "./store";
import { computeMetrics } from "./metrics";
import { getJobBreakdown, money } from "./job-insights";
import { encodeContext, humanContextSummary, type UserContext } from "./context-codec";
import { pushOverview } from "./cloud";

/** Assemble the full, current context for the signed-in person. */
export function buildContext(): UserContext {
  const profile = getProfile();
  const sessions = getSessions();
  const streak = getStreak();
  const prefs = getPrefs();
  const goal = getGoal();
  const m = computeMetrics(sessions, streak);

  const role = profile.targetRole || "";
  const { family } = role ? getJobBreakdown(role, prefs.seniority) : { family: null as any };

  const predictedSet = getLatestPredictedSet();
  const gaps = getGapAnswers();
  const lastGap = gaps[0];

  const ctx: UserContext = {
    name: profile.name || undefined,
    situation: profile.situation,
    targetRole: role || undefined,
    company: profile.company || undefined,
    interviewGap: profile.interviewGap,
    interviewDate: goal.interviewDate || undefined,

    sessions: m.sessionCount,
    cadence: m.hasData ? m.cadence : undefined,
    streak: streak.current || undefined,
    longestStreak: streak.longest || undefined,
    readiness: m.hasData ? m.readiness : undefined,
    firstScore: m.hasData ? m.firstScore : undefined,
    bestScore: m.hasData ? m.bestScore : undefined,
    improvement: m.hasData && m.sessionCount > 1 ? m.improvement : undefined,
    pace: m.hasData && m.sessionCount > 1 ? m.pace : undefined,

    strongest: m.strongest?.label,
    weakest: m.weakest?.label,
    dims: m.hasData
      ? {
          clarity: m.dimensions.find((d) => d.key === "clarity")?.current ?? 0,
          relevance: m.dimensions.find((d) => d.key === "relevance")?.current ?? 0,
          specificity: m.dimensions.find((d) => d.key === "specificity")?.current ?? 0,
          confidence: m.dimensions.find((d) => d.key === "confidence")?.current ?? 0,
          conciseness: m.dimensions.find((d) => d.key === "conciseness")?.current ?? 0,
        }
      : undefined,
    anxietyPer100: m.hasData ? m.anxietyPer100 : undefined,
    wpm: m.avgWpm || undefined,
    avgAnswerSeconds: m.avgSecondsPerQuestion || undefined,

    questionsAnswered: m.questionsAnswered || undefined,
    wordsSpoken: m.wordsSpoken || undefined,
    nextMilestone: m.nextMilestone?.label,

    domain: prefs.domain !== "interview" ? prefs.domain : undefined,
    difficulty: prefs.difficulty !== "standard" ? prefs.difficulty : undefined,
    framework: prefs.framework || undefined,
    coachTone: prefs.coachTone !== "balanced" ? prefs.coachTone : undefined,

    roleFamily: family?.label,
    competencies: family?.competencies,
    payBand: family ? `${money(family.salary.low)}-${money(family.salary.high)}` : undefined,

    predicted: predictedSet
      ? { company: predictedSet.company, role: predictedSet.role, count: predictedSet.questions.length }
      : null,
    gapStory: lastGap ? { type: lastGap.gapType, length: lastGap.duration } : null,
    recent: sessions
      .slice(-5)
      .reverse()
      .map((s) => ({ role: s.targetRole || role || "practice", score: s.overall || 0 })),
  };

  return ctx;
}

/** The compact 符 line for the model. This is what ships in an API request. */
export function encodedContext(): string {
  try {
    return encodeContext(buildContext());
  } catch {
    return "";
  }
}

/** A plain-English one-liner for UI ("what your coach knows"). */
export function contextSummary(): string {
  try {
    return humanContextSummary(buildContext());
  } catch {
    return "";
  }
}

/* ---------------------------------------------------------------------------
 * Standardized account overview.
 *
 * A fixed-shape, condensed snapshot saved to the user's account (Supabase). Same
 * fields for everyone, every time, so it can be read back, compared, or shown
 * without re-deriving anything. This is the durable, standardized face of the
 * context layer: "117 questions, biggest weakness specificity, 3/week, ...".
 * ------------------------------------------------------------------------ */

export interface AccountOverview {
  updatedAt: string;
  sessions: number;
  questionsAnswered: number;
  readiness: number; // /100
  percentile: number;
  biggestWeakness: string | null;
  topStrength: string | null;
  avgSessionsPerWeek: number;
  currentStreak: number;
  longestStreak: number;
  avgWpm: number;
  tellsPer100: number;
  targetRole: string;
  company: string;
  interviewDate: string | null;
  /** The standardized one-line summary. */
  line: string;
}

export function buildOverview(): AccountOverview {
  const profile = getProfile();
  const sessions = getSessions();
  const streak = getStreak();
  const goal = getGoal();
  const m = computeMetrics(sessions, streak);

  const weakest = m.weakest?.label ?? null;
  const strongest = m.strongest?.label ?? null;
  const readiness = Math.round(m.readiness);
  const perWeek = m.hasData ? Math.round(m.cadence * 10) / 10 : 0;

  const line = m.hasData
    ? [
        `${m.questionsAnswered} question${m.questionsAnswered === 1 ? "" : "s"} over ${m.sessionCount} session${m.sessionCount === 1 ? "" : "s"}`,
        `readiness ${readiness}/100 (top ${m.topPercent}%)`,
        weakest ? `biggest weakness ${weakest}` : null,
        `${perWeek}/week`,
        streak.current ? `${streak.current}-day streak` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "No sessions yet";

  return {
    updatedAt: new Date().toISOString(),
    sessions: m.sessionCount,
    questionsAnswered: m.questionsAnswered,
    readiness,
    percentile: Math.round(m.percentile),
    biggestWeakness: weakest,
    topStrength: strongest,
    avgSessionsPerWeek: perWeek,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    avgWpm: m.avgWpm,
    tellsPer100: m.anxietyPer100,
    targetRole: profile.targetRole || "",
    company: profile.company || "",
    interviewDate: goal.interviewDate || null,
    line,
  };
}

/** Build the standardized overview and persist it to the user's account. */
export function persistOverview(): void {
  try {
    void pushOverview(buildOverview());
  } catch {
    /* never block the app */
  }
}
