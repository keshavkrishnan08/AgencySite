import { rateLimit } from "@/lib/ratelimit";
import { recordUsage } from "@/lib/usage";
import { NextResponse } from "next/server";
import { generateQuestions, generateFocusQuestions } from "@/lib/questions";
import { callClaude, extractJson, hasAI, FAST_MODEL } from "@/lib/ai";
import { COACH_PERSONA, candidateBlock } from "@/lib/prompt";
import type { Question } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `${COACH_PERSONA}

Your task: write exactly 8 interview questions a real hiring manager for THIS candidate's exact job would ask. Not generic interview questions.

Arc:
- Q1 to Q2: warmup, easy and confidence-building, like "tell me about yourself".
- Q3 to Q5: core behavioral, expecting STAR stories.
- Q6 to Q7: situation-specific, speaking straight to their situation (returning to work, laid off, promotion, or career change).
- Q8: closer, "what questions do you have for us?".

Personalize hard:
- If a company is given, name it naturally in the opener and closer.
- If a job posting is given, mine it for the real priorities (the exact skills and words they used, fast-paced, customer-facing, leadership, accuracy, targets) and make at least two behavioral questions probe those exact things.
- If a weak area is given, include one question that pushes on it.
- Calibrate difficulty to how long since they last interviewed. Ease in if it has been years.

Each question gets a short, practical, one-sentence tip.

Return ONLY valid minified JSON, no backticks:
{"questions":[{"number":1,"text":"...","category":"warmup|behavioral|gap|situation|closer","tip":"..."}]}`;

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
    situation = null,
    targetRole = "",
    interviewGap = "",
    seed = 0,
    focusDimension,
    company = "",
    posting = "",
    name = "",
    weakestDimension = "",
  } = body ?? {};

  if (focusDimension) {
    return NextResponse.json({
      questions: generateFocusQuestions(focusDimension, targetRole, seed),
      source: "heuristic",
    });
  }

  if (hasAI()) {
    try {
      const user = `${candidateBlock({ name, situation: situation || "", targetRole, company, interviewGap, posting, weakestDimension })}\n\nWrite their 8 questions now.`;
      const text = await callClaude({ model: FAST_MODEL, system: SYSTEM, user, maxTokens: 1100, temperature: 0.6 });
      const parsed = extractJson<{ questions: Question[] }>(text);
      if (parsed?.questions?.length) {
        const questions = parsed.questions.slice(0, 8).map((q, i) => ({
          number: i + 1,
          text: q.text,
          category: q.category || "behavioral",
          tip: q.tip || "",
        }));
        return NextResponse.json({ questions, source: "ai" });
      }
    } catch {
      /* fall through */
    }
  }

  return NextResponse.json({
    questions: generateQuestions(situation, targetRole, seed, { company, posting }),
    source: "heuristic",
  });
}
