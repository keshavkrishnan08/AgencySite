"use client";

import { scoreAnswer as localScore } from "./scoring";
import { exampleAnswer } from "./examples";
import { generateQuestions as localQuestions, generateFocusQuestions } from "./questions";
import type { Dimension, Question, ScoredAnswer, Situation } from "./types";

/* Client helpers that call the API routes, with a local fallback so the
   product keeps working even if the network/route is unavailable. */

export async function apiGenerateQuestions(args: {
  situation: Situation | null;
  targetRole: string;
  interviewGap?: string | null;
  seed?: number;
  focusDimension?: Dimension;
  company?: string;
  posting?: string;
}): Promise<{ questions: Question[]; source: string }> {
  try {
    const res = await fetch("/api/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.questions?.length) return data;
    }
  } catch {
    /* fall through */
  }
  const questions = args.focusDimension
    ? generateFocusQuestions(args.focusDimension, args.targetRole, args.seed ?? 0)
    : localQuestions(args.situation, args.targetRole, args.seed ?? 0, {
        company: args.company,
        posting: args.posting,
      });
  return { questions, source: "heuristic" };
}

export async function apiScoreAnswer(
  args: {
    question: string;
    answer: string;
    targetRole: string;
    situation?: string;
    category?: string;
    questionNumber?: number;
  },
  withExample = false
): Promise<ScoredAnswer> {
  try {
    const res = await fetch("/api/score-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...args, withExample }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.scores) return data as ScoredAnswer;
    }
  } catch {
    /* fall through */
  }
  const local = localScore(args);
  return {
    ...local,
    exampleAnswer: withExample ? exampleAnswer(args.question, args.targetRole, args.category) : "",
  };
}

export async function apiGenerateExample(
  question: string,
  targetRole: string,
  category = "behavioral"
): Promise<string> {
  try {
    const res = await fetch("/api/generate-example", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, targetRole, category }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.example) return data.example as string;
    }
  } catch {
    /* fall through */
  }
  return exampleAnswer(question, targetRole, category);
}
