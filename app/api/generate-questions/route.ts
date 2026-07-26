import { rateLimit } from "@/lib/ratelimit";
import { recordUsage } from "@/lib/usage";
import { NextResponse } from "next/server";
import { generateQuestions, generateFocusQuestions } from "@/lib/questions";
import { callClaude, extractJson, hasAI, FAST_MODEL, asStr } from "@/lib/ai";
import { COACH_PERSONA, candidateBlock } from "@/lib/prompt";
import type { Question } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `${COACH_PERSONA}

Your task: write exactly 8 interview questions a real hiring manager for THIS candidate's exact job would ask. Not generic interview questions.

Arc:
- Q1 to Q2: warmup, easy and confidence-building, like "tell me about yourself".
- Q3 to Q5: core behavioral, expecting STAR stories.
- Q6 to Q7: situation-specific, speaking straight to their situation (returning to work, laid off, promotion, or career change).
- Q8: closer, "what questions do you have for us?".

Personalize HARD. A generic, textbook question that ignores the role is a failure. Every core question must sound like it was written for THIS person's exact job:
- Name the specific role and its real, day-to-day responsibilities in the questions themselves. A question for a Registered Nurse must be about nursing (patients, handoffs, charting, codes), not "a time you worked on a team".
- If a company is given, name it naturally in the opener and closer.
- If a job posting is given, mine it hard: pull the exact skills, tools, and words they used, and make MOST of the core questions probe those specific priorities. Quote their language.
- If a weak area is given, include one question that pushes on it.
- Calibrate difficulty to how long since they last interviewed. Ease in if it has been years.

Each question gets a short, practical, one-sentence tip.

Return ONLY valid minified JSON, no backticks:
{"questions":[{"number":1,"text":"...","category":"warmup|behavioral|gap|situation|closer","tip":"..."}]}`;

/* Storytelling drills. The same scoring engine works on these, but the prompts
   pull for the signature stories every candidate needs ready — and the "one
   clean line" that makes them land. */
const STORY_SYSTEM = `${COACH_PERSONA}

Your task: write exactly {N} storytelling prompts that push this candidate to build and sharpen the signature stories interviews are won on. This is narrative craft, not trivia.

Cover a spread of these story types across the set:
- A real challenge you overcame (Situation-Task-Action-Result, with a number in the Result).
- A failure or mistake and exactly what you changed after it.
- A time you led, influenced, or moved people without authority.
- A moment that shows your core value or what you stand for.
- Your "origin" story — why this work, told in under 30 seconds.

Each prompt should name the story type and ask for a tight, specific telling. Tip should push on structure, concision, or landing the point in one clean line.

Return ONLY valid minified JSON, no backticks:
{"questions":[{"number":1,"text":"...","category":"story","tip":"..."}]}`;

/* Public-speaking / communication drills — delivery under light pressure,
   structure, and thinking on your feet. Not interview-specific. */
const SPEECH_SYSTEM = `${COACH_PERSONA}

Your task: write exactly {N} public-speaking and communication drills for this person. The goal is a clearer, calmer, more persuasive speaker — useful in interviews, but broader than them.

Cover a spread of these:
- Impromptu: a random everyday topic to speak on for 60 seconds, structured open-point-close.
- Explain-it-simply: explain something from their field to a smart 12-year-old.
- Persuade: make a 45-second case for a real opinion they hold.
- Handle the room: respond to a skeptical or interrupting listener with poise.
- Story-to-point: tell a 30-second story that lands one clear message.

Each prompt is a drill they perform out loud. Tip should push on pacing, cutting filler, the pause, or structure.

Return ONLY valid minified JSON, no backticks:
{"questions":[{"number":1,"text":"...","category":"speech","tip":"..."}]}`;

/* Small seeded banks so the storytelling / speaking domains still produce real
   drills when the AI is unavailable (heuristic mode). */
