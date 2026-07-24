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
    sessionCount = 0,
    avoid = [],
    focusTypes = [],
    difficulty = "standard",
    count = 8,
  } = body ?? {};

  // Clamp the requested question count to a sane range.
  const n = Math.max(4, Math.min(12, Number(count) || 8));
  // Human labels for the requested categories, fed into the prompt.
  const TYPE_LABEL: Record<string, string> = {
    warmup: "warm-up / 'tell me about yourself'",
    behavioral: "behavioral 'tell me about a time' questions",
    situation: "situational / hypothetical scenarios",
    gap: "questions about their résumé gap or career change",
    closer: "closing questions and 'do you have questions for us'",
    leadership: "leadership and conflict questions",
  };
  const wantedTypes: string[] = Array.isArray(focusTypes)
    ? focusTypes.filter((t: unknown) => typeof t === "string" && TYPE_LABEL[t as string])
    : [];
  const diffLine =
    difficulty === "easy"
      ? "\nKeep the difficulty gentle and encouraging — this person is easing back in."
      : difficulty === "hard"
      ? "\nMake these HARD: pointed follow-up-style questions, curveballs, and pressure that a tough panel would use."
      : "";
  const typeLine = wantedTypes.length
    ? `\nEmphasise these question types: ${wantedTypes.map((t) => TYPE_LABEL[t]).join("; ")}. Weight the set toward them.`
    : "";

  if (focusDimension) {
    return NextResponse.json({
      questions: generateFocusQuestions(focusDimension, targetRole, seed),
      source: "heuristic",
    });
  }

  if (hasAI()) {
    try {
      const avoidList: string[] = Array.isArray(avoid) ? avoid.filter((s: unknown) => typeof s === "string" && s).slice(0, 12) : [];
      const variety =
        `\n\nThis is practice session #${(Number(sessionCount) || 0) + 1}. Make this set FRESH: vary the wording, scenarios, and angles so it does not feel like a repeat of earlier sessions.` +
        (avoidList.length ? `\nDo NOT reuse or lightly reword any of these already-asked questions:\n- ${avoidList.join("\n- ")}` : "");
      const user = `${candidateBlock({ name, situation: situation || "", targetRole, company, interviewGap, posting, weakestDimension })}${variety}${typeLine}${diffLine}\n\nWrite their ${n} questions now.`;
      // Higher temperature than scoring: for questions, variety matters more than determinism.
      const text = await callClaude({ model: FAST_MODEL, system: SYSTEM, user, maxTokens: 1100, temperature: 0.85 });
      const parsed = extractJson<{ questions: Question[] }>(text);
      if (parsed?.questions?.length) {
        const questions = parsed.questions.slice(0, n).map((q, i) => ({
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

  // Heuristic fallback: honour the requested count and type emphasis as best a
  // static bank can. Filter to wanted categories first, then top up to n.
  let hq = generateQuestions(situation, targetRole, seed, { company, posting });
  if (wantedTypes.length) {
    const wanted = new Set(wantedTypes);
    const matched = hq.filter((q) => wanted.has(q.category));
    const rest = hq.filter((q) => !wanted.has(q.category));
    hq = [...matched, ...rest];
  }
  hq = hq.slice(0, n).map((q, i) => ({ ...q, number: i + 1 }));
  return NextResponse.json({ questions: hq, source: "heuristic" });
}
