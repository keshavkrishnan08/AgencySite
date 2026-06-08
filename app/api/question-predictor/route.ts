import { rateLimit } from "@/lib/ratelimit";
import { NextResponse } from "next/server";
import { callClaude, FAST_MODEL, extractJson, hasAI } from "@/lib/ai";
import { COACH_PERSONA } from "@/lib/prompt";
import type { PredictedQuestion } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `${COACH_PERSONA}

Your task as the Question Predictor: read the pasted job posting and predict the 5 interview questions this exact employer is most likely to ask, in order of probability.

For each: the question, why they're asking it (what it reveals about what they care about), 2-3 bullets on what a strong answer includes, and a probability (0-100, descending).

Return ONLY valid minified JSON:
{"questions":[{"question":"...","why":"...","strongAnswer":["...","..."],"probability":92}]}\n\nWrite in plain words a 6th grader can read. Never use em dashes or en dashes; use a period, comma, or colon instead.`;

const SIGNALS: { test: RegExp; q: PredictedQuestion }[] = [
  {
    test: /fast[- ]?paced|deadline|under pressure|high[- ]?volume/i,
    q: {
      question: "Tell me about a time you had to stay organized under pressure.",
      why: "The posting stresses a fast-paced environment, so they want proof you don't crack when things pile up.",
      strongAnswer: ["A specific stressful moment with real stakes", "The system or triage you used to stay on top of it", "A concrete result that shows it worked"],
      probability: 90,
    },
  },
  {
    test: /team|collaborat|cross[- ]?functional|stakeholder/i,
    q: {
      question: "Describe a time you had a conflict or disagreement with a coworker.",
      why: "They mention teamwork heavily. They're screening for whether you handle friction professionally.",
      strongAnswer: ["The disagreement, stated without blame", "How you listened and found common ground", "The resolution and what the relationship looked like after"],
      probability: 84,
    },
  },
  {
    test: /lead|manage|supervis|mentor|own(ership)?/i,
    q: {
      question: "Tell me about a time you led or took ownership of something.",
      why: "The role implies responsibility, so they want evidence you step up without being told.",
      strongAnswer: ["A moment you owned an outcome", "What you actually did (not the team. You)", "The measurable result"],
      probability: 80,
    },
  },
  {
    test: /customer|client|patient|guest|member|service/i,
    q: {
      question: "Tell me about a difficult customer or client situation you handled.",
      why: "This is a customer-facing role, so composure and empathy under pressure matter to them.",
      strongAnswer: ["The situation and the customer's real concern", "How you stayed calm and solved it", "How it ended. Ideally a saved relationship"],
      probability: 78,
    },
  },
  {
    test: /detail|accura|complian|quality|process|data/i,
    q: {
      question: "Give an example of how you catch mistakes or keep your work accurate.",
      why: "The posting emphasizes accuracy, so they're probing your attention to detail.",
      strongAnswer: ["A concrete check or habit you use", "A time it caught a real error", "The impact of catching it"],
      probability: 72,
    },
  },
];

const DEFAULTS: PredictedQuestion[] = [
  {
    question: "Tell me about yourself and why this role.",
    why: "The opener. They want a tight, relevant summary that connects you to this specific job.",
    strongAnswer: ["A 60-second present → past → future arc", "One or two relevant wins", "A clear reason you want THIS role"],
    probability: 95,
  },
  {
    question: "Why are you interested in working here?",
    why: "They're testing whether you researched them or are mass-applying.",
    strongAnswer: ["Something specific about the company", "How it connects to your goals", "Genuine enthusiasm, not flattery"],
    probability: 70,
  },
];

function fallback(posting: string): PredictedQuestion[] {
  const matched = SIGNALS.filter((s) => s.test.test(posting)).map((s) => s.q);
  const out = [DEFAULTS[0], ...matched, DEFAULTS[1]];
  const seen = new Set<string>();
  const unique = out.filter((q) => (seen.has(q.question) ? false : (seen.add(q.question), true)));
  return unique.slice(0, 5).map((q, i) => ({ ...q, probability: q.probability - i * 2 }));
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
  const { posting = "", role = "" } = body ?? {};
  if (!posting.trim() || posting.trim().length < 30) {
    return NextResponse.json({ error: "Paste the full job posting" }, { status: 400 });
  }

  if (hasAI()) {
    try {
      const user = `Target role: ${role || "inferred from posting"}\n\nJob posting:\n"""${posting.slice(0, 6000)}"""`;
      const text = await callClaude({ model: FAST_MODEL, system: SYSTEM, user, maxTokens: 1100, temperature: 0.5 });
      const parsed = extractJson<{ questions: PredictedQuestion[] }>(text);
      if (parsed?.questions?.length) {
        return NextResponse.json({ questions: parsed.questions.slice(0, 5), source: "ai" });
      }
    } catch {
      /* fall through */
    }
  }
  return NextResponse.json({ questions: fallback(posting), source: "heuristic" });
}
