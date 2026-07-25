/* ===========================================================================
 * The mega context layer — codec.
 *
 * One job: turn everything the product knows about a person into the smallest
 * possible blob the model can still read perfectly. This is the token-efficient
 * "operating system" layer. It is PURE (no browser, no server APIs) so both the
 * client builder and the API routes can import it.
 *
 * How the compression works
 * -------------------------
 * Every field is labelled with ONE Chinese glyph instead of an English phrase.
 * "recent readiness score" is 4-5 tokens; 均 is exactly one. The VALUES stay in
 * plain English (a name, a role, a company) because they carry real information
 * and are usually one token anyway. So a full profile that would cost ~250
 * tokens as prose lands in ~60.
 *
 * The model isn't expected to guess the glyphs. CONTEXT_LEGEND is a one-time key
 * that rides in the (cached) system prompt. After that, every per-request
 * context is the compact 符 line. The legend is paid for once and amortised over
 * every scoring call, follow-up, and chat message for the life of the cache.
 *
 * Output back to the user is always English — the glyphs never leave the prompt.
 * ======================================================================== */

export interface UserContext {
  name?: string;
  situation?: string | null;
  targetRole?: string;
  company?: string;
  interviewGap?: string | null;
  interviewDate?: string | null;

  // progress
  sessions?: number;
  cadence?: number; // sessions/week
  streak?: number;
  longestStreak?: number;
  readiness?: number; // recent average /100
  firstScore?: number;
  bestScore?: number;
  improvement?: number;
  pace?: number; // points/session

  // skills
  strongest?: string;
  weakest?: string;
  dims?: { clarity: number; relevance: number; specificity: number; confidence: number; conciseness: number };
  anxietyPer100?: number;

  // delivery / speech
  wpm?: number;
  avgAnswerSeconds?: number;

  // volume
  questionsAnswered?: number;
  wordsSpoken?: number;
  nextMilestone?: string;

  // preferences
  domain?: string;
  difficulty?: string;
  framework?: string;
  coachTone?: string;

  // role intelligence (non-AI, from job-insights)
  roleFamily?: string;
  competencies?: string[];
  payBand?: string;

  // tool artifacts + recency
  predicted?: { company?: string; role?: string; count: number } | null;
  gapStory?: { type: string; length: string } | null;
  recent?: { role: string; score: number }[];
}

/* The glyph for each field. Chosen so the character hints at its meaning, which
   helps the model keep them straight even before it reads the legend. */
const G = {
  name: "名",
  situation: "势",
  role: "角",
  company: "司",
  gap: "隙",
  date: "志",
  sessions: "试",
  cadence: "频",
  streak: "连",
  longest: "顶",
  readiness: "均",
  first: "始",
  best: "巅",
  improvement: "增",
  pace: "速",
  strongest: "强",
  weakest: "弱",
  dims: "维",
  anxiety: "紧",
  wpm: "语",
  answerSec: "秒",
  questions: "问",
  words: "词",
  milestone: "里",
  domain: "域",
  difficulty: "难",
  framework: "架",
  coach: "调",
  family: "岗",
  competencies: "能",
  pay: "薪",
  predicted: "预",
  gapStory: "事",
  recent: "近",
} as const;

/* The one-time decoder key. Sits in the system prompt (cached). Keep it terse —
   it is itself tokens — but unambiguous. */
export const CONTEXT_LEGEND = `You are given a compact context line about the candidate. Each glyph labels one field; the value follows it, fields split by " · ". Read it as facts about this exact person and tailor everything to them. Never echo the glyphs back — always speak in plain English.
KEY: 名 name · 势 situation · 角 target role · 司 employer · 隙 years since last interview · 志 interview date · 试 sessions done · 频 sessions per week · 连 current day streak · 顶 longest streak · 均 readiness score /100 · 始 first score · 巅 best score · 增 net points gained · 速 points gained per session · 强 strongest skill · 弱 weakest skill (coach here hardest) · 维 skill scores as clarity/relevance/specificity/confidence/conciseness · 紧 nervous tells per 100 words (fillers, hedges, apologies) · 语 speaking pace in words per minute · 秒 average seconds per answer · 问 questions answered · 词 words spoken · 里 next milestone · 域 practice domain · 难 difficulty setting · 架 answer framework · 调 coaching tone they prefer · 岗 role family · 能 key competencies for the role · 薪 typical pay band · 预 predicted-question set (company/role/count) · 事 saved gap story (type/length) · 近 recent sessions as role:score.`;

