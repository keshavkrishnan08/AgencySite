export type Situation = "returning" | "laid_off" | "promotion" | "career_change";
export type InterviewGap = "<1yr" | "1-3yr" | "3-5yr" | "5+yr";
export type Plan = "free" | "premium";
export type BillingInterval = "monthly" | "quarterly";
export type SessionMode = "practice" | "focus" | "predicted" | "review";

export type Dimension =
  | "clarity"
  | "relevance"
  | "specificity"
  | "confidence"
  | "conciseness";

export type DimensionScores = Record<Dimension, number>;

export interface AnswerScores extends DimensionScores {
  overall: number;
}

export interface AnxietyFlags {
  fillers: string[];
  hedges: string[];
  apologies: string[];
  underminers: string[];
  fillerCount: number;
  hedgeCount: number;
  apologyCount: number;
  underminerCount: number;
  total: number;
}

export interface DeliveryMetrics {
  durationSec: number;
  wordCount: number;
  wpm: number;
  pauseCount: number;
  longestPauseSec: number;
}

export interface ScoredAnswer {
  questionNumber: number;
  questionText: string;
  category: string;
  answerText: string;
  scores: AnswerScores;
  feedback: Record<Dimension, string>;
  strengthSummary: string;
  growthSummary: string;
  improve?: string[];
  anxiety: AnxietyFlags;
  exampleAnswer: string;
  wordCount: number;
  durationSeconds?: number;
  secondsOnQuestion?: number; // wall-clock time from seeing the question to submitting
  delivery?: DeliveryMetrics;
  interviewer?: string; // which panelist asked, in panel mode ("Dana · Hiring Manager")
  source: "ai" | "heuristic";
}

export interface Question {
  number: number;
  text: string;
  category: string;
  tip: string;
}

export interface Session {
  id: string;
  createdAt: string;
  targetRole: string;
  company?: string;
  situation: Situation | null;
  mode: SessionMode;
  overall: number;
  dimensions: DimensionScores;
  durationSeconds: number;
  avgSecondsPerQuestion?: number;
  answers: ScoredAnswer[];
  focusDimension?: Dimension;
}

export interface UserProfile {
  name: string;
  email: string;
  situation: Situation | null;
  targetRole: string;
  company?: string;
  interviewGap: InterviewGap | null;
  plan: Plan;
  createdAt: string;
  emailTips: boolean;
}

export interface Streak {
  current: number;
  longest: number;
  lastSessionDate: string | null;
}

export interface SavedGapAnswer {
  id: string;
  gapType: string;
  duration: string;
  versionLabel: string;
  text: string;
  savedAt: string;
}

export interface PredictedQuestion {
  question: string;
  why: string;
  strongAnswer: string[];
  probability: number;
}

/** A predicted-question set handed off from the Question Predictor into Practice. */
export interface PredictedSet {
  id: string;
  company: string;
  role: string;
  questions: PredictedQuestion[];
  savedAt: string;
}
