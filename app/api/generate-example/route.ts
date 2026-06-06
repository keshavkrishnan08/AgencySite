import { NextResponse } from "next/server";
import { exampleAnswer } from "@/lib/examples";
import { callClaude, hasAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are PrepPath, an interview coach. Write ONE strong example answer to the interview question, tailored to the candidate's role. Use the STAR method where it fits. Keep it natural and spoken (not corporate), 110-180 words. Return only the answer text. No preamble, no quotes, no labels.\n\nWrite in plain words a 6th grader can read. Never use em dashes or en dashes; use a period, comma, or colon instead.`;

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { question = "", targetRole = "", category = "behavioral" } = body ?? {};

  if (hasAI()) {
    try {
      const user = `Question: ${question}\nRole: ${targetRole || "general professional"}`;
      const text = await callClaude({ system: SYSTEM, user, maxTokens: 360, temperature: 0.6 });
      if (text.trim().length > 40) {
        return NextResponse.json({ example: text.trim(), source: "ai" });
      }
    } catch {
      /* fall through */
    }
  }
  return NextResponse.json({
    example: exampleAnswer(question, targetRole, category),
    source: "heuristic",
  });
}