function n(v: number | undefined | null, digits = 0): string | null {
  if (v == null || Number.isNaN(v)) return null;
  return digits ? String(Math.round(v * 10 ** digits) / 10 ** digits) : String(Math.round(v));
}

/** Encode a context object into the compact 符 line. Empty fields are dropped. */
export function encodeContext(ctx: UserContext): string {
  const parts: string[] = [];
  const push = (glyph: string, value: string | null | undefined) => {
    if (value != null && String(value).trim() !== "") parts.push(`${glyph} ${String(value).trim()}`);
  };

  push(G.name, ctx.name);
  push(G.situation, ctx.situation ?? undefined);
  push(G.role, ctx.targetRole);
  push(G.company, ctx.company);
  push(G.gap, ctx.interviewGap ?? undefined);
  push(G.date, ctx.interviewDate ?? undefined);

  push(G.sessions, n(ctx.sessions));
  push(G.cadence, n(ctx.cadence, 1));
  push(G.streak, n(ctx.streak));
  push(G.longest, n(ctx.longestStreak));
  push(G.readiness, n(ctx.readiness));
  push(G.first, n(ctx.firstScore));
  push(G.best, n(ctx.bestScore));
  if (ctx.improvement != null) push(G.improvement, (ctx.improvement >= 0 ? "+" : "") + n(ctx.improvement));
  push(G.pace, n(ctx.pace, 1));

  push(G.strongest, ctx.strongest);
  push(G.weakest, ctx.weakest);
  if (ctx.dims) {
    const d = ctx.dims;
    push(G.dims, `${Math.round(d.clarity)}/${Math.round(d.relevance)}/${Math.round(d.specificity)}/${Math.round(d.confidence)}/${Math.round(d.conciseness)}`);
  }
  push(G.anxiety, n(ctx.anxietyPer100, 1));
  push(G.wpm, n(ctx.wpm));
  push(G.answerSec, n(ctx.avgAnswerSeconds));

  push(G.questions, n(ctx.questionsAnswered));
  push(G.words, n(ctx.wordsSpoken));
  push(G.milestone, ctx.nextMilestone);

  push(G.domain, ctx.domain);
  push(G.difficulty, ctx.difficulty);
  push(G.framework, ctx.framework);
  push(G.coach, ctx.coachTone);

  push(G.family, ctx.roleFamily);
  if (ctx.competencies?.length) push(G.competencies, ctx.competencies.slice(0, 4).join(", "));
  push(G.pay, ctx.payBand);

  if (ctx.predicted) {
    const p = ctx.predicted;
    push(G.predicted, `${p.company || "?"}/${p.role || "?"}/${p.count}`);
  }
  if (ctx.gapStory) push(G.gapStory, `${ctx.gapStory.type}/${ctx.gapStory.length}`);
  if (ctx.recent?.length) push(G.recent, ctx.recent.slice(0, 5).map((r) => `${r.role}:${Math.round(r.score)}`).join(", "));

  return parts.join(" · ");
}

/** A short, human, English summary of the same context — for UI, not the model. */
export function humanContextSummary(ctx: UserContext): string {
  const bits: string[] = [];
  if (ctx.targetRole) bits.push(`prepping for ${ctx.targetRole}${ctx.company ? ` at ${ctx.company}` : ""}`);
  if (ctx.sessions) bits.push(`${ctx.sessions} session${ctx.sessions === 1 ? "" : "s"} in`);
  if (ctx.readiness) bits.push(`readiness ${Math.round(ctx.readiness)}/100`);
  if (ctx.weakest) bits.push(`working on ${ctx.weakest}`);
  if (ctx.streak) bits.push(`${ctx.streak}-day streak`);
  return bits.join(" · ");
}

/** Rough token estimate for the encoded line (for the "why this is efficient" UI). */
export function estimateTokens(s: string): number {
  // Chinese glyphs are ~1 token each; latin runs ~1 token per 4 chars.
  let cjk = 0;
  let other = 0;
  for (const ch of s) {
    if (/[一-鿿]/.test(ch)) cjk++;
    else other++;
  }
  return cjk + Math.ceil(other / 4);
}
