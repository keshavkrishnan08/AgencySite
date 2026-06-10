import { rateLimit } from "@/lib/ratelimit";
import { recordUsage } from "@/lib/usage";
import { NextResponse } from "next/server";
import { scoreAnswer, computeOverall } from "@/lib/scoring";
import { exampleAnswer } from "@/lib/examples";
import { callClaude, extractJson, hasAI, SCORE_MODEL } from "@/lib/ai";
import { COACH_PERSONA, SCORING_RUBRIC, candidateBlock } from "@/lib/prompt";
import type { DimensionScores } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Minimal model contract: just the five scores plus the brief things to fix.
   No per-dimension paragraphs and no overall (we recompute it deterministically),
   so output stays tiny and cheap. The detailed per-dimension notes come from the
   local engine for free. */
interface AiScore {
  clarity: number;
  relevance: number;
  specificity: number;
  confidence: number;
  conciseness: number;
  strength?: string;
  improve?: string[];
}

const SYSTEM = `${COACH_PERSONA}

Score ONE interview answer on five dimensions, each an INTEGER 0 to 100, using the procedure below. Your output is read by software, so be terse: no paragraphs, no markdown, no extra keys.

1. clarity: easy to follow and well structured.
2. relevance: actually answers the question asked.
3. specificity: concrete examples, numbers, outcomes, not vague.
4. confidence: language projects confidence; penalize hedging, filler, apology, self-undermining.
5. conciseness: right length; too short is vague, too long rambles.

${SCORING_RUBRIC}

Return ONLY this minified JSON, nothing else:
{"clarity":N,"relevance":N,"specificity":N,"confidence":N,"conciseness":N,"strength":"...","improve":["...","..."]}

- The five scores are integers 0-100 from the rubric. Do NOT output an overall; it is computed for you.
- strength: ONE short sentence naming their strongest dimension, quoting their words when it helps.
- improve: 1 to 2 short, specific fixes, most valuable first, each under 18 words, tied to their role and weak area. No fluff, no preamble.`;

// Coerce whatever the model emits into a graph-safe integer in [0,100].
const clampScore = (n: unknown): number => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
};

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
      // Haiku + temperature 0: cheap, and the strict rubric (not the model tier)
      // is what makes the same answer grade the same way every session.
      // maxTokens kept low because the contract is just scores + brief fixes.
      const text = await callClaude({ model: SCORE_MODEL, system: SYSTEM, user, maxTokens: 320, temperature: 0 });
      const parsed = extractJson<AiScore>(text);
      if (parsed && parsed.clarity != null) {
        // Numbers: clamped to ints and overall recomputed server-side so the
        // graphs always get a clean, internally-consistent set.
        const dims: DimensionScores = {
          clarity: clampScore(parsed.clarity),
          relevance: clampScore(parsed.relevance),
          specificity: clampScore(parsed.specificity),
          confidence: clampScore(parsed.confidence),
          conciseness: clampScore(parsed.conciseness),
        };
        // Message: the brief fixes, normalized to clean strings.
        const improve = (Array.isArray(parsed.improve) ? parsed.improve : [])
          .filter((s) => typeof s === "string" && s.trim())
          .map((s) => s.trim())
          .slice(0, 2);
        return NextResponse.json({
          ...heuristic,
          scores: { ...dims, overall: computeOverall(dims) },
          // per-dimension notes come from the free deterministic engine
          feedback: heuristic.feedback,
          strengthSummary: (parsed.strength || "").trim() || heuristic.strengthSummary,
          growthSummary: improve.join(" ") || heuristic.growthSummary,
          improve, // brief, structured list of fixes for the UI / future graphs
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
