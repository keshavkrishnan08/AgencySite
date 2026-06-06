import { NextResponse } from "next/server";
import { generateQuestions, generateFocusQuestions } from "@/lib/questions";
import { callClaude, extractJson, hasAI } from "@/lib/ai";
import type { Question } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are PrepPath, an interview coach for non-tech professionals.
Generate exactly 8 realistic interview questions for the given role and candidate.

Follow this arc:
- Q1-2: Warmup (easy, confidence-building, e.g. "tell me about yourself")
- Q3-5: Core behavioral (STAR-format expected)
- Q6-7: Situation-specific — directly address the candidate's situation (returning to work / laid off / promotion / career change)
- Q8: Closer ("what questions do you have for us?")

For each question include a short, practical tip (1 sentence).

Return ONLY valid minified JSON, no backticks:
{"questions":[{"number":1,"text":"...","category":"warmup|behavioral|gap|situation|closer","tip":"..."}]}`;

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { situation = null, targetRole = "", interviewGap = "", seed = 0, focusDimension } = body ?? {};

  if (focusDimension) {
    return NextResponse.json({
      questions: generateFocusQuestions(focusDimension, targetRole, seed),
      source: "heuristic",
    });
  }

  if (hasAI()) {
    try {
      const user = `Role: ${targetRole || "general professional"}\nSituation: ${situation || "unspecified"}\nTime since last interview: ${interviewGap || "unspecified"}`;
      const text = await callClaude({ system: SYSTEM, user, maxTokens: 1100, temperature: 0.6 });
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
    questions: generateQuestions(situation, targetRole, seed),
    source: "heuristic",
  });
}
