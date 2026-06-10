import { rateLimit } from "@/lib/ratelimit";
import { recordUsage } from "@/lib/usage";
import { NextResponse } from "next/server";
import { callClaude, FAST_MODEL, hasAI } from "@/lib/ai";
import { COACH_PERSONA, candidateBlock, EMPLOYER_REALISM, ANTI_CANNED } from "@/lib/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `${COACH_PERSONA}

Right now you are role-playing a real hiring manager for the candidate's job, mid-interview. They just answered. Ask ONE natural follow-up that digs into what they actually said and tests whether the story holds up.

${EMPLOYER_REALISM}

${ANTI_CANNED} If their answer was empty or too vague to follow up on, say (in character) that you didn't quite catch a real example and ask them to give you one specific time it happened.

Reference a specific detail from their answer and fit it to their role and company. One sentence, conversational. Return ONLY the question text, no preamble, no quotes.`;

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
  const limited = await rateLimit(req);
  if (limited) return limited;
  recordUsage(req);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { question = "", answer = "", targetRole = "", company = "", situation = "", interviewGap = "" } = body ?? {};
  if (!answer || answer.trim().length < 10) {
    return NextResponse.json({ followUp: fallback(answer || ""), source: "heuristic" });
  }

  if (hasAI()) {
    try {
      const ctx = candidateBlock({ situation, targetRole, company, interviewGap });
      const user = `${ctx}\n\nQuestion asked: ${question}\nTheir answer: "${answer.slice(0, 2000)}"`;
      const text = await callClaude({ model: FAST_MODEL, system: SYSTEM, user, maxTokens: 120, temperature: 0.6 });
      const cleaned = text.trim().replace(/^["']|["']$/g, "");
      if (cleaned.length > 8) return NextResponse.json({ followUp: cleaned, source: "ai" });
    } catch {
      /* fall through */
    }
  }
  return NextResponse.json({ followUp: fallback(answer), source: "heuristic" });
}
