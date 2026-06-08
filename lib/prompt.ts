/* Shared pre-prompting. The persona and rubric are stable (so they cache),
   and candidateBlock() injects the specific person into the USER turn so every
   answer is custom to their role, situation, company, gap, and weak spots. */

import type { Dimension } from "./types";

export const COACH_PERSONA = `You are Axon Careers, a warm and sharp interview coach for non-tech professionals, usually 28 to 55 years old. Your people are returning to work after time away, recently laid off, going for a promotion, or switching careers. Many are anxious and have not interviewed in years. You are encouraging and specific, never harsh and never generic.

How you always work:
- Use the candidate details you are given. Tailor every word to their exact role, situation, company, gap, and history. A generic answer is a failure.
- Coach like a real hiring manager for THEIR job would, not for interviews in general.
- Lead with what they did well, then give one specific, doable fix.
- Plain words a 6th grader can read. Short sentences. Warm, human, direct.
- Never use em dashes or en dashes. Use a period, comma, or colon.`;

export const SCORING_RUBRIC = `Score each dimension 0 to 100 with these anchors so scores stay consistent:
- 90 to 100: a hiring manager would be impressed.
- 70 to 89: solid, would pass.
- 50 to 69: okay but clearly improvable.
- 30 to 49: weak, would hurt them.
- 0 to 29: missing, vague, or off topic.
If the candidate has a known weak area, judge it honestly and connect your fix to it.`;

const SITUATION_LABEL: Record<string, string> = {
  returning: "returning to work after time away",
  laid_off: "recently laid off or between jobs",
  promotion: "going for a promotion or a bigger role",
  career_change: "changing careers or industries",
};

const GAP_LABEL: Record<string, string> = {
  "<1yr": "less than a year ago",
  "1-3yr": "1 to 3 years ago",
  "3-5yr": "3 to 5 years ago",
  "5+yr": "5 or more years ago",
};

export interface CandidateContext {
  name?: string;
  situation?: string;
  targetRole?: string;
  company?: string;
  interviewGap?: string;
  posting?: string;
  weakestDimension?: Dimension | string;
  recentAverage?: number;
  sessionsDone?: number;
}

/** Render the known facts about this candidate as a context block for the user turn. */
export function candidateBlock(ctx: CandidateContext): string {
  const lines: string[] = [];
  if (ctx.name) lines.push(`- Name: ${ctx.name}`);
  if (ctx.situation) lines.push(`- Situation: ${SITUATION_LABEL[ctx.situation] || ctx.situation}`);
  if (ctx.targetRole) lines.push(`- Target role: ${ctx.targetRole}`);
  if (ctx.company) lines.push(`- Interviewing at: ${ctx.company}`);
  if (ctx.interviewGap) lines.push(`- Last interviewed: ${GAP_LABEL[ctx.interviewGap] || ctx.interviewGap}`);
  if (ctx.weakestDimension) {
    const dim = String(ctx.weakestDimension);
    const label = dim.charAt(0).toUpperCase() + dim.slice(1);
    lines.push(
      `- Weakest area so far: ${label}${ctx.recentAverage ? ` (recent average ${ctx.recentAverage}/100)` : ""}. Push them here.`
    );
  } else if (ctx.recentAverage) {
    lines.push(`- Recent average score: ${ctx.recentAverage}/100`);
  }
  if (ctx.sessionsDone && ctx.sessionsDone > 0) lines.push(`- Sessions practiced: ${ctx.sessionsDone}`);
  if (ctx.posting) lines.push(`- Job posting (excerpt):\n"""${String(ctx.posting).slice(0, 4000)}"""`);

  if (!lines.length) return "";
  return `## Candidate\n${lines.join("\n")}\nTailor everything to this exact person.`;
}
