import { rateLimit } from "@/lib/ratelimit";
import { requirePremium } from "@/lib/entitlement";
import { recordUsage } from "@/lib/usage";
import { NextResponse } from "next/server";
import { callClaude, FAST_MODEL, hasAI, stripMd } from "@/lib/ai";
import { COACH_PERSONA, candidateBlock, EMPLOYER_REALISM, EMPLOYER_VOICE, ANTI_CANNED } from "@/lib/prompt";
import { CONTEXT_LEGEND } from "@/lib/context-codec";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `${COACH_PERSONA}

Right now you are role-playing a real hiring manager for the candidate's job, mid-interview. They just answered. React naturally to a specific detail they said, then ask ONE follow-up that digs into the part of the story that's still missing and tests whether it holds up.

${EMPLOYER_REALISM}

${EMPLOYER_VOICE}

${CONTEXT_LEGEND}
Use it to push where they're weakest and reference where they are in their prep, without ever reading the facts back to them.

${ANTI_CANNED} If their answer was empty or too vague to follow up on, say (in character) that you didn't quite catch a real example and ask them to give you one specific time it happened.

Write it like a real hiring manager would actually say it out loud: acknowledge, then probe. Two to three sentences is good. Return ONLY what you say to them, no preamble, no quotes, no labels.`;

const GENERIC = [
  "Okay, I like the direction of that. Walk me through what the hardest part was for you specifically, and how you worked through it.",
  "That's helpful. I'm curious how the other people involved reacted when you did that. Did anyone push back?",
  "Let me push on that a little. Looking back now, what's the one thing you'd do differently if it came up again?",
  "Good. And what did you actually take away from that, something you still carry into how you work today?",
  "I hear you. Help me understand how you knew your approach was actually working, not just keeping busy.",
];

function fallback(answer: string): string {
  const a = answer.toLowerCase();
  if (/team|coworker|colleague|manager|client|customer/.test(a))
    return "Okay, thanks for that. I want to make sure I understand your piece of it: when you did that, how did the other people involved actually respond?";
  if (/result|increase|reduce|saved|improved|\d/.test(a))
    return "That's a solid result. Help me understand how you measured it, and how confident you are in that number.";
  if (/learn|mistake|fail|wrong|difficult|hard/.test(a))
    return "I appreciate you being honest about that. What did you take away from it, and how has it changed the way you work since?";
  const idx = Math.abs(answer.length) % GENERIC.length;
  return GENERIC[idx];
}

export async function POST(req: Request) {
  const limited = await rateLimit(req);
  if (limited) return limited;
  const gate = await requirePremium(req);
  if (gate) return gate;
  recordUsage(req);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { question = "", answer = "", targetRole = "", company = "", situation = "", interviewGap = "", context = "" } = body ?? {};
  if (!answer || answer.trim().length < 10) {
    return NextResponse.json({ followUp: fallback(answer || ""), source: "heuristic" });
  }

  if (hasAI()) {
    try {
      const ctx = candidateBlock({ situation, targetRole, company, interviewGap });
      const mega = typeof context === "string" && context.trim() ? `\n\nCandidate context: ${context.slice(0, 1200)}` : "";
      const user = `${ctx}${mega}\n\nQuestion asked: ${question}\nTheir answer: "${answer.slice(0, 2000)}"`;
      const text = await callClaude({ model: FAST_MODEL, system: SYSTEM, user, maxTokens: 220, temperature: 0.7 });
      const cleaned = stripMd(text.trim().replace(/^["']|["']$/g, ""));
      if (cleaned.length > 8) return NextResponse.json({ followUp: cleaned, source: "ai" });
    } catch {
      /* fall through */
    }
  }
  return NextResponse.json({ followUp: fallback(answer), source: "heuristic" });
}
