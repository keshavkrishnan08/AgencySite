import { rateLimit } from "@/lib/ratelimit";
import { recordUsage } from "@/lib/usage";
import { NextResponse } from "next/server";
import { callClaude, extractJson, hasAI, FAST_MODEL } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Weekly career insights for the dashboard. Deliberately CHEAP:
 *   - Haiku, ~300 tokens out, one terse prompt.
 *   - The client caches the result per ISO week per role, so this fires about
 *     once a week per user, not per page load.
 *   - Evergreen guidance only. The model has no live web, so it is told NOT to
 *     invent news or dates; we frame everything as general outlook, not headlines.
 * Falls back to a static per-field synopsis when AI is unavailable. */

// Minimal system prompt — every token here is paid on every (cache-missed) call.
const SYSTEM =
  "You are a concise labor-market analyst for job seekers. Reply with ONLY minified JSON, no prose, no code fences. Never invent news, headlines, dates, or statistics you're unsure of — give evergreen guidance.";

interface Insights {
  market: string;
  skills: string[];
  outlook: string;
  tip: string;
  salary: string;
  channels: string[];
  actions: string[];
}

const FALLBACK_SKILLS: Record<string, string[]> = {
  healthcare: ["patient communication", "EHR systems", "compliance", "teamwork under pressure"],
  tech: ["cloud fundamentals", "system design", "data literacy", "clear async communication"],
  finance: ["financial modeling", "risk analysis", "Excel/SQL", "regulatory awareness"],
  education: ["classroom management", "curriculum design", "data-driven instruction", "family communication"],
  sales: ["pipeline management", "discovery questioning", "CRM fluency", "objection handling"],
  operations: ["process improvement", "data analysis", "vendor management", "cross-team coordination"],
  retail: ["customer service", "inventory basics", "upselling", "conflict de-escalation"],
  default: ["clear communication", "problem-solving", "reliability", "adaptability"],
};

function fallback(role: string, industry: string): Insights {
  const key = (industry || "").toLowerCase();
  const skills = FALLBACK_SKILLS[key] || FALLBACK_SKILLS.default;
  const r = role || "this role";
  return {
    market: `Hiring for ${r} stays competitive: strong candidates still get calls, but the bar on communicating impact is higher than a couple of years ago.`,
    skills,
    outlook: `Demand is steady — employers are selective, so a sharp, specific interview is what separates finalists.`,
    tip: `Lead every answer with the result, then the number. It's the fastest way to sound senior for ${r}.`,
    salary: `Pay for ${r} varies widely by location and employer — research the range for your city before you name a number.`,
    channels: ["Referrals from your network", "Company career pages directly", "A focused niche job board for your field"],
    actions: ["Apply to 5 roles that fit", "Reach out to 2 people in your network", "Run 3 practice sessions"],
  };
}

export async function POST(req: Request) {
  const limited = await rateLimit(req);
  if (limited) return limited;
  recordUsage(req);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* defaults */
  }
  const role = String(body?.role || "").slice(0, 80) || "job seeker";
  const industry = String(body?.industry || "").slice(0, 40);

  if (!hasAI()) {
    return NextResponse.json({ insights: fallback(role, industry), source: "heuristic" });
  }

  try {
    // Terse user prompt: role + field, then the exact JSON shape wanted.
    const user =
      `Role: ${role}${industry ? `. Field: ${industry}` : ""}.\n` +
      `JSON keys: market (2 tight sentences on demand and competition for this role), ` +
      `skills (array of 4 short in-demand skills/keywords), ` +
      `outlook (1 sentence: is hiring up, steady, or tight, and why), ` +
      `tip (1 specific interview-prep tip for this field), ` +
      `salary (1 sentence rough pay guidance, say it varies by location, no false precision), ` +
      `channels (array of 3 best places to find these jobs), ` +
      `actions (array of 3 concrete job-search actions to do this week).`;
    const text = await callClaude({ model: FAST_MODEL, system: SYSTEM, user, maxTokens: 420, temperature: 0.5 });
    const parsed = extractJson<Insights>(text);
    if (parsed?.market && Array.isArray(parsed.skills)) {
      const arr = (v: unknown, n: number) =>
        Array.isArray(v) ? v.slice(0, n).map((s) => String(s).slice(0, 60)) : [];
      const fb = fallback(role, industry);
      return NextResponse.json({
        insights: {
          market: String(parsed.market).slice(0, 400),
          skills: arr(parsed.skills, 5),
          outlook: String(parsed.outlook || "").slice(0, 240),
          tip: String(parsed.tip || "").slice(0, 240),
          salary: String(parsed.salary || fb.salary).slice(0, 240),
          channels: arr(parsed.channels, 3).length ? arr(parsed.channels, 3) : fb.channels,
          actions: arr(parsed.actions, 3).length ? arr(parsed.actions, 3) : fb.actions,
        },
        source: "ai",
      });
    }
  } catch {
    /* fall through */
  }
  return NextResponse.json({ insights: fallback(role, industry), source: "heuristic" });
}
