import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Dimension, Situation } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Score → semantic tier used for color coding everywhere. */
export type Tier = "low" | "fair" | "good" | "great";

export function tierFor(score: number): Tier {
  if (score < 40) return "low";
  if (score < 60) return "fair";
  if (score < 80) return "good";
  return "great";
}

/** CSS variable color for a score (matches the design system). */
export function scoreColor(score: number): string {
  const t = tierFor(score);
  return {
    low: "var(--coral)",
    fair: "var(--amber)",
    good: "var(--primary-bright)",
    great: "var(--sage)",
  }[t];
}

export function scoreColorSoft(score: number): string {
  const t = tierFor(score);
  return {
    low: "var(--coral-soft)",
    fair: "var(--amber-soft)",
    good: "var(--primary-soft)",
    great: "var(--sage-soft)",
  }[t];
}

export function scoreLabel(score: number): string {
  const t = tierFor(score);
  return { low: "Needs work", fair: "Getting there", good: "Solid", great: "Excellent" }[t];
}

export const DIMENSIONS: { key: Dimension; label: string; blurb: string }[] = [
  { key: "clarity", label: "Clarity", blurb: "Easy to follow, well structured" },
  { key: "relevance", label: "Relevance", blurb: "Actually answers the question" },
  { key: "specificity", label: "Specificity", blurb: "Concrete examples, numbers, outcomes" },
  { key: "confidence", label: "Confidence", blurb: "Self-assured, no hedging" },
  { key: "conciseness", label: "Conciseness", blurb: "The right length. No rambling" },
];

/** Short, plain advice per dimension. Used in hover tooltips. */
export const DIMENSION_HELP: Record<Dimension, { what: string; tip: string }> = {
  clarity: { what: "How easy your answer is to follow.", tip: "Go in order: the situation, what you did, then the result." },
  relevance: { what: "Whether you answered the real question.", tip: "Make your very first sentence answer it head-on." },
  specificity: { what: "Real details, numbers, and outcomes.", tip: "Add one number or result to every story." },
  confidence: { what: "How sure of yourself you sound.", tip: "Cut 'I just', 'I guess', and 'um'." },
  conciseness: { what: "The right length. Not too short, not rambling.", tip: "Trim the slow start and cut anything that doesn't serve the point." },
};

export const SITUATION_META: Record<
  Situation,
  { label: string; short: string; emoji: string }
> = {
  returning: { label: "Returning to work after time away", short: "Returning to work", emoji: "🌱" },
  laid_off: { label: "Recently laid off or between jobs", short: "Between roles", emoji: "🧭" },
  promotion: { label: "Preparing for a promotion or new role", short: "Going for more", emoji: "📈" },
  career_change: { label: "Changing careers or industries", short: "Changing lanes", emoji: "🔄" },
};

export function uid(prefix = "id"): string {
  const rand = Math.floor(performance.now() * 1000)
    .toString(36)
    .slice(-6);
  const extra = Math.floor((performance.now() % 1) * 1e9).toString(36);
  return `${prefix}_${rand}${extra}`.slice(0, prefix.length + 13);
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function average(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
