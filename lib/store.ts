"use client";

import type {
  PredictedSet,
  SavedGapAnswer,
  Session,
  Streak,
  UserProfile,
} from "./types";
import { todayKey } from "./utils";
import { pushProfile, pushSession } from "./cloud";

/* Client-side persistence layer.
 * Uses localStorage so the whole product. Sessions, streaks, dashboard,
 * paywall. Works instantly with zero backend. The API surface mirrors what a
 * Supabase-backed implementation would expose, so swapping later is a drop-in. */

const KEYS = {
  profile: "pp:profile",
  sessions: "pp:sessions",
  streak: "pp:streak",
  gaps: "pp:gaps",
  predicted: "pp:predicted",
  onboarding: "pp:onboarding",
  goal: "pp:goal",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("pp:change", { detail: { key } }));
  } catch {
    /* ignore quota / private mode */
  }
}

/* ----------------------- Profile ----------------------- */

export const DEFAULT_PROFILE: UserProfile = {
  name: "",
  email: "",
  situation: null,
  targetRole: "",
  company: "",
  interviewGap: null,
  plan: "free",
  createdAt: "",
  emailTips: true,
};

export function getProfile(): UserProfile {
  return { ...DEFAULT_PROFILE, ...read<Partial<UserProfile>>(KEYS.profile, {}) };
}

export function setProfile(patch: Partial<UserProfile>): UserProfile {
  const next = { ...getProfile(), ...patch };
  if (!next.createdAt) next.createdAt = new Date().toISOString();
  write(KEYS.profile, next);
  void pushProfile(next);
  return next;
}

export function isSignedIn(): boolean {
  return Boolean(getProfile().email);
}

export function isPremium(): boolean {
  return getProfile().plan === "premium";
}

/* ----------------------- Sessions ----------------------- */

export function getSessions(): Session[] {
  return read<Session[]>(KEYS.sessions, []).sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)
  );
}

export function getSession(id: string): Session | undefined {
  return getSessions().find((s) => s.id === id);
}

export function saveSession(session: Session): void {
  const all = read<Session[]>(KEYS.sessions, []);
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx >= 0) all[idx] = session;
  else all.push(session);
  write(KEYS.sessions, all);
  touchStreak(session.createdAt);
  void pushSession(session);
}

export function deleteSession(id: string): void {
  write(
    KEYS.sessions,
    read<Session[]>(KEYS.sessions, []).filter((s) => s.id !== id)
  );
}

/** Sessions started this calendar week (Monday-anchored). Feeds the metrics page. */
export function sessionsThisWeek(): number {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return getSessions().filter((s) => new Date(s.createdAt) >= monday).length;
}

/* ----------------------- Streaks ----------------------- */

export function getStreak(): Streak {
  return read<Streak>(KEYS.streak, {
    current: 0,
    longest: 0,
    lastSessionDate: null,
  });
}

function touchStreak(iso: string): void {
  const date = todayKey(new Date(iso));
  const s = getStreak();
  if (s.lastSessionDate === date) return; // already counted today

  const prev = s.lastSessionDate ? new Date(s.lastSessionDate) : null;
  const cur = new Date(date);
  let current = 1;
  if (prev) {
    const diff = Math.round((+cur - +prev) / 86400000);
    current = diff === 1 ? s.current + 1 : diff <= 0 ? s.current : 1;
  }
  write(KEYS.streak, {
    current,
    longest: Math.max(current, s.longest),
    lastSessionDate: date,
  });
}

/* ----------------------- Gap answers ----------------------- */

export function getGapAnswers(): SavedGapAnswer[] {
  return read<SavedGapAnswer[]>(KEYS.gaps, []);
}
export function saveGapAnswer(a: SavedGapAnswer): void {
  const all = getGapAnswers().filter((x) => x.id !== a.id);
  all.unshift(a);
  write(KEYS.gaps, all.slice(0, 12));
}
export function deleteGapAnswer(id: string): void {
  write(KEYS.gaps, getGapAnswers().filter((x) => x.id !== id));
}

/* ----------------------- Predicted question sets ----------------------- */
/* The Question Predictor writes here; Practice reads it to run a session on the
   exact questions this posting is likely to ask. That handoff is the whole
   reason the sub-feature exists. */

export function getPredictedSets(): PredictedSet[] {
  return read<PredictedSet[]>(KEYS.predicted, []);
}
export function getPredictedSet(id: string): PredictedSet | undefined {
  return getPredictedSets().find((s) => s.id === id);
}
export function getLatestPredictedSet(): PredictedSet | null {
  return getPredictedSets()[0] ?? null;
}
export function savePredictedSet(set: PredictedSet): void {
  const all = getPredictedSets().filter((x) => x.id !== set.id);
  all.unshift(set);
  write(KEYS.predicted, all.slice(0, 8));
}

/* ----------------------- Onboarding draft ----------------------- */

export interface OnboardingDraft {
  situation: UserProfile["situation"];
  targetRole: string;
  company?: string;
  interviewGap: UserProfile["interviewGap"];
  // Kept so the paywall can personalise to what they told us (Superwall: never
  // show a generic paywall after a personalised flow).
  timeline?: string; // this_week | two_weeks | month | none
  salaryBand?: string;
}
/* ----------------------- Goal (interview countdown) ----------------------- */
export interface Goal {
  interviewDate: string | null; // ISO date (YYYY-MM-DD)
}
export function getGoal(): Goal {
  return read<Goal>(KEYS.goal, { interviewDate: null });
}
export function setGoal(g: Goal): void {
  write(KEYS.goal, g);
}

export function getOnboarding(): OnboardingDraft | null {
  return read<OnboardingDraft | null>(KEYS.onboarding, null);
}
export function setOnboarding(d: OnboardingDraft): void {
  write(KEYS.onboarding, d);
}


/** Subscribe to any store change (used by the dashboard to stay live). */
export function onStoreChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("pp:change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("pp:change", handler);
    window.removeEventListener("storage", handler);
  };
}

/** Merge cloud records into local storage on sign-in (cloud wins per id). */
export function hydrateLocal(data: {
  profile?: Partial<UserProfile> | null;
  sessions?: Session[];
}): void {
  if (data.profile) write(KEYS.profile, { ...getProfile(), ...data.profile });
  if (data.sessions?.length) {
    const map = new Map(read<Session[]>(KEYS.sessions, []).map((s) => [s.id, s] as const));
    data.sessions.forEach((s) => map.set(s.id, s));
    write(KEYS.sessions, Array.from(map.values()));
  }
}

export function upgradeToPremium(): void {
  setProfile({ plan: "premium" });
}

export function resetAll(): void {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  window.dispatchEvent(new CustomEvent("pp:change", { detail: { key: "*" } }));
}
