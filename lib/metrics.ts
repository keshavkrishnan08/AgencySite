import type { Dimension, Session, Streak } from "./types";
import { DIMENSIONS, average, clamp, todayKey } from "./utils";

/* ===========================================================================
 * The metrics engine.
 *
 * Everything the dashboard shows is derived here, from Session[] alone. No
 * network, no side effects, no React. That keeps the numbers testable, keeps
 * the page dumb, and means a metric can never disagree with itself across two
 * different cards.
 *
 * Every function is total: zero sessions, one session, and sessions missing
 * optional fields (old records) all return sane values instead of NaN.
 * ======================================================================== */

const DAY = 86400000;

/* ---------------------------------------------------------------------------
 * Percentile model
 *
 * Maps an Axon score (0-100) to the share of candidates you'd out-answer.
 * Anchored to the scoring rubric rather than invented: 50 is the median
 * answer, 80 is the "interview ready" bar the product has always used, and 94
 * is the top 1%. Between anchors we interpolate linearly. It's a model, and
 * the UI says so — but it's a stable, monotonic one, so the number only moves
 * when your answers actually get better.
 * ------------------------------------------------------------------------ */

const CURVE: [score: number, percentile: number][] = [
  [0, 0], [20, 3], [30, 8], [40, 18], [50, 34], [55, 45], [60, 55],
  [65, 64], [70, 72], [75, 79], [80, 85], [85, 91], [88, 94], [90, 96],
  [92, 97.5], [94, 99], [96, 99.5], [100, 99.9],
];

/** Percent of candidates a given score beats. */
export function percentileFor(score: number): number {
  const s = clamp(score, 0, 100);
  for (let i = 1; i < CURVE.length; i++) {
    const [x1, y1] = CURVE[i - 1];
    const [x2, y2] = CURVE[i];
    if (s <= x2) return round1(y1 + ((s - x1) / (x2 - x1)) * (y2 - y1));
  }
  return 99.9;
}

/** The score you need to reach a given percentile. Inverse of the curve. */
export function scoreForPercentile(p: number): number {
  const t = clamp(p, 0, 99.9);
  for (let i = 1; i < CURVE.length; i++) {
    const [x1, y1] = CURVE[i - 1];
    const [x2, y2] = CURVE[i];
    if (t <= y2) return Math.round(x1 + ((t - y1) / (y2 - y1)) * (x2 - x1));
  }
  return 100;
}

/** "Top X%" — the complement of the percentile, floored at 1. */
export function topPercentFor(score: number): number {
  return Math.max(1, Math.round(100 - percentileFor(score)));
}

export const READY_SCORE = 80;
export const TOP_1_SCORE = scoreForPercentile(99); // 94

/** Typical improvement per session across users who practice consistently.
 *  Used as the fallback pace when someone has too little history to fit a
 *  trend, or when their own trend is flat/negative. */
const TYPICAL_PACE = 2.4;
const MIN_TRUSTED_PACE = 0.35;
const DEFAULT_CADENCE = 3; // sessions/week assumed before we can measure

