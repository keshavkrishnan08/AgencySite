import type { InterviewPlan, PlanDay, Situation } from "./types";

/* Turns "my interview is on [date]" into a day-by-day plan that sequences the
   tools you already have. The point: a non-tech, anxious user gets told what to
   do today, not handed a toolbox. The task list is built for THIS customer from
   their company, situation, and weakest dimension — nothing static. */

const FINALE = { label: "Final dress rehearsal: Interview Day", href: "/interview-day" };

const DIM_LABEL: Record<string, string> = {
  clarity: "clarity", relevance: "relevance", specificity: "specificity",
  confidence: "confidence", conciseness: "conciseness",
};

function buildPool(opts: { company?: string; situation?: Situation | null; weakestDimension?: string }) {
  const company = (opts.company || "").trim();
  const pool: { label: string; href: string }[] = [
    { label: company ? `Research ${company}` : "Research the company", href: "/tools/company-research" },
    { label: "Build your 'tell me about yourself'", href: "/tools/your-story" },
    { label: company ? `Predict ${company}'s likely questions` : "Predict their likely questions", href: "/tools/question-predictor" },
    { label: "Run a full practice session", href: "/practice" },
  ];
  // Situation-specific prep
  if (opts.situation === "returning" || opts.situation === "laid_off") {
    pool.push({ label: "Polish your gap answer", href: "/tools/gap-story" });
  } else if (opts.situation === "career_change") {
    pool.push({ label: "Frame your career-change story", href: "/tools/your-story" });
  } else if (opts.situation === "promotion") {
    pool.push({ label: "Sharpen a leadership example", href: "/practice" });
  }
  // Target the customer's weakest dimension
  const weak = opts.weakestDimension && DIM_LABEL[opts.weakestDimension];
  pool.push(
    weak
      ? { label: `Drill your weak spot: ${weak}`, href: `/practice?focus=${opts.weakestDimension}` }
      : { label: "Practice again, focus your weak area", href: "/practice" }
  );
  return pool;
}

function midnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function relLabel(when: Date, today: Date, interview: Date): string {
  const dayMs = 86400000;
  const diffToday = Math.round((+when - +today) / dayMs);
  if (+when === +interview) return "Interview day";
  if (diffToday === 0) return "Today";
  if (diffToday === 1) return "Tomorrow";
  return when.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function daysUntil(dateISO: string): number {
  const today = midnight(new Date());
  const date = midnight(new Date(dateISO));
  return Math.max(0, Math.round((+date - +today) / 86400000));
}

export function generatePlan(input: {
  company: string;
  role: string;
  dateISO: string;
  situation?: Situation | null;
  weakestDimension?: string;
}): InterviewPlan {
  const today = midnight(new Date());
  const date = midnight(new Date(input.dateISO));
  const dayMs = 86400000;
  const daysLeft = Math.max(1, Math.round((+date - +today) / dayMs));
  const buckets = Math.min(daysLeft, 7);
  const prep = Math.max(1, buckets - 1);

  const pool = buildPool(input);
  const dayTasks: { label: string; href: string }[][] = Array.from({ length: buckets }, () => []);
  pool.forEach((item, i) => dayTasks[i % prep].push(item));
  dayTasks[buckets - 1].push(FINALE);

  const days: PlanDay[] = dayTasks.map((tasks, i) => {
    const when = new Date(+date - (buckets - 1 - i) * dayMs);
    return {
      label: relLabel(when, today, date),
      whenISO: when.toISOString(),
      tasks: tasks.map((t, j) => ({ id: `${i}-${j}`, label: t.label, href: t.href, done: false })),
    };
  });

  return {
    id: `plan_${input.dateISO}`,
    company: input.company.trim(),
    role: input.role.trim(),
    dateISO: input.dateISO,
    createdAt: new Date().toISOString(),
    days,
  };
}
