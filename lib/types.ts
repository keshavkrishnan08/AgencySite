export type Situation = "returning" | "laid_off" | "promotion" | "career_change";
export type InterviewGap = "<1yr" | "1-3yr" | "3-5yr" | "5+yr";
export type Plan = "free" | "premium";
export type SessionMode = "practice" | "interview_day" | "focus";

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

export interface ScoredAnswer {
  questionNumber: number;
  questionText: string;
  category: string;
  answerText: string;
  scores: AnswerScores;
  feedback: Record<Dimension, string>;
  strengthSummary: string;
  growthSummary: string;
  anxiety: AnxietyFlags;
  exampleAnswer: string;
  wordCount: number;
  durationSeconds?: number;
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
  situation: Situation | null;
  mode: SessionMode;
  overall: number;
  dimensions: DimensionScores;
  durationSeconds: number;
  answers: ScoredAnswer[];
  focusDimension?: Dimension;
}

export interface UserProfile {
  name: string;
  email: string;
  situation: Situation | null;
  targetRole: string;
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

export interface CompanyBriefing {
  id: string;
  company: string;
  role: string;
  whatTheyDo: string;
  recentNews: string[];
  culture: string[];
  roleFocus: string[];
  questionsToAsk: string[];
  savedAt: string;
}

export interface PredictedQuestion {
  question: string;
  why: string;
  strongAnswer: string[];
  probability: number;
}