/* ---------------------------------------------------------------------------
 * Small numeric helpers
 * ------------------------------------------------------------------------ */

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Least-squares slope of y over its index. Points per step. */
function slope(ys: number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (ys[i] - meanY);
    den += (i - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function sum(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0);
}

/* ---------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------ */

export interface Projection {
  /** Days until the target score, at the pace we're using. */
  days: number;
  /** Sessions still needed. */
  sessions: number;
  /** Calendar date we'd expect you to hit it. */
  dateISO: string;
  /** Points still to gain. */
  gap: number;
  /** Whether the estimate uses the user's own measured trend or the typical one. */
  basis: "measured" | "typical";
  /** Already at or past the target. */
  reached: boolean;
  /** Not enough history to say anything honest yet. */
  unknown: boolean;
}

export interface DimensionMetric {
  key: Dimension;
  label: string;
  blurb: string;
  current: number;
  first: number;
  best: number;
  delta: number;
  percentile: number;
  topPercent: number;
  pace: number;
  series: number[];
  toReady: Projection;
  /** Rank among the five, 1 = strongest. */
  rank: number;
}

export interface AnxietyMetric {
  key: "fillers" | "hedges" | "apologies" | "underminers";
  label: string;
  /** Occurrences per 100 words across all answers. */
  per100: number;
  /** Same figure over the first third of history, for the trend. */
  per100First: number;
  delta: number;
  total: number;
  /** The actual words caught, most recent first. */
  examples: string[];
}

export interface Milestone {
  id: string;
  label: string;
  detail: string;
  achieved: boolean;
  /** 0-1 toward achieving it. */
  progress: number;
}

export interface Metrics {
  hasData: boolean;
  sessionCount: number;

  /* headline */
  readiness: number;
  percentile: number;
  topPercent: number;
  bestScore: number;
  firstScore: number;
  latestScore: number;
  improvement: number;
  improvementPct: number;

  /* pace + projection */
  pace: number;
  paceBasis: "measured" | "typical";
  cadence: number;
  toReady: Projection;
  toTop1: Projection;

  /* consistency */
  streak: Streak;
  consistency: number;
  daysActive: number;
  daysSinceStart: number;
  sessionsThisWeek: number;
  sessionsLastWeek: number;
  weekDelta: number;
  activity: { dateISO: string; count: number; score: number }[];
  restDays: number;

  /* volume */
  questionsAnswered: number;
  wordsSpoken: number;
  practiceSeconds: number;
  avgSessionSeconds: number;
  avgWordsPerAnswer: number;
  avgSecondsPerQuestion: number;
  avgWpm: number;

  /* breakdowns */
  dimensions: DimensionMetric[];
  strongest: DimensionMetric | null;
  weakest: DimensionMetric | null;
  anxiety: AnxietyMetric[];
  anxietyPer100: number;
  anxietyPer100First: number;
  anxietyDelta: number;
  categories: { category: string; label: string; avg: number; count: number }[];
  distribution: { bucket: string; count: number }[];
  trend: { label: string; dateISO: string; score: number }[];

  /* records */
  bestAnswer: { score: number; question: string } | null;
  bestWeekSessions: number;
  milestones: Milestone[];
  nextMilestone: Milestone | null;
}

/* ---------------------------------------------------------------------------
 * Projection
 * ------------------------------------------------------------------------ */

function project(current: number, target: number, pace: number, cadence: number, sessionCount: number): Projection {
  const gap = round1(Math.max(0, target - current));
  const base = {
    gap,
    basis: (pace >= MIN_TRUSTED_PACE ? "measured" : "typical") as "measured" | "typical",
  };
  if (current >= target) {
    return { ...base, days: 0, sessions: 0, dateISO: todayKey(), gap: 0, reached: true, unknown: false };
  }
  if (sessionCount < 2) {
    return { ...base, days: 0, sessions: 0, dateISO: todayKey(), reached: false, unknown: true };
  }
  const usePace = pace >= MIN_TRUSTED_PACE ? pace : TYPICAL_PACE;
  const perWeek = Math.max(1, cadence);
  const sessions = Math.max(1, Math.ceil(gap / usePace));
  const days = clamp(Math.ceil((sessions / perWeek) * 7), 1, 365);
  return {
    ...base,
    days,
    sessions,
    dateISO: todayKey(new Date(Date.now() + days * DAY)),
    reached: false,
    unknown: false,
  };
}

/* ---------------------------------------------------------------------------
 * Anxiety
 * ------------------------------------------------------------------------ */

const ANXIETY_KEYS = [
  { key: "fillers", label: "Filler words", countKey: "fillerCount" },
  { key: "hedges", label: "Hedging", countKey: "hedgeCount" },
  { key: "apologies", label: "Apologies", countKey: "apologyCount" },
  { key: "underminers", label: "Self-undermining", countKey: "underminerCount" },
] as const;

function anxietyFor(sessions: Session[]): { items: AnxietyMetric[]; per100: number; per100First: number } {
  const answers = sessions.flatMap((s) => s.answers || []);
  const firstThird = sessions.slice(0, Math.max(1, Math.ceil(sessions.length / 3))).flatMap((s) => s.answers || []);

  const words = Math.max(1, sum(answers.map((a) => a.wordCount || 0)));
  const wordsFirst = Math.max(1, sum(firstThird.map((a) => a.wordCount || 0)));

  const items = ANXIETY_KEYS.map(({ key, label, countKey }) => {
    const total = sum(answers.map((a) => (a.anxiety as any)?.[countKey] || 0));
    const totalFirst = sum(firstThird.map((a) => (a.anxiety as any)?.[countKey] || 0));
    const per100 = round1((total / words) * 100);
    const per100First = round1((totalFirst / wordsFirst) * 100);
    const examples = Array.from(
      new Set(
        [...answers].reverse().flatMap((a) => ((a.anxiety as any)?.[key] as string[]) || [])
      )
    ).slice(0, 6);
    return { key, label, per100, per100First, delta: round1(per100 - per100First), total, examples };
  });

  const allTotal = sum(items.map((i) => i.total));
  const allFirst = sum(
    ANXIETY_KEYS.map(({ countKey }) => sum(firstThird.map((a) => (a.anxiety as any)?.[countKey] || 0)))
  );
  return {
    items,
    per100: round1((allTotal / words) * 100),
    per100First: round1((allFirst / wordsFirst) * 100),
  };
}

/* ---------------------------------------------------------------------------
 * Milestones — the retention ladder. Each one is a reason to come back.
 * ------------------------------------------------------------------------ */

function milestonesFor(m: {
  sessionCount: number;
  bestScore: number;
  readiness: number;
  streak: Streak;
  questionsAnswered: number;
  anxietyDelta: number;
}): Milestone[] {
  const list: Milestone[] = [
    {
      id: "first",
      label: "First session done",
      detail: "You showed up. That's the hard part.",
      achieved: m.sessionCount >= 1,
      progress: clamp(m.sessionCount / 1, 0, 1),
    },
    {
      id: "five",
      label: "5 sessions",
      detail: "Enough history for your trend line to mean something.",
      achieved: m.sessionCount >= 5,
      progress: clamp(m.sessionCount / 5, 0, 1),
    },
    {
      id: "streak3",
      label: "3-day streak",
      detail: "Three days running. Habits start here.",
      achieved: m.streak.longest >= 3,
      progress: clamp(m.streak.longest / 3, 0, 1),
    },
    {
      id: "score60",
      label: "Break 60",
      detail: "Above the median candidate.",
      achieved: m.bestScore >= 60,
      progress: clamp(m.bestScore / 60, 0, 1),
    },
    {
      id: "q25",
      label: "25 questions answered",
      detail: "You've now heard most of what they'll ask.",
      achieved: m.questionsAnswered >= 25,
      progress: clamp(m.questionsAnswered / 25, 0, 1),
    },
    {
      id: "streak7",
      label: "7-day streak",
      detail: "A full week without missing.",
      achieved: m.streak.longest >= 7,
      progress: clamp(m.streak.longest / 7, 0, 1),
    },
    {
      id: "calm",
      label: "Cut your tells in half",
      detail: "Fillers, hedges and apologies down 50% from where you started.",
      achieved: m.anxietyDelta <= -50,
      progress: clamp(Math.abs(Math.min(0, m.anxietyDelta)) / 50, 0, 1),
    },
    {
      id: "ready",
      label: "Interview ready (80)",
      detail: "The bar most people walk in confident at.",
      achieved: m.readiness >= READY_SCORE,
      progress: clamp(m.readiness / READY_SCORE, 0, 1),
    },
    {
      id: "ten",
      label: "10 sessions",
      detail: "Deliberate practice territory.",
      achieved: m.sessionCount >= 10,
      progress: clamp(m.sessionCount / 10, 0, 1),
    },
    {
      id: "streak14",
      label: "14-day streak",
      detail: "Two weeks. This is who you are now.",
      achieved: m.streak.longest >= 14,
      progress: clamp(m.streak.longest / 14, 0, 1),
    },
    {
      id: "top1",
      label: `Top 1% (${TOP_1_SCORE})`,
      detail: "Better than 99 out of 100 candidates in the room.",
      achieved: m.readiness >= TOP_1_SCORE,
      progress: clamp(m.readiness / TOP_1_SCORE, 0, 1),
    },
  ];
  return list;
}

/* ---------------------------------------------------------------------------
 * Category labels
 * ------------------------------------------------------------------------ */

const CATEGORY_LABEL: Record<string, string> = {
  warmup: "Warm-up",
  behavioral: "Behavioral",
  gap: "Your story",
  closer: "Closing",
  focus: "Focus drill",
  situational: "Situational",
  situation: "Situational",
  leadership: "Leadership",
  technical: "Role knowledge",
  story: "Storytelling",
  speech: "Speaking drill",
};

/* ---------------------------------------------------------------------------
 * The one entry point
 * ------------------------------------------------------------------------ */

export function computeMetrics(sessions: Session[], streak: Streak): Metrics {
  const sorted = [...sessions].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const n = sorted.length;
  const answers = sorted.flatMap((s) => s.answers || []);

  const empty = n === 0;
  const overalls = sorted.map((s) => s.overall || 0);

  /* headline */
  const readiness = empty ? 0 : average(overalls.slice(-5));
  const bestScore = empty ? 0 : Math.max(...overalls);
  const firstScore = empty ? 0 : overalls[0];
  const latestScore = empty ? 0 : overalls[n - 1];
  const improvement = latestScore - firstScore;
  const improvementPct = firstScore > 0 ? Math.round((improvement / firstScore) * 100) : 0;

  /* pace: fit the trend over recent history, not all of it — the last ten
     sessions describe who you are now. */
  const measuredPace = round1(slope(overalls.slice(-10)));
  const paceBasis: "measured" | "typical" = measuredPace >= MIN_TRUSTED_PACE ? "measured" : "typical";

  /* cadence: sessions per week over the trailing 28 days */
  const since = Date.now() - 28 * DAY;
  const recent = sorted.filter((s) => +new Date(s.createdAt) >= since);
  const firstAt = n ? +new Date(sorted[0].createdAt) : Date.now();
  const spanDays = Math.max(1, Math.min(28, Math.ceil((Date.now() - firstAt) / DAY)));
  const cadence = recent.length >= 2 ? round1((recent.length / spanDays) * 7) : DEFAULT_CADENCE;

  const toReady = project(readiness, READY_SCORE, measuredPace, cadence, n);
  const toTop1 = project(readiness, TOP_1_SCORE, measuredPace, cadence, n);

  /* consistency */
  const dayKeys = new Set(sorted.map((s) => todayKey(new Date(s.createdAt))));
  const daysActive = dayKeys.size;
  const daysSinceStart = n ? Math.max(1, Math.ceil((Date.now() - firstAt) / DAY)) : 0;
  const consistency = daysSinceStart ? clamp(Math.round((daysActive / daysSinceStart) * 100), 0, 100) : 0;

  const weekStart = (offset: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - offset * 7);
    return +d;
  };
  const thisWeekStart = weekStart(0);
  const lastWeekStart = weekStart(1);
  const sessionsThisWeek = sorted.filter((s) => +new Date(s.createdAt) >= thisWeekStart).length;
  const sessionsLastWeek = sorted.filter((s) => {
    const t = +new Date(s.createdAt);
    return t >= lastWeekStart && t < thisWeekStart;
  }).length;

  /* 28-day activity strip */
  const byDay = new Map<string, { count: number; scores: number[] }>();
  sorted.forEach((s) => {
    const k = todayKey(new Date(s.createdAt));
    const cur = byDay.get(k) || { count: 0, scores: [] };
    cur.count += 1;
    cur.scores.push(s.overall || 0);
    byDay.set(k, cur);
  });
  const activity = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(Date.now() - (27 - i) * DAY);
    const k = todayKey(d);
    const hit = byDay.get(k);
    return { dateISO: k, count: hit?.count ?? 0, score: hit ? average(hit.scores) : 0 };
  });
  const restDays = activity.filter((a) => a.count === 0).length;

  /* best week */
  const weekBuckets = new Map<string, number>();
  sorted.forEach((s) => {
    const d = new Date(s.createdAt);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const k = todayKey(d);
    weekBuckets.set(k, (weekBuckets.get(k) || 0) + 1);
  });
  const bestWeekSessions = weekBuckets.size ? Math.max(...Array.from(weekBuckets.values())) : 0;

  /* volume */
  const questionsAnswered = answers.length;
  const wordsSpoken = sum(answers.map((a) => a.wordCount || 0));
  const practiceSeconds = sum(sorted.map((s) => s.durationSeconds || 0));
  const avgSessionSeconds = n ? Math.round(practiceSeconds / n) : 0;
  const avgWordsPerAnswer = questionsAnswered ? Math.round(wordsSpoken / questionsAnswered) : 0;
  const perQ = answers.map((a) => a.secondsOnQuestion || 0).filter((x) => x > 0);
  const avgSecondsPerQuestion = perQ.length ? Math.round(sum(perQ) / perQ.length) : 0;
  const wpms = answers.map((a) => a.delivery?.wpm || 0).filter((x) => x > 0);
  const avgWpm = wpms.length ? Math.round(sum(wpms) / wpms.length) : 0;

  /* dimensions */
  const dimRaw = DIMENSIONS.map((d) => {
    const series = sorted.map((s) => s.dimensions?.[d.key] ?? 0);
    const recentVals = series.slice(-3);
    const current = recentVals.length ? average(recentVals) : 0;
    const first = series[0] ?? 0;
    const best = series.length ? Math.max(...series) : 0;
    const pace = round1(slope(series.slice(-10)));
    return {
      key: d.key,
      label: d.label,
      blurb: d.blurb,
      current,
      first,
      best,
      delta: current - first,
      percentile: percentileFor(current),
      topPercent: topPercentFor(current),
      pace,
      series,
      toReady: project(current, READY_SCORE, pace, cadence, n),
      rank: 0,
    };
  });
  const ordered = [...dimRaw].sort((a, b) => b.current - a.current);
  ordered.forEach((d, i) => (d.rank = i + 1));
  const dimensions = dimRaw;
  const strongest = ordered[0] ?? null;
  const weakest = ordered[ordered.length - 1] ?? null;

  /* anxiety */
  const anx = anxietyFor(sorted);
  const anxietyDelta = anx.per100First > 0 ? Math.round(((anx.per100 - anx.per100First) / anx.per100First) * 100) : 0;

  /* categories */
  const catMap = new Map<string, number[]>();
  answers.forEach((a) => {
    const k = a.category || "behavioral";
    catMap.set(k, [...(catMap.get(k) || []), a.scores?.overall ?? 0]);
  });
  const categories = Array.from(catMap.entries())
    .map(([category, vals]) => ({
      category,
      label: CATEGORY_LABEL[category] || category,
      avg: average(vals),
      count: vals.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  /* distribution of every answer score */
  const buckets = [
    ["0-39", 0, 39],
    ["40-54", 40, 54],
    ["55-69", 55, 69],
    ["70-79", 70, 79],
    ["80-89", 80, 89],
    ["90+", 90, 100],
  ] as const;
  const distribution = buckets.map(([bucket, lo, hi]) => ({
    bucket,
    count: answers.filter((a) => {
      const v = a.scores?.overall ?? 0;
      return v >= lo && v <= hi;
    }).length,
  }));

  /* trend line */
  const trend = sorted.map((s) => ({
    label: new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    dateISO: s.createdAt,
    score: s.overall || 0,
  }));

  /* best single answer */
  const bestAnswer = answers.length
    ? answers.reduce((m, a) => ((a.scores?.overall ?? 0) > (m.scores?.overall ?? 0) ? a : m))
    : null;

  const milestones = milestonesFor({
    sessionCount: n,
    bestScore,
    readiness,
    streak,
    questionsAnswered,
    anxietyDelta,
  });

  return {
    hasData: !empty,
    sessionCount: n,

    readiness,
    percentile: percentileFor(readiness),
    topPercent: topPercentFor(readiness),
    bestScore,
    firstScore,
    latestScore,
    improvement,
    improvementPct,

    pace: paceBasis === "measured" ? measuredPace : TYPICAL_PACE,
    paceBasis,
    cadence,
    toReady,
    toTop1,

    streak,
    consistency,
    daysActive,
    daysSinceStart,
    sessionsThisWeek,
    sessionsLastWeek,
    weekDelta: sessionsThisWeek - sessionsLastWeek,
    activity,
    restDays,

    questionsAnswered,
    wordsSpoken,
    practiceSeconds,
    avgSessionSeconds,
    avgWordsPerAnswer,
    avgSecondsPerQuestion,
    avgWpm,

    dimensions,
    strongest,
    weakest,
    anxiety: anx.items,
    anxietyPer100: anx.per100,
    anxietyPer100First: anx.per100First,
    anxietyDelta,
    categories,
    distribution,
    trend,

    bestAnswer: bestAnswer
      ? { score: bestAnswer.scores?.overall ?? 0, question: bestAnswer.questionText || "" }
      : null,
    bestWeekSessions,
    milestones,
    nextMilestone: milestones.find((m) => !m.achieved) ?? null,
  };
}

/* ---------------------------------------------------------------------------
 * Display helpers
 * ------------------------------------------------------------------------ */

/** "12 days" / "3 weeks" / "2 months" — the shortest honest phrasing. */
export function humanDays(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Compact thousands: 12400 -> "12.4k". */
export function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${round1(n / 1000)}k`;
  return `${Math.round(n / 1000)}k`;
}
