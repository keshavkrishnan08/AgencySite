"use client";

import type {
  CompanyBriefing,
  InterviewRecord,
  SavedGapAnswer,
  Session,
  Streak,
  UserProfile,
} from "./types";
import { todayKey } from "./utils";

/* Client-side persistence layer.
 * Uses localStorage so the whole product. Sessions, streaks, dashboard,
 * paywall. Works instantly with zero backend. The API surface mirrors what a
 * Supabase-backed implementation would expose, so swapping later is a drop-in. */

const KEYS = {
  profile: "pp:profile",
  sessions: "pp:sessions",
  streak: "pp:streak",
  gaps: "pp:gaps",
  briefings: "pp:briefings",
  onboarding: "pp:onboarding",
  interviews: "pp:interviews",
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
}

export function deleteSession(id: string): void {
  write(
    KEYS.sessions,
    read<Session[]>(KEYS.sessions, []).filter((s) => s.id !== id)
  );
}

/** Sessions started this calendar week (for the free-plan limit). */
export function sessionsThisWeek(): number {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return getSessions().filter((s) => new Date(s.createdAt) >= monday).length;
}

export const FREE_WEEKLY_LIMIT = 2;

export function canStartSession(): boolean {
  return isPremium() || sessionsThisWeek() < FREE_WEEKLY_LIMIT;
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

/* ----------------------- Company briefings ----------------------- */

export function getBriefings(): CompanyBriefing[] {
  return read<CompanyBriefing[]>(KEYS.briefings, []);
}
export function saveBriefing(b: CompanyBriefing): void {
  const all = getBriefings().filter((x) => x.id !== b.id);
  all.unshift(b);
  write(KEYS.briefings, all.slice(0, 12));
}

/* ----------------------- Interview tracker (outcome loop) ----------------------- */

export function getInterviews(): InterviewRecord[] {
  return read<InterviewRecord[]>(KEYS.interviews, []).sort(
    (a, b) => (b.date || "").localeCompare(a.date || "")
  );
}
export function saveInterview(rec: InterviewRecord): void {
  const all = getInterviews().filter((x) => x.id !== rec.id);
  all.push(rec);
  write(KEYS.interviews, all);
}
export function deleteInterview(id: string): void {
  write(KEYS.interviews, getInterviews().filter((x) => x.id !== id));
}

/* ----------------------- Onboarding draft ----------------------- */

export interface OnboardingDraft {
  situation: UserProfile["situation"];
  targetRole: string;
  interviewGap: UserProfile["interviewGap"];
}
export function getOnboarding(): OnboardingDraft | null {
  return read<OnboardingDraft | null>(KEYS.onboarding, null);
}
export function setOnboarding(d: OnboardingDraft): void {
  write(KEYS.onboarding, d);
}

/* ----------------------- Demo seed ----------------------- */

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

export function upgradeToPremium(): void {
  setProfile({ plan: "premium" });
}

export function resetAll(): void {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  window.dispatchEvent(new CustomEvent("pp:change", { detail: { key: "*" } }));
}
