import { rateLimit } from "@/lib/ratelimit";
import { NextResponse } from "next/server";
import { callClaude, extractJson, hasAI } from "@/lib/ai";
import { COACH_PERSONA } from "@/lib/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `${COACH_PERSONA}

Your task as the Company Research Briefing tool: given a company name and the candidate's role, produce a concise one-page briefing that helps them answer "Why do you want to work here?" and ask smart questions, written for someone in their exact role.

Return ONLY valid minified JSON:
{"whatTheyDo":"2-3 sentences, plain English","recentNews":["bullet","bullet","bullet"],"culture":["value/theme","value/theme","value/theme"],"roleFocus":["what this role likely cares about","...","..."],"questionsToAsk":["informed question","...","..."]}

If you are not certain about real recent news, give the kinds of developments to look for rather than inventing specifics. Keep everything practical and confident.\n\nWrite in plain words a 6th grader can read. Never use em dashes or en dashes; use a period, comma, or colon instead.`;

function fallback(company: string, role: string) {
  const c = company.trim() || "this company";
  const r = role.trim() || "this role";
  return {
    whatTheyDo: `${c} operates in its market by serving customers who rely on it for quality and consistency. Before your interview, read their homepage and "About" page so you can describe their mission in one plain sentence. Knowing their core product and who they serve is the single fastest way to sound prepared.`,
    recentNews: [
      `Check their LinkedIn and newsroom for anything from the last 6 months. A launch, a leadership change, an expansion, or a funding round.`,
      `Scan recent Glassdoor reviews to learn what current employees praise and complain about.`,
      `Look for any award, partnership, or press mention you can reference naturally in the interview.`,
    ],
    culture: [
      `Read their careers page. The values they list out loud are the ones they'll screen for.`,
      `Note the tone of their job posting (fast-paced, mission-driven, detail-oriented) and mirror it.`,
      `Find one value that genuinely resonates with you and be ready to give an example of living it.`,
    ],
    roleFocus: [
      `For a ${r}, expect them to care about reliability and how you handle competing priorities.`,
      `Be ready to show measurable impact from a past role. Numbers beat adjectives.`,
      `Prepare one story that proves you can ramp up quickly in a new environment.`,
    ],
    questionsToAsk: [
      `What does success look like in this ${r} role in the first 90 days?`,
      `How is the team changing or growing right now, and how would this role fit into that?`,
      `What's one thing someone in this role did recently that really impressed you?`,
    ],
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
  const { company = "", role = "" } = body ?? {};
  if (!company.trim()) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  if (hasAI()) {
    try {
      const user = `Company: ${company}\nRole the candidate is interviewing for: ${role || "unspecified"}`;
      const text = await callClaude({ system: SYSTEM, user, maxTokens: 900, temperature: 0.5 });
      const parsed = extractJson<any>(text);
      if (parsed?.whatTheyDo) {
        return NextResponse.json({ ...parsed, source: "ai" });
      }
    } catch {
      /* fall through */
    }
  }
  return NextResponse.json(fallback(company, role));
}
