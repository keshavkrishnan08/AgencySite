import type {
  AnswerScores,
  AnxietyFlags,
  Dimension,
  DimensionScores,
  ScoredAnswer,
} from "./types";
import { clamp } from "./utils";

/* ------------------------------------------------------------------ *
 * Axon Careers heuristic scoring engine
 * Pure, deterministic, text-sensitive. Runs anywhere (server/client).
 * Powers the product end-to-end with no external dependency, and acts
 * as the graceful fallback when no Claude API key is configured.
 * ------------------------------------------------------------------ */

const FILLERS = [
  "um", "uh", "er", "erm", "hmm", "like", "you know", "i mean", "basically",
  "literally", "honestly", "actually", "so yeah", "kinda", "gonna", "wanna",
  "stuff like that", "and stuff", "or whatever",
];

const HEDGES = [
  "i guess", "i think maybe", "maybe", "i'm not sure", "im not sure", "not sure",
  "i suppose", "kind of", "sort of", "it depends", "i don't know", "i dont know",
  "probably", "perhaps", "i feel like", "hopefully", "if that makes sense",
  "i don't know if this counts", "i guess you could say",
];

const APOLOGIES = [
  "sorry", "i apologize", "i apologise", "this might not be relevant",
  "i'm not the best", "im not the best", "forgive me", "excuse me for",
  "this probably isn't", "i'm rambling", "im rambling",
];

const UNDERMINERS = [
  "i only", "i just", "it was nothing", "it's not that impressive",
  "its not that impressive", "anyone could have", "anyone could've",
  "it wasn't a big deal", "it wasnt a big deal", "just a", "only a",
  "nothing special", "i'm no expert", "im no expert",
];

const OUTCOME_VERBS = [
  "increased", "decreased", "reduced", "grew", "saved", "improved", "boosted",
  "cut", "raised", "generated", "delivered", "launched", "led", "managed",
  "trained", "built", "created", "won", "achieved", "exceeded", "hit", "drove",
  "streamlined", "automated", "negotiated", "resolved", "recovered", "doubled",
  "tripled", "scaled", "shipped", "closed", "retained",
];

const STAR_SITUATION = ["when", "while", "during", "at my", "in my role", "we had", "there was", "the team", "my manager", "the client", "the company"];
const STAR_RESULT = ["result", "as a result", "in the end", "ultimately", "which led", "outcome", "by the end", "afterward", "afterwards", "this meant", "so that"];
const CONNECTORS = ["because", "so that", "which", "therefore", "first", "then", "finally", "after that", "once", "as a result"];

function countMatches(haystack: string, needles: string[]): { count: number; hits: string[] } {
  const hits: string[] = [];
  let count = 0;
  for (const n of needles) {
    const re = new RegExp(`(?:^|[^a-z])${escapeRegExp(n)}(?:$|[^a-z])`, "gi");
    const m = haystack.match(re);
    if (m) {
      count += m.length;
      hits.push(n);
    }
  }
  return { count, hits };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function analyzeAnxiety(text: string): AnxietyFlags {
  const t = ` ${text.toLowerCase()} `;
  const f = countMatches(t, FILLERS);
  const h = countMatches(t, HEDGES);
  const a = countMatches(t, APOLOGIES);
  const u = countMatches(t, UNDERMINERS);
  return {
    fillers: f.hits,
    hedges: h.hits,
    apologies: a.hits,
    underminers: u.hits,
    fillerCount: f.count,
    hedgeCount: h.count,
    apologyCount: a.count,
    underminerCount: u.count,
    total: f.count + h.count + a.count + u.count,
  };
}

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "at", "for",
  "with", "as", "is", "are", "was", "were", "be", "been", "i", "you", "we",
  "they", "it", "this", "that", "my", "our", "their", "me", "us", "them",
  "about", "tell", "time", "your", "how", "what", "why", "do", "did", "would",
  "could", "can", "have", "has", "had", "will", "when", "where", "give",
]);

function keywords(text: string): Set<string> {
  return new Set(words(text).filter((w) => w.length > 3 && !STOP.has(w)));
}

/* ---------------- Dimension scorers (0-100) ---------------- */

function scoreConciseness(wc: number): number {
  // Sweet spot ~70-190 words for a spoken behavioral answer.
  if (wc === 0) return 0;
  if (wc < 20) return Math.round(clamp(28 + wc * 1.4));
  if (wc < 70) return Math.round(clamp(58 + (wc - 20) * 0.7));
  if (wc <= 190) return Math.round(clamp(92 - Math.abs(130 - wc) * 0.08));
  if (wc <= 280) return Math.round(clamp(88 - (wc - 190) * 0.28));
  return Math.round(clamp(62 - (wc - 280) * 0.14, 22));
}

