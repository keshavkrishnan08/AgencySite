import { rateLimit } from "@/lib/ratelimit";
import { recordUsage } from "@/lib/usage";
import { NextResponse } from "next/server";
import { callClaude, FAST_MODEL, extractJson, hasAI } from "@/lib/ai";
import { getJobBreakdown, classifyRole } from "@/lib/job-insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Dynamic job breakdown.
 *
 * For ANY role the user types, a cheap model (gpt-4o-mini when OpenAI is set,
 * else Haiku) generates a realistic breakdown: the interview process, the
 * competencies, hard/soft skills, a REAL US pay band for that exact role and
 * seniority, what interviewers look for, and red flags. No stock template, so a
 * CEO gets executive pay and a barista gets barista pay.
 *
 * Robustness: if there's no AI key or the response can't be parsed, we fall back
 * to the deterministic static family so the page always renders something sane. */

const SYSTEM = `You are a US labor-market and interview expert. Given a job title and seniority, produce a realistic, specific breakdown for THAT exact role. Base pay on real US market data for the role and seniority (a CEO earns executive pay; a barista earns hourly-equivalent pay). Never return generic placeholder numbers.

Return ONLY strict JSON, no prose, in exactly this shape:
{
  "label": "short role family name",
  "blurb": "one plain sentence on what this interview really tests",
  "process": [ { "name": "round name", "focus": "what it evaluates", "format": "how it runs" } ],
  "competencies": ["5 core competencies they screen for"],
  "hardSkills": ["4 concrete hard skills"],
  "softSkills": ["4 soft skills"],
  "salary": { "low": <entry USD/yr integer>, "mid": <median USD/yr integer>, "high": <senior USD/yr integer> },
  "lookFor": ["4 things a strong candidate shows"],
  "redFlags": ["4 things that sink a candidate"]
}
Rules: process has 3-4 rounds. Salary is annual USD integers, realistic for the role AND seniority, with low < mid < high. Plain words. No markdown, no comments, no trailing text.`;

interface AiBreakdown {
  label?: string;
  blurb?: string;
  process?: { name?: string; focus?: string; format?: string }[];
  competencies?: string[];
  hardSkills?: string[];
  softSkills?: string[];
  salary?: { low?: number; mid?: number; high?: number };
  lookFor?: string[];
  redFlags?: string[];
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const clampPay = (n: unknown, lo: number, hi: number, fb: number): number => {
  const v = typeof n === "number" && isFinite(n) ? Math.round(n) : fb;
  return Math.max(lo, Math.min(hi, v));
};

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
  const role = String(body?.role || "").slice(0, 120).trim();
  const seniority = String(body?.seniority || "").slice(0, 24).trim();
  if (!role) return NextResponse.json({ error: "No role" }, { status: 400 });

  // Deterministic fallback (also the shape we normalise the AI output toward).
  const fallback = getJobBreakdown(role, seniority);

  if (hasAI()) {
    try {
      const user = `Role: ${role}${seniority ? `\nSeniority: ${seniority}` : ""}\nReturn the JSON now.`;
      const text = await callClaude({
        model: FAST_MODEL,
        system: SYSTEM,
        user,
        maxTokens: 900,
        temperature: 0.3,
        seed: hash(`${role.toLowerCase()}|${seniority}`), // stable per role+seniority
      });
      const ai = extractJson<AiBreakdown>(text);
      if (ai && ai.salary && Array.isArray(ai.process) && ai.process.length) {
        let low = clampPay(ai.salary.low, 12000, 3_000_000, fallback.family.salary.low);
        let mid = clampPay(ai.salary.mid, 12000, 4_000_000, fallback.family.salary.mid);
        let high = clampPay(ai.salary.high, 12000, 6_000_000, fallback.family.salary.high);
        // enforce low <= mid <= high
        mid = Math.max(mid, low);
        high = Math.max(high, mid);

        const family = {
          key: classifyRole(role),
          label: (ai.label || fallback.family.label).slice(0, 60),
          blurb: (ai.blurb || fallback.family.blurb).slice(0, 220),
          process: ai.process
            .slice(0, 5)
            .map((r) => ({
              name: String(r?.name || "Interview").slice(0, 60),
              focus: String(r?.focus || "").slice(0, 160),
              format: String(r?.format || "").slice(0, 60),
            })),
          competencies: (ai.competencies || fallback.family.competencies).slice(0, 6).map((s) => String(s).slice(0, 60)),
          hardSkills: (ai.hardSkills || fallback.family.hardSkills).slice(0, 6).map((s) => String(s).slice(0, 60)),
          softSkills: (ai.softSkills || fallback.family.softSkills).slice(0, 6).map((s) => String(s).slice(0, 60)),
          salary: { low, mid, high },
          lookFor: (ai.lookFor || fallback.family.lookFor).slice(0, 6).map((s) => String(s).slice(0, 140)),
          redFlags: (ai.redFlags || fallback.family.redFlags).slice(0, 6).map((s) => String(s).slice(0, 140)),
          // focusTypes drives the practice handoff; keep the deterministic mapping.
          focusTypes: fallback.family.focusTypes,
        };
        return NextResponse.json({ role, family, source: "ai" });
      }
    } catch {
      /* fall through to static */
    }
  }

  return NextResponse.json({ role, family: fallback.family, source: "static" });
}
