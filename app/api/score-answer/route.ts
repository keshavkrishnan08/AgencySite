import { rateLimit } from "@/lib/ratelimit";
import { recordUsage } from "@/lib/usage";
import { NextResponse } from "next/server";
import { scoreAnswer } from "@/lib/scoring";
import { exampleAnswer } from "@/lib/examples";
import { callClaude, extractJson, hasAI } from "@/lib/ai";
import { COACH_PERSONA, SCORING_RUBRIC, candidateBlock } from "@/lib/prompt";
import type { AnswerScores, Dimension } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AiScore {
  scores: AnswerScores;
  feedback: Record<Dimension, string>;
  strengthSummary: string;
  growthSummary: string;
}

const SYSTEM = `${COACH_PERSONA}

Your task: score ONE interview answer on five dimensions, each 0 to 100.
1. clarity: easy to follow and well structured.
2. relevance: actually answers the question asked.
3. specificity: concrete examples, numbers, outcomes, not vague.
4. confidence: language projects confidence; penalize hedging, filler, apology, self-undermining.
5. conciseness: right length; too short is vague, too long rambles.

${SCORING_RUBRIC}

For each dimension write ONE sentence of feedback. Start with what they did right, then give ONE specific fix, and quote their own words when it helps. Tie the feedback to their role, situation, and weak area.

Compute overall as a weighted average: clarity 20%, relevance 20%, specificity 25%, confidence 20%, conciseness 15%, rounded to an integer.

Also write strengthSummary (their best dimension, one sentence) and growthSummary (their weakest dimension plus the single most valuable fix, one sentence).

Return ONLY valid minified JSON, no backticks, no prose:
{"scores":{"clarity":N,"relevance":N,"specificity":N,"confidence":N,"conciseness":N,"overall":N},"feedback":{"clarity":"...","relevance":"...","specificity":"...","confidence":"...","conciseness":"..."},"strengthSummary":"...","growthSummary":"..."}`;

export async function POST(req: Request) {
  const limited = await rateLimit(req);
  if (limited) return limited;
  recordUsage(req);
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
    name = "",
    company = "",
    interviewGap = "",
    weakestDimension = "",
    recentAverage = 0,
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
      const ctx = candidateBlock({ name, situation, targetRole, company, interviewGap, weakestDimension, recentAverage });
      const user = `${ctx}\n\nQuestion (${category}): ${question}\n\nTheir answer:\n"""${answer.slice(0, 4000)}"""`;
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