function scoreClarity(text: string): { score: number; avgLen: number } {
  const ss = sentences(text);
  if (!ss.length) return { score: 0, avgLen: 0 };
  const lens = ss.map((s) => words(s).length);
  const avgLen = lens.reduce((a, b) => a + b, 0) / lens.length;
  const variance =
    lens.reduce((a, b) => a + (b - avgLen) ** 2, 0) / lens.length;
  const burstiness = Math.min(Math.sqrt(variance), 12); // reward varied rhythm

  let s = 56;
  // ideal average sentence length 11-22 words
  if (avgLen >= 9 && avgLen <= 24) s += 18;
  else if (avgLen < 6) s -= 14;
  else if (avgLen > 34) s -= 18;
  else s += 6;

  s += burstiness * 1.1; // varied sentence length reads as clear, human
  const connectors = countMatches(` ${text.toLowerCase()} `, CONNECTORS).count;
  s += Math.min(connectors * 3, 12);
  if (ss.length >= 3) s += 5;
  return { score: clamp(Math.round(s)), avgLen };
}

function scoreSpecificity(text: string): { score: number; numbers: number; outcomes: number } {
  const numbers = (text.match(/\b\d+([.,]\d+)?\s?%?\b/g) ?? []).length +
    (text.match(/\$\s?\d/g) ?? []).length;
  const outcomes = countMatches(` ${text.toLowerCase()} `, OUTCOME_VERBS).count;
  const propers = (text.match(/\b[A-Z][a-z]{2,}\b/g) ?? []).length; // named things
  const wc = words(text).length;

  let s = 40;
  s += Math.min(numbers * 11, 33);
  s += Math.min(outcomes * 6, 22);
  s += Math.min(propers * 1.5, 9);
  if (wc < 25) s -= 16; // too short to be specific
  // vague tells
  const vague = countMatches(` ${text.toLowerCase()} `, [
    "well", "good", "great", "handled it", "did my best", "things", "stuff",
    "a lot", "really hard", "worked out",
  ]).count;
  s -= Math.min(vague * 4, 16);
  return { score: clamp(Math.round(s)), numbers, outcomes };
}

function scoreConfidence(text: string, anx: AnxietyFlags): number {
  const wc = Math.max(words(text).length, 1);
  let s = 82;
  const density = (anx.total / wc) * 100; // issues per 100 words
  s -= Math.min(anx.fillerCount * 3.5, 22);
  s -= Math.min(anx.hedgeCount * 5, 26);
  s -= Math.min(anx.apologyCount * 9, 22);
  s -= Math.min(anx.underminerCount * 7, 24);
  s -= Math.min(density * 0.6, 10);
  // assertive "I" statements with action verbs lift confidence
  const iLed = countMatches(` ${text.toLowerCase()} `, ["i led", "i built", "i managed", "i created", "i decided", "i drove", "i owned", "i delivered", "i launched"]).count;
  s += Math.min(iLed * 4, 14);
  return clamp(Math.round(s));
}

function scoreRelevance(answer: string, question: string, role: string, category: string): number {
  const qk = keywords(`${question} ${role}`);
  const ak = keywords(answer);
  if (!ak.size) return 0;
  let overlap = 0;
  qk.forEach((k) => {
    if (ak.has(k)) overlap++;
  });
  const ratio = qk.size ? overlap / qk.size : 0;
  let s = 50 + ratio * 70;

  const lower = answer.toLowerCase();
  // behavioral questions expect a concrete past-tense story
  if (/time|describe|example|tell me about a/.test(question.toLowerCase())) {
    const past = countMatches(` ${lower} `, STAR_SITUATION).count;
    const result = countMatches(` ${lower} `, STAR_RESULT).count;
    if (past) s += 8;
    if (result) s += 9;
    if (!/\bi\b/.test(lower)) s -= 12; // didn't make it personal
  }
  if (category === "closer" && /\?/.test(answer)) s += 8; // asked a question back
  if (words(answer).length < 18) s -= 10;
  return clamp(Math.round(s));
}

const WEIGHTS: Record<Dimension, number> = {
  clarity: 0.2,
  relevance: 0.2,
  specificity: 0.25,
  confidence: 0.2,
  conciseness: 0.15,
};

export function computeOverall(d: DimensionScores): number {
  return Math.round(
    (Object.keys(WEIGHTS) as Dimension[]).reduce(
      (sum, k) => sum + d[k] * WEIGHTS[k],
      0
    )
  );
}

