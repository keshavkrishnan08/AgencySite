import { NextResponse } from "next/server";
import { callClaude, hasAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are PrepPath playing a warm but sharp hiring manager in a live interview. The candidate just answered a question. Ask ONE natural follow-up that probes deeper into what they actually said — the kind a real interviewer asks to test if the story holds up ("how did they react?", "what would you do differently?", "what was the hardest part?"). Reference a specific detail from their answer. Keep it to one sentence, conversational. Return ONLY the question text — no preamble, no quotes.`;

const GENERIC = [
  "What was the hardest part of that situation for you?",
  "How did the other people involved react?",
  "Looking back, what would you do differently?",
  "What did you learn from that you still use today?",
  "How did you know your approach was actually working?",
  "What would have happened if that hadn't worked?",
];

function fallback(answer: string): string {
  const a = answer.toLowerCase();
  if (/team|coworker|colleague|manager|client|customer/.test(a))
    return "How did the other people involved respond when you did that?";
  if (/result|increase|reduce|saved|improved|\d/.test(a))
    return "How did you measure that result, and how confident are you in the number?";
  if (/learn|mistake|fail|wrong|difficult|hard/.test(a))
    return "What did you take away from that, and how has it changed how you work?";
  const idx = Math.abs(answer.length) % GENERIC.length;
  return GENERIC[idx];
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { question = "", answer = "", targetRole = "", company = "" } = body ?? {};
  if (!answer || answer.trim().length < 10) {
    return NextResponse.json({ followUp: fallback(answer || ""), source: "heuristic" });
  }

  if (hasAI()) {
    try {
      const user = `Role: ${targetRole || "unspecified"}${company ? ` at ${company}` : ""}\nQuestion asked: ${question}\nTheir answer: "${answer.slice(0, 2000)}"`;
      const text = await callClaude({ system: SYSTEM, user, maxTokens: 120, temperature: 0.6 });
      const cleaned = text.trim().replace(/^["']|["']$/g, "");
      if (cleaned.length > 8) return NextResponse.json({ followUp: cleaned, source: "ai" });
    } catch {
      /* fall through */
    }
  }
  return NextResponse.json({ followUp: fallback(answer), source: "heuristic" });
}
