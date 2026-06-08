import { rateLimit } from "@/lib/ratelimit";
import { NextResponse } from "next/server";
import { exampleAnswer } from "@/lib/examples";
import { callClaude, FAST_MODEL, hasAI } from "@/lib/ai";
import { COACH_PERSONA, candidateBlock } from "@/lib/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `${COACH_PERSONA}

Your task: write ONE strong example answer to the interview question, in the candidate's own likely voice for their exact role and situation. Use STAR where it fits. Natural and spoken, not corporate, 110 to 180 words. Make it realistic for someone in their shoes, not a polished executive. Return only the answer text, no preamble, no quotes, no labels.`;

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { question = "", targetRole = "", category = "behavioral", situation = "", company = "" } = body ?? {};

  if (hasAI()) {
    try {
      const user = `${candidateBlock({ situation, targetRole, company })}\n\nQuestion: ${question}`;
      const text = await callClaude({ model: FAST_MODEL, system: SYSTEM, user, maxTokens: 360, temperature: 0.6 });
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