/* ---------------- Feedback (warm, specific) ---------------- */

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function feedbackFor(
  dim: Dimension,
  score: number,
  ctx: { anx: AnxietyFlags; numbers: number; outcomes: number; wc: number; avgLen: number },
  seed: number
): string {
  const good = score >= 75;
  const mid = score >= 55 && score < 75;

  switch (dim) {
    case "clarity":
      if (good)
        return pick([
          "Strong, easy-to-follow shape. You set the scene and moved through it in order.",
          "Clean structure. A listener could repeat your story back after hearing it once.",
        ], seed);
      if (mid)
        return "The bones are there. Open with one sentence that frames the whole story before you dive into details.";
      return ctx.avgLen > 30
        ? "Your sentences run long, so the thread gets lost. Break them up. One idea per sentence."
        : "It's a little hard to follow. Try Situation → Action → Result so each part has a clear job.";

    case "relevance":
      if (good)
        return pick([
          "You answered exactly what was asked and stayed on topic the whole way through.",
          "Right on target. No detours, no filler. You addressed the real question.",
        ], seed);
      if (mid)
        return "You're close, but you drifted. Re-read the question and make your first sentence answer it directly.";
      return "This answers a different question than the one asked. Anchor to the exact ask before adding color.";

    case "specificity":
      if (good)
        return ctx.numbers
          ? "Excellent. You backed it with real numbers, which is what makes an answer believable."
          : "Concrete and detailed. The specific actions you named are what interviewers remember.";
      if (mid)
        return "Good start. Add one number or outcome, 'cut response time by 30%' beats 'it got faster.'";
      return "You told us it went well, but not how you know. Swap one vague phrase for a measurable result.";

    case "confidence": {
      if (ctx.anx.underminerCount > 0) {
        const raw = (ctx.anx.underminers[0] ?? "I just").trim();
        // Show the phrase the way a reader would, capitalized; never splice it
        // into a sentence (some phrases like "just a" would read broken).
        const u = raw.charAt(0).toUpperCase() + raw.slice(1);
        return `You undermined yourself with "${u}." You didn't do it a little — you did it. Drop the qualifier and own the win.`;
      }
      if (ctx.anx.apologyCount > 0)
        return "You apologized inside your answer. Never apologize for your experience. State it plainly.";
      if (ctx.anx.hedgeCount > 1)
        return `You hedged ${ctx.anx.hedgeCount} times ("${ctx.anx.hedges[0]}"). Replace it with "In my experience" and watch this jump.`;
      if (ctx.anx.fillerCount > 2)
        return `${ctx.anx.fillerCount} filler words slipped in. A short pause reads as far more confident than "um."`;
      if (good)
        return "You sound sure of yourself. No hedging, no apologizing. That's exactly the tone that lands.";
      return "Steady tone. Trim any 'I think' or 'maybe' and let your statements stand on their own.";
    }

    case "conciseness":
      if (ctx.wc < 25) return "Too brief. The interviewer is left wanting more. Add the action you took and how it ended.";
      if (ctx.wc > 260) return `That's ${ctx.wc} words. You're rambling a bit. Aim for 60-150 and cut the setup.`;
      if (good) return "Great length. Long enough to be complete, short enough to hold attention.";
      return "Reasonable length. A tighter opening would give your result more room to shine.";
  }
}

const STRENGTH_LINE: Record<Dimension, string> = {
  clarity: "Clarity: your answers are easy to follow and well structured.",
  relevance: "Relevance: you stay on topic and address the question directly.",
  specificity: "Specificity: you back your stories with concrete detail.",
  confidence: "Confidence: your language is self-assured and direct.",
  conciseness: "Conciseness: you say what matters without rambling.",
};

const GROWTH_LINE: Record<Dimension, string> = {
  clarity: "Clarity: structure each answer as Situation → Action → Result.",
  relevance: "Relevance: make your first sentence answer the exact question.",
  specificity: "Specificity: add one number or outcome to every answer. This is the fastest way to raise your score.",
  confidence: "Confidence: cut hedging and self-undermining words like 'just' and 'I guess.'",
  conciseness: "Conciseness: aim for 60-150 words. Trim the setup, keep the result.",
};

