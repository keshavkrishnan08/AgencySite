import { rateLimit } from "@/lib/ratelimit";
import { NextResponse } from "next/server";
import { analyzeAnxiety } from "@/lib/scoring";
import { callClaude, extractJson, hasAI } from "@/lib/ai";
import { COACH_PERSONA } from "@/lib/prompt";
import { clamp } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `${COACH_PERSONA}

Now you are role-playing a fair but firm hiring manager in a multi-round salary negotiation for the candidate's job. Evaluate the candidate's latest message, then deliver your next line as the hiring manager.

Score the candidate's turn 0-100 on: confidence, specificity (did they justify with data/value?), composure (did they hold or fold?).

Return ONLY valid minified JSON:
{"confidence":N,"specificity":N,"composure":N,"feedback":"one warm, specific coaching sentence","interviewerLine":"your next line as the hiring manager","accepted":false}
Set accepted=true only if the negotiation has reached a fair agreement.\n\nWrite in plain words a 6th grader can read. Never use em dashes or en dashes; use a period, comma, or colon instead.`;

const LINES = [
  "What are your salary expectations for this role?",
  "That's a bit above the range we had budgeted. We were thinking closer to the lower end. Could that work?",
  "We might be able to get there with a signing bonus instead of base. How does that sound?",
  "Okay. Here's our best and final: let's meet in the middle on base plus the bonus. Do we have a deal?",
];

function heuristic(round: number, message: string, target: number) {
  const anx = analyzeAnxiety(message);
  const hasNumber = /\$?\s?\d{2,3}[,.]?\d{0,3}/.test(message);
  const hasData = /(market|research|industry|average|data|comparable|glassdoor|based on|experience|value)/i.test(message);
  const folded = /(okay fine|that works|i'll take|whatever you|i guess that's|sure, that)/i.test(message);

  const confidence = clamp(78 - anx.total * 6 - (folded ? 22 : 0) + (hasNumber ? 8 : -10));
  const specificity = clamp(46 + (hasNumber ? 24 : 0) + (hasData ? 24 : 0));
  const composure = clamp(82 - (folded ? 34 : 0) - anx.hedgeCount * 7);

  let feedback: string;
  if (folded) feedback = "You folded a little fast. It's okay to hold. Try: 'I understand budget constraints. Based on my experience I think the target is fair. Are there other components we could flex?'";
  else if (!hasNumber && round === 0) feedback = "Name a specific number (or tight range) anchored high. A vague answer hands them the pen.";
  else if (!hasData) feedback = "Good stance. Now justify it. Tie your number to market data or the specific value you bring.";
  else feedback = "Strong: you held your number and backed it with a reason. That's exactly how this should sound.";

  return {
    confidence,
    specificity,
    composure,
    feedback,
    interviewerLine: LINES[Math.min(round + 1, LINES.length - 1)],
    accepted: round >= 3,
    source: "heuristic" as const,
  };
}

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { round = 0, message = "", target = 0, walkaway = 0, range = "", role = "" } = body ?? {};

  // Round 0 with no message: just return the opening line.
  if (round === 0 && !message.trim()) {
    return NextResponse.json({ interviewerLine: LINES[0], opening: true });
  }

  if (hasAI() && message.trim()) {
    try {
      const user = `Round: ${round + 1} of 4\nRole: ${role}\nMarket range: ${range}\nCandidate target: ${target}\nCandidate walkaway: ${walkaway}\n\nCandidate's latest message: "${message.slice(0, 1500)}"`;
      const text = await callClaude({ system: SYSTEM, user, maxTokens: 400, temperature: 0.5 });
      const parsed = extractJson<any>(text);
      if (parsed && typeof parsed.confidence === "number") {
        return NextResponse.json({ ...parsed, source: "ai" });
      }
    } catch {
      /* fall through */
    }
  }
  return NextResponse.json(heuristic(round, message, target));
}
