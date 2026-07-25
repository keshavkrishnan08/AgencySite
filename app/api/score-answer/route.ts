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
- strength: ONE short sentence naming their strongest dimension, and QUOTE the exact words from their answer that earned it.
- improve: 1 to 2 concrete fixes, most valuable first, each under 18 words. Each fix must reference something specific in THEIR answer (a phrase they said, a missing number, a vague line) so it is actionable, never a generic tip. No fluff, no preamble.

CRITICAL FOR CONSISTENCY: grade the answer purely on its own merits against the rubric. The candidate's recent average, weak area, and session count are context for tailoring your feedback ONLY — never raise or lower the scores because of them. The same answer must always earn the same scores.`;

// Coerce whatever the model emits into a graph-safe integer in [0,100].
const clampScore = (n: unknown): number => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
};

/* Content-addressed cache: identical scoring inputs return the identical result,
   so the same answer ALWAYS grades the same way (LLMs aren't bit-deterministic
   even at temp 0). Also saves cost on repeats. Module-level, capped. */
interface AiScored { scores: DimensionScores & { overall: number }; strengthSummary: string; growthSummary: string; improve: string[] }
const scoreCache = new Map<string, AiScored>();
const SCORE_CACHE_MAX = 1000;
const hashKey = (s: string): string => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return String(h); };

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
    lengthTarget = "",
    focusDimension = "",
    domain = "",
  } = body ?? {};

  // The answer length the candidate is aiming for (set in the Session Builder).
  // Feeds the conciseness judgment so a deliberately short answer isn't dinged
  // for being short — and a rambling one is, against the band they chose.
  const LENGTH_HINT: Record<string, string> = {
    short: "\nThey are aiming for a SHORT answer (about 40-80 words). Reward tight, punchy answers; only flag conciseness if they ramble well past that.",
    medium: "\nThey are aiming for a MEDIUM answer (about 60-150 words).",
    long: "\nThey are aiming for a LONGER, detailed answer (about 120-220 words). Don't penalise length here as long as it stays on point.",
  };
  const lengthLine = LENGTH_HINT[String(lengthTarget)] || "";

  // Focus the FEEDBACK (never the scores) on what this specific practice was
  // about: a dimension drill, or a non-interview domain like storytelling or
  // public speaking. Scores still come from the same rubric so they stay
  // comparable; only the one fix and the strength line are re-pointed.
  const DIM_LABEL: Record<string, string> = {
    clarity: "Clarity", relevance: "Relevance", specificity: "Specificity",
    confidence: "Confidence", conciseness: "Conciseness",
  };
  const focusLabel = DIM_LABEL[String(focusDimension)] || "";
  const focusLine = focusLabel
    ? `\nThis is a FOCUSED DRILL on ${focusLabel}. Make your one fix specifically about ${focusLabel}, and quote the exact words that helped or hurt it.`
    : "";
  const DOMAIN_LINE: Record<string, string> = {
    storytelling: "\nThis is a STORYTELLING practice, not a job interview. Judge it as a story: a clear arc (setup, tension, turn, resolution), vivid concrete detail, and a point that lands. Center the fix on the storytelling craft.",
    public_speaking: "\nThis is a PUBLIC SPEAKING practice, not a job interview. Judge it as a spoken talk: a strong open, one clear message, signposting, and a memorable close. Center the fix on delivery and structure for an audience.",
  };
  const domainLine = DOMAIN_LINE[String(domain)] || "";

  if (typeof answer !== "string" || answer.trim().length === 0) {
    return NextResponse.json({ error: "Empty answer" }, { status: 400 });
  }

  // Heuristic is always computed: it powers the offline path AND provides
  // exact anxiety (filler/hedging) detection even when Claude does the scoring.
  const heuristic = scoreAnswer({ question, answer, targetRole, category, questionNumber });
  const example = withExample ? exampleAnswer(question, targetRole, category) : "";

  // Key ONLY on the answer's own merits (question + answer + role + situation +
  // category) — NOT on the candidate's history. So the same answer earns the same
  // grade in every session, regardless of their averages. Comparison to past
  // performance is layered on separately (deterministically) by the UI.
  const cacheKey = hashKey([question, answer, targetRole, situation, category, lengthTarget, focusDimension, domain].join("||"));
  const cached = scoreCache.get(cacheKey);
  if (cached) {
    return NextResponse.json({
      ...heuristic, scores: cached.scores, feedback: heuristic.feedback,
      strengthSummary: cached.strengthSummary, growthSummary: cached.growthSummary,
      improve: cached.improve, anxiety: heuristic.anxiety, exampleAnswer: example, source: "ai",
    });
  }

  if (hasAI()) {
    try {
      const ctx = candidateBlock({ name, situation, targetRole, company, interviewGap, weakestDimension, recentAverage });
      const user = `${ctx}${lengthLine}${focusLine}${domainLine}\n\nQuestion (${category}): ${question}\n\nTheir answer:\n"""${answer.slice(0, 4000)}"""`;
      // Haiku + temperature 0: cheap, and the strict rubric (not the model tier)
      // is what makes the same answer grade the same way every session.
      // maxTokens kept low because the contract is just scores + brief fixes.
      // temperature 0 + fixed seed => the same answer grades the same way every time.
      const text = await callClaude({ model: SCORE_MODEL, system: SYSTEM, user, maxTokens: 320, temperature: 0, seed: 7 });
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
        const aiResult: AiScored = {
          scores: { ...dims, overall: computeOverall(dims) },
          strengthSummary: (parsed.strength || "").trim() || heuristic.strengthSummary,
          growthSummary: improve.join(" ") || heuristic.growthSummary,
          improve,
        };
        // store for deterministic repeats (evict oldest if full)
        if (scoreCache.size >= SCORE_CACHE_MAX) scoreCache.delete(scoreCache.keys().next().value as string);
        scoreCache.set(cacheKey, aiResult);
        return NextResponse.json({
          ...heuristic,
          ...aiResult,
          feedback: heuristic.feedback, // per-dimension notes from the deterministic engine
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