export function scoreAnswer(input: {
  question: string;
  answer: string;
  targetRole: string;
  category?: string;
  questionNumber?: number;
}): Omit<ScoredAnswer, "exampleAnswer"> {
  const { question, answer, targetRole, category = "behavioral", questionNumber = 1 } = input;
  const wc = words(answer).length;
  const anx = analyzeAnxiety(answer);

  const clarity = scoreClarity(answer);
  const spec = scoreSpecificity(answer);
  const conf = scoreConfidence(answer, anx);
  const rel = scoreRelevance(answer, question, targetRole, category);
  const conc = scoreConciseness(wc);

  const dimensions: DimensionScores = {
    clarity: Math.round(clarity.score),
    relevance: Math.round(rel),
    specificity: Math.round(spec.score),
    confidence: Math.round(conf),
    conciseness: Math.round(conc),
  };
  const overall = computeOverall(dimensions);
  const scores: AnswerScores = { ...dimensions, overall };

  const ctx = {
    anx,
    numbers: spec.numbers,
    outcomes: spec.outcomes,
    wc,
    avgLen: clarity.avgLen,
  };
  const seed = wc + (answer.charCodeAt(0) || 0);

  const feedback = {
    clarity: feedbackFor("clarity", clarity.score, ctx, seed),
    relevance: feedbackFor("relevance", rel, ctx, seed + 1),
    specificity: feedbackFor("specificity", spec.score, ctx, seed + 2),
    confidence: feedbackFor("confidence", conf, ctx, seed + 3),
    conciseness: feedbackFor("conciseness", conc, ctx, seed + 4),
  } as Record<Dimension, string>;

  const entries = Object.entries(dimensions) as [Dimension, number][];
  const strongest = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const weakest = entries.reduce((a, b) => (b[1] < a[1] ? b : a))[0];

  // Actionable "Work on this next" items so the coaching card is populated even
  // without an AI key: the two lowest dimensions scoring below "great", newest
  // fix first. Falls back to the single weakest so the card is never empty.
  const improve = entries
    .filter(([, v]) => v < 80)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([d]) => GROWTH_LINE[d]);
  if (improve.length === 0) improve.push(GROWTH_LINE[weakest]);

  return {
    questionNumber,
    questionText: question,
    category,
    answerText: answer,
    scores,
    feedback,
    strengthSummary: STRENGTH_LINE[strongest],
    growthSummary: GROWTH_LINE[weakest],
    improve,
    anxiety: anx,
    wordCount: wc,
    source: "heuristic",
  };
}

/** Regenerate the per-dimension feedback notes so they match a GIVEN set of
 *  dimension scores (e.g. the AI's), not the heuristic's own. The evidence in
 *  ctx (numbers, length, hedges) still comes from the real answer, but the
 *  note's tone (weak / okay / strong branch) is keyed off the score the user
 *  actually sees — so a 45 never shows a "great length" line. */
export function feedbackForScores(
  dims: DimensionScores,
  input: { answer: string }
): Record<Dimension, string> {
  const { answer } = input;
  const wc = words(answer).length;
  const anx = analyzeAnxiety(answer);
  const clarity = scoreClarity(answer);
  const spec = scoreSpecificity(answer);
  const ctx = { anx, numbers: spec.numbers, outcomes: spec.outcomes, wc, avgLen: clarity.avgLen };
  const seed = wc + (answer.charCodeAt(0) || 0);
  return {
    clarity: feedbackFor("clarity", dims.clarity, ctx, seed),
    relevance: feedbackFor("relevance", dims.relevance, ctx, seed + 1),
    specificity: feedbackFor("specificity", dims.specificity, ctx, seed + 2),
    confidence: feedbackFor("confidence", dims.confidence, ctx, seed + 3),
    conciseness: feedbackFor("conciseness", dims.conciseness, ctx, seed + 4),
  } as Record<Dimension, string>;
}

/** Aggregate a set of answers into a session's dimension averages. */
export function aggregateDimensions(answers: { scores: AnswerScores; isFollowUp?: boolean }[]): DimensionScores {
  const keys: Dimension[] = ["clarity", "relevance", "specificity", "confidence", "conciseness"];
  const out = {} as DimensionScores;
  // A follow-up is a probe on the SAME question — it should nudge the score, not
  // rewrite it. Weighting it at 0.4 means a strong follow-up helps a little but
  // can't fully remediate a weak main answer.
  const W_FOLLOWUP = 0.4;
  const w = (a: { isFollowUp?: boolean }) => (a.isFollowUp ? W_FOLLOWUP : 1);
  const totalW = answers.reduce((s, a) => s + w(a), 0);
  for (const k of keys) {
    out[k] = totalW
      ? Math.round(answers.reduce((s, a) => s + a.scores[k] * w(a), 0) / totalW)
      : 0;
  }
  return out;
}