const STORY_BANK: { text: string; tip: string }[] = [
  { text: "Tell the story of the hardest problem you've solved at work. Use Situation, Task, Action, Result — and put a real number in the Result.", tip: "Lead with the stakes in one sentence, then get to what you did." },
  { text: "Walk me through a real failure or mistake, and exactly what you did differently afterward.", tip: "Own it fast, then spend most of the story on the change you made." },
  { text: "Describe a time you moved people to a decision without any authority over them.", tip: "Show the resistance first, or the win sounds too easy." },
  { text: "Tell a 30-second story that shows what you stand for at work.", tip: "One value, one moment, one line that lands it." },
  { text: "Give me your origin story: why this line of work, in under 30 seconds.", tip: "Start in the middle of a scene, not 'I was born…'." },
  { text: "Tell me about the result you're proudest of. Make me feel why it was hard.", tip: "Contrast the before and after so the result has weight." },
  { text: "Describe a moment you changed your mind about something important.", tip: "Name what evidence moved you — it reads as maturity." },
  { text: "Tell the story of a time under real pressure and how you stayed steady.", tip: "Slow the pace where the pressure peaks; don't rush the climax." },
];
const SPEECH_BANK: { text: string; tip: string }[] = [
  { text: "Speak for 60 seconds on: 'the best advice I ever got.' Open, one point, close.", tip: "Decide your last line before you start talking." },
  { text: "Explain what you do at work to a smart 12-year-old, out loud, in under a minute.", tip: "Ban jargon. If you need a big word, define it in the same breath." },
  { text: "Make a 45-second persuasive case for an opinion you actually hold.", tip: "State the claim, give one reason, one example, then restate the claim." },
  { text: "Someone interrupts you mid-point, skeptical. Respond out loud with poise.", tip: "Acknowledge, hold your ground in one line, then continue." },
  { text: "Tell a 30-second story that lands exactly one message. Say the message last.", tip: "Cut every detail that doesn't serve the point." },
  { text: "Speak for 60 seconds on a random object near you as if it mattered.", tip: "Structure saves you: open, one vivid point, close." },
  { text: "Give a 30-second toast to a colleague. Warm, specific, no rambling.", tip: "One specific memory beats three generic compliments." },
  { text: "Pitch yourself in 30 seconds as if the elevator doors are closing.", tip: "One sentence on who you are, one on the proof, one on what you want." },
];

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
  const {
    situation = null,
    targetRole = "",
    interviewGap = "",
    seed = 0,
    focusDimension,
    company = "",
    posting = "",
    name = "",
    weakestDimension = "",
    sessionCount = 0,
    avoid = [],
    focusTypes = [],
    difficulty = "standard",
    count = 8,
    domain = "interview",
    tone = "",
    interviewer = "",
    seniority = "",
    stage = "",
    framework = "",
  } = body ?? {};

  // Clamp the requested question count to a sane range.
  const n = Math.max(4, Math.min(12, Number(count) || 8));
  const dom: "interview" | "storytelling" | "public_speaking" =
    domain === "storytelling" || domain === "public_speaking" ? domain : "interview";
  // Human labels for the requested categories, fed into the prompt.
  const TYPE_LABEL: Record<string, string> = {
    warmup: "warm-up / 'tell me about yourself'",
    behavioral: "behavioral 'tell me about a time' questions",
    situation: "situational / hypothetical scenarios",
    gap: "questions about their résumé gap or career change",
    closer: "closing questions and 'do you have questions for us'",
    leadership: "leadership and conflict questions",
    technical: "role-knowledge / technical questions specific to the job",
    values: "values, motivation and culture-fit questions",
    salary: "salary expectations and negotiation questions",
  };
  const wantedTypes: string[] = Array.isArray(focusTypes)
    ? focusTypes.filter((t: unknown) => typeof t === "string" && TYPE_LABEL[t as string])
    : [];
  const diffLine =
    difficulty === "easy"
      ? "\nKeep the difficulty gentle and encouraging — this person is easing back in."
      : difficulty === "hard"
      ? "\nMake these HARD: pointed follow-up-style questions, curveballs, and pressure that a tough panel would use."
      : "";
  const typeLine = wantedTypes.length
    ? `\nEmphasise these question types: ${wantedTypes.map((t) => TYPE_LABEL[t]).join("; ")}. Weight the set toward them.`
    : "";

  // Phrasing / tone: how the questions read.
  const TONE_LINE: Record<string, string> = {
    conversational: "\nPhrase questions warmly and conversationally, the way a friendly manager actually talks.",
    formal: "\nPhrase questions crisply and formally, the way a structured competency interview is worded.",
    rapid_fire: "\nMake questions short and punchy — rapid-fire, one clean sentence each, no preamble.",
    scenario: "\nFrame questions as concrete 'what would you do if…' scenarios rooted in the role.",
  };
  // Interviewer persona: the demeanour behind the questions.
  const INTERVIEWER_LINE: Record<string, string> = {
    friendly: "\nThe interviewer is warm and encouraging — supportive framing, benefit of the doubt.",
    neutral: "\nThe interviewer is professional and neutral — no warmth, no hostility, just the questions.",
    skeptical: "\nThe interviewer is skeptical and probing — press on specifics, ask for proof, don't let vague claims slide.",
    panel: "\nThis is a panel: vary the voice between questions, and include at least one sharp follow-up-style challenge.",
  };
  const toneLine = TONE_LINE[String(tone)] || "";
  const interviewerLine = INTERVIEWER_LINE[String(interviewer)] || "";

  // Seniority: how deep and strategic the questions go.
  const SENIORITY_LINE: Record<string, string> = {
    entry: "\nPitch at an entry level: fundamentals, coachability, and potential over deep track record.",
    mid: "\nPitch at a mid level: proven execution, ownership of real projects, and independent judgment.",
    senior: "\nPitch at a senior level: strategy, ambiguity, influence across teams, and measurable impact.",
    exec: "\nPitch at an executive level: vision, org-building, tough trade-offs, and business outcomes.",
  };
  // Stage: which interview round this set simulates.
  const STAGE_LINE: Record<string, string> = {
    screen: "\nThis is an early phone screen: keep it broad and confidence-building, mostly fit and motivation.",
    onsite: "\nThis is the onsite/core round: go deep on behavioral and role-specific competencies.",
    final: "\nThis is the final round: values, vision, and the harder questions a senior leader would ask.",
  };
  // Answer framework the tips should coach toward.
  const FRAMEWORK_LINE: Record<string, string> = {
    star: "\nCoach every tip toward the STAR structure (Situation, Task, Action, Result with a number).",
    car: "\nCoach every tip toward the CAR structure (Challenge, Action, Result).",
    free: "",
  };
  const seniorityLine = SENIORITY_LINE[String(seniority)] || "";
  const stageLine = STAGE_LINE[String(stage)] || "";
  const frameworkLine = FRAMEWORK_LINE[String(framework)] || "";

  if (focusDimension) {
    return NextResponse.json({
      questions: generateFocusQuestions(focusDimension, targetRole, seed),
      source: "heuristic",
    });
  }

  // Storytelling / public-speaking domains use their own prompt and, when the
  // AI is down, their own seeded bank — so the domain is real, not a relabel.
  const domainSystem = dom === "storytelling" ? STORY_SYSTEM : dom === "public_speaking" ? SPEECH_SYSTEM : SYSTEM;
  const domainCategory = dom === "storytelling" ? "story" : "speech";

  if (hasAI()) {
    try {
      const avoidList: string[] = Array.isArray(avoid) ? avoid.filter((s: unknown) => typeof s === "string" && s).slice(0, 12) : [];
      const variety =
        `\n\nThis is practice session #${(Number(sessionCount) || 0) + 1}. Make this set FRESH: vary the wording, scenarios, and angles so it does not feel like a repeat of earlier sessions.` +
        (avoidList.length ? `\nDo NOT reuse or lightly reword any of these already-asked questions:\n- ${avoidList.join("\n- ")}` : "");
      const system = domainSystem.replace(/\{N\}/g, String(n));
      const user = `${candidateBlock({ name, situation: situation || "", targetRole, company, interviewGap, posting, weakestDimension })}${variety}${dom === "interview" ? typeLine : ""}${diffLine}${toneLine}${interviewerLine}${seniorityLine}${stageLine}${frameworkLine}\n\nWrite their ${n} ${dom === "interview" ? "questions" : "drills"} now.`;
      // Higher temperature than scoring: for questions, variety matters more than determinism.
      // Questions are the one place quality barely matters (a heuristic bank backs
      // them up), so route to the cheapest tier.
      const text = await callClaude({ model: FAST_MODEL, system, user, maxTokens: 1100, temperature: 0.85, cheap: true });
      const parsed = extractJson<{ questions: Partial<Question>[] }>(text);
      if (parsed?.questions?.length) {
        // Coerce every field, drop any question with no text, then renumber so
        // the set handed to the UI is always well-formed and 1..k.
        const questions: Question[] = parsed.questions
          .map((q) => ({
            number: 0,
            text: asStr(q?.text, 300),
            category: asStr(q?.category, 40) || (dom === "interview" ? "behavioral" : domainCategory),
            tip: asStr(q?.tip, 200),
          }))
          .filter((q) => q.text.length > 0)
          .slice(0, n)
          .map((q, i) => ({ ...q, number: i + 1 }));
        if (questions.length) return NextResponse.json({ questions, source: "ai" });
      }
    } catch {
      /* fall through */
    }
  }

  // Heuristic domain banks (seeded shuffle) so storytelling / speaking work offline.
  if (dom !== "interview") {
    const bank = dom === "storytelling" ? STORY_BANK : SPEECH_BANK;
    const off = Math.abs(Number(seed) || 0) % bank.length;
    const rotated = [...bank.slice(off), ...bank.slice(0, off)];
    const questions = rotated.slice(0, n).map((q, i) => ({
      number: i + 1,
      text: q.text,
      category: domainCategory,
      tip: q.tip,
    }));
    return NextResponse.json({ questions, source: "heuristic" });
  }

  // Heuristic fallback: honour the requested count and type emphasis as best a
  // static bank can. Filter to wanted categories first, then top up to n.
  let hq = generateQuestions(situation, targetRole, seed, { company, posting });
  if (wantedTypes.length) {
    const wanted = new Set(wantedTypes);
    const matched = hq.filter((q) => wanted.has(q.category));
    const rest = hq.filter((q) => !wanted.has(q.category));
    hq = [...matched, ...rest];
  }
  hq = hq.slice(0, n).map((q, i) => ({ ...q, number: i + 1 }));
  return NextResponse.json({ questions: hq, source: "heuristic" });
}
