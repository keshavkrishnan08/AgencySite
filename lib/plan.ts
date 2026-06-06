import type { InterviewPlan, PlanDay } from "./types";

/* Turns "my interview is on [date]" into a day-by-day plan that sequences the
   tools you already have. The point: a non-tech, anxious user gets told what to
   do today, not handed a toolbox. */

const POOL: { label: string; href: string }[] = [
  { label: "Research the company", href: "/tools/company-research" },
  { label: "Build your 'tell me about yourself'", href: "/tools/your-story" },
  { label: "Predict their likely questions", href: "/tools/question-predictor" },
  { label: "Run a full practice session", href: "/practice" },
  { label: "Polish your gap answer", href: "/tools/gap-story" },
  { label: "Practice again, focus your weak area", href: "/practice" },
];
const FINALE = { label: "Final dress rehearsal: Interview Day", href: "/interview-day" };

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

export function generatePlan(input: { company: string; role: string; dateISO: string }): InterviewPlan {
  const today = midnight(new Date());
  const date = midnight(new Date(input.dateISO));
  const dayMs = 86400000;
  const daysLeft = Math.max(1, Math.round((+date - +today) / dayMs));
  const buckets = Math.min(daysLeft, 7);
  const prep = Math.max(1, buckets - 1);

  const dayTasks: { label: string; href: string }[][] = Array.from({ length: buckets }, () => []);
  POOL.forEach((item, i) => dayTasks[i % prep].push(item));
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
