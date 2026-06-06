import type { Dimension, Question, Situation } from "./types";

/* Offline question bank. Generates a balanced 8-question interview arc tailored
   to the candidate's situation and target role. Claude replaces this when a key
   is present, but these are written to be realistic for non-tech roles. */

const WARMUP = (role: string): string[] => [
  `Tell me about yourself and what brought you to apply for this ${role} position.`,
  `Walk me through your background — what should I know about your experience as it relates to ${role}?`,
  `What got you interested in this ${role} role specifically?`,
];

const BEHAVIORAL = (role: string): string[] => [
  `Tell me about a time you had to handle a difficult situation with a coworker.`,
  `Describe a time you had to juggle several competing priorities at once. How did you decide what came first?`,
  `Give me an example of a time you went above and beyond what was expected of you.`,
  `Tell me about a mistake you made at work. What happened, and what did you do about it?`,
  `Describe a time you had to learn something new quickly to get the job done.`,
  `Tell me about a time you disagreed with a decision. How did you handle it?`,
  `Walk me through a time you improved a process or made something work better.`,
];

const SITUATION_QS: Record<Situation, (role: string) => string[]> = {
  returning: (role) => [
    `I see a gap in your work history. Can you tell me about that time and what you've been doing?`,
    `How have you kept your skills current for a ${role} role during your time away from the workforce?`,
    `What makes you confident you can step back into a fast-paced ${role} role right now?`,
  ],
  laid_off: (role) => [
    `Why did you leave your last position?`,
    `You were at your last company a long time. How will you adapt to a new environment as a ${role}?`,
    `What are you looking for in your next role that you didn't have in your last one?`,
  ],
  promotion: (role) => [
    `What makes you ready to take on a ${role} role with more responsibility?`,
    `Tell me about a time you led without having the formal title to do it.`,
    `How do you handle being responsible for outcomes that depend on other people?`,
  ],
  career_change: (role) => [
    `Your background isn't a traditional path into ${role}. Why are you making this change?`,
    `What skills from your previous career transfer to this ${role} role?`,
    `How will you get up to speed in an industry that's new to you?`,
  ],
};

const CLOSER = (role: string): string[] => [
  `What questions do you have for us about the ${role} role or the team?`,
  `Is there anything we haven't covered that you'd like us to know?`,
];

const TIPS: Record<string, string> = {
  warmup:
    "Keep it to about 60 seconds. Present → past → future: who you are now, what you've done, why you're here.",
  behavioral:
    "Use STAR — Situation, Task, Action, Result. End on a concrete result, not 'and it worked out.'",
  gap:
    "State it plainly, keep it to ~30 seconds, then pivot to why you're excited about this role. No apologizing.",
  situation:
    "Be honest and specific, then bridge to the value you bring now. Frame the change as a deliberate choice.",
  closer:
    "Always ask 1–2 thoughtful questions. It signals genuine interest and that you've done your homework.",
};

function categoryFor(index: number): string {
  if (index <= 1) return "warmup";
  if (index <= 4) return "behavioral";
  if (index <= 6) return "situation";
  return "closer";
}

function rotate<T>(arr: T[], by: number): T[] {
  const n = arr.length;
  const k = ((by % n) + n) % n;
  return [...arr.slice(k), ...arr.slice(0, k)];
}

export function generateQuestions(
  situation: Situation | null,
  role: string,
  seed = 0
): Question[] {
  const r = role.trim() || "the";
  const warm = rotate(WARMUP(r), seed);
  const beh = rotate(BEHAVIORAL(r), seed);
  const sit = SITUATION_QS[situation ?? "career_change"](r);
  const sitR = rotate(sit, seed);
  const close = rotate(CLOSER(r), seed);

  const arc: { text: string; cat: string }[] = [
    { text: warm[0], cat: "warmup" },
    { text: beh[0], cat: "behavioral" },
    { text: beh[1], cat: "behavioral" },
    { text: beh[2], cat: "behavioral" },
    { text: sitR[0], cat: situation === "returning" || situation === "laid_off" ? "gap" : "situation" },
    { text: sitR[1], cat: "situation" },
    { text: beh[3], cat: "behavioral" },
    { text: close[0], cat: "closer" },
  ];

  return arc.map((a, i) => ({
    number: i + 1,
    text: a.text,
    category: a.cat,
    tip: TIPS[a.cat] ?? TIPS.behavioral,
  }));
}

/** A focused single-dimension drill set, used by "Practice your focus area." */
const FOCUS_QS: Record<Dimension, string[]> = {
  specificity: [
    "Tell me about your single biggest accomplishment — and put real numbers on it.",
    "Describe a time you saved money or time. Exactly how much?",
    "Walk me through a result you're proud of, with the before-and-after metrics.",
  ],
  confidence: [
    "Tell me why you're the right person for this role. Own it.",
    "What's something you're genuinely great at? Say it without hedging.",
    "Describe a time you led people through something hard.",
  ],
  clarity: [
    "Explain a complex part of your job to someone who's never done it.",
    "Tell me about a project from start to finish, in order.",
    "Describe how you'd handle your first week in this role.",
  ],
  conciseness: [
    "Give me your 30-second 'tell me about yourself.'",
    "In two sentences, why should we hire you?",
    "Sum up your biggest strength in under 20 seconds.",
  ],
  relevance: [
    "Why do you want THIS job, specifically?",
    "What about this role fits what you do best?",
    "How does your experience map to what this role needs?",
  ],
};

export function generateFocusQuestions(dim: Dimension, role: string, seed = 0): Question[] {
  const r = role.trim() || "the";
  const base = rotate(FOCUS_QS[dim], seed);
  return base.slice(0, 5).map((text, i) => ({
    number: i + 1,
    text: text.replace(/this role/gi, `the ${r} role`),
    category: "focus",
    tip: TIPS.behavioral,
  }));
}
