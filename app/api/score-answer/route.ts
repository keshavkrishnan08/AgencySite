import { NextResponse } from "next/server";
import { scoreAnswer } from "@/lib/scoring";
import { exampleAnswer } from "@/lib/examples";
import { callClaude, extractJson, hasAI } from "@/lib/ai";
import type { AnswerScores, Dimension } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AiScore {
  scores: AnswerScores;
  feedback: Record<Dimension, string>;
  strengthSummary: string;
  growthSummary: string;
}

const SYSTEM = `You are PrepPath, a warm and supportive interview coach for non-tech professionals (ages 28-55). Career changers, people returning to work, and the recently laid off. Your demographic is anxious, so you are encouraging, never harsh.

Score one interview answer on five dimensions, each 0-100:
1. clarity. Easy to follow and well structured
2. relevance. Actually answers the question asked
3. specificity. Concrete examples, numbers, outcomes (not vague)
4. confidence. Language projects confidence; penalize hedging/filler/apology/self-undermining
5. conciseness. Right length; too short is vague, too long rambles

For each dimension write ONE sentence of feedback. ALWAYS start with what they did right, then give ONE specific, actionable improvement (quote their words when useful). Be warm.

Compute overall as a weighted average: clarity 20%, relevance 20%, specificity 25%, confidence 20%, conciseness 15% (round to integer).

Also write strengthSummary (their best dimension, one sentence) and growthSummary (their weakest dimension + the single most valuable fix, one sentence).

Return ONLY valid minified JSON, no backticks, no prose:
{"scores":{"clarity":N,"relevance":N,"specificity":N,"confidence":N,"conciseness":N,"overall":N},"feedback":{"clarity":"...","relevance":"...","specificity":"...","confidence":"...","conciseness":"..."},"strengthSummary":"...","growthSummary":"..."}`;

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const {
    question = "",
    answer = "",
    targetRole = "",
    situation = "",
    category = "behavioral",
    questionNumber = 1,
    withExample = false,
  } = body ?? {};

  if (typeof answer !== "string" || answer.trim().length === 0) {
    return NextResponse.json({ error: "Empty answer" }, { status: 400 });
  }

  // Heuristic is always computed: it powers the offline path AND provides
  // exact anxiety (filler/hedging) detection even when Claude does the scoring.
  const heuristic = scoreAnswer({ question, answer, targetRole, category, questionNumber });
  const example = withExample ? exampleAnswer(question, targetRole, category) : "";

  if (hasAI()) {
    try {
      const user = `Question (${category}): ${question}\nRole: ${targetRole || "unspecified"}\nCandidate situation: ${situation || "unspecified"}\n\nCandidate's answer:\n"""${answer.slice(0, 4000)}"""`;
      const text = await callClaude({ system: SYSTEM, user, maxTokens: 700, temperature: 0.3 });
      const parsed = extractJson<AiScore>(text);
      if (parsed?.scores && parsed.feedback) {
        return NextResponse.json({
          ...heuristic,
          scores: parsed.scores,
          feedback: parsed.feedback,
          strengthSummary: parsed.strengthSummary || heuristic.strengthSummary,
          growthSummary: parsed.growthSummary || heuristic.growthSummary,
          anxiety: heuristic.anxiety,
          exampleAnswer: example,
          source: "ai",
        });
      }
    } catch (e) {
      // fall through to heuristic
    }
  }

  return NextResponse.json({ ...heuristic, exampleAnswer: example });
}
