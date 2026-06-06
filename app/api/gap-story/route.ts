import { NextResponse } from "next/server";
import { callClaude, extractJson, hasAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GAP_LABELS: Record<string, string> = {
  children: "raising children",
  layoff: "a layoff or eliminated position",
  career_change: "transitioning between careers",
  education: "going back to school or certification",
  health: "a health situation",
  personal: "personal reasons",
  other: "time away",
};

const SYSTEM = `You are PrepPath's Gap Story Builder, a warm coach for people with resume gaps (returning parents, the laid off, career changers). Write THREE versions of a 30-45 second spoken answer to "Can you tell me about the gap in your resume?"

Versions:
A "The Confident Pivot" — frames the gap as a deliberate, purposeful choice, then pivots to enthusiasm for the role.
B "The Honest & Brief" — acknowledges it plainly without overexplaining, pivots fast to the future.
C "The Growth Story" — emphasizes what they learned or did during the time.

Rules: warm, natural, spoken (not corporate). Never apologetic. Each 2-3 sentences. Tailor to the gap type, duration, and any activities given.

Return ONLY valid minified JSON:
{"versions":[{"label":"The Confident Pivot","text":"..."},{"label":"The Honest & Brief","text":"..."},{"label":"The Growth Story","text":"..."}]}`;

function fallback(gapType: string, duration: string, activities: string) {
  const reason = GAP_LABELS[gapType] || "time away";
  const did = activities.trim()
    ? ` During that time I ${activities.trim().replace(/\.$/, "")}, so I stayed sharp and engaged.`
    : "";
  return {
    versions: [
      {
        label: "The Confident Pivot",
        text: `I took ${duration} away from full-time work for ${reason} — it was a deliberate choice and I'd make it again.${did} Now I'm fully ready to bring that focus to this role, and honestly I'm more motivated than I've ever been.`,
      },
      {
        label: "The Honest & Brief",
        text: `Yes — I stepped away for ${duration} due to ${reason}. That chapter is complete, and what excites me now is exactly the kind of work this role involves.${did}`,
      },
      {
        label: "The Growth Story",
        text: `My ${duration} away was for ${reason}, and it taught me a lot about staying organized and resourceful under real pressure.${did} I'm bringing all of that with me, and I'm genuinely excited to get back to work I care about.`,
      },
    ],
    source: "heuristic" as const,
  };
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { gapType = "other", duration = "some time", activities = "", role = "" } = body ?? {};

  if (hasAI()) {
    try {
      const user = `Gap type: ${GAP_LABELS[gapType] || gapType}\nDuration: ${duration}\nWhat they did during the gap: ${activities || "not specified"}\nTarget role: ${role || "unspecified"}`;
      const text = await callClaude({ system: SYSTEM, user, maxTokens: 700, temperature: 0.6 });
      const parsed = extractJson<{ versions: { label: string; text: string }[] }>(text);
      if (parsed?.versions?.length) {
        return NextResponse.json({ versions: parsed.versions.slice(0, 3), source: "ai" });
      }
    } catch {
      /* fall through */
    }
  }
  return NextResponse.json(fallback(gapType, duration, activities));
}
