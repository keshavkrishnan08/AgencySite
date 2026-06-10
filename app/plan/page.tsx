"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, Check, Circle, RotateCcw, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { clearPlan, getPlan, getProfile, getSessions, savePlan, togglePlanTask } from "@/lib/store";
import { daysUntil, generatePlan } from "@/lib/plan";
import { track } from "@/lib/analytics";
import { average, cn, formatDateLong, todayKey } from "@/lib/utils";
import type { Dimension, InterviewPlan } from "@/lib/types";

export default function PlanPage() {
  const [mounted, setMounted] = useState(false);
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    setMounted(true);
    setPlan(getPlan());
    const p = getProfile();
    setRole(p.targetRole || "");
    // default the date to one week out
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDate(todayKey(d));
  }, []);

  const create = () => {
    if (!company.trim() || !date) return;
    // Personalize the plan from the customer's situation + weakest dimension.
    const profile = getProfile();
    const recent = getSessions().slice(-5);
    let weakestDimension = "";
    if (recent.length) {
      const dims: Dimension[] = ["clarity", "relevance", "specificity", "confidence", "conciseness"];
      let lowest = 101;
      for (const k of dims) {
        const avg = average(recent.map((x) => x.dimensions[k] || 0));
        if (avg < lowest) { lowest = avg; weakestDimension = k; }
      }
    }
    const p = generatePlan({ company, role, dateISO: date, situation: profile.situation, weakestDimension });
    savePlan(p);
    setPlan(p);
    track("interview_tracked", { source: "plan" });
    const email = getProfile().email;
    if (email) {
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "plan", to: email, company, dateLong: formatDateLong(date) }),
      }).catch(() => {});
    }
  };

  const toggle = (taskId: string) => {
    togglePlanTask(taskId);
    setPlan(getPlan());
  };

  const reset = () => {
    clearPlan();
    setPlan(null);
  };

  if (!mounted) return <AppShell><main className="min-h-screen" /></AppShell>;

  if (!plan) {
    return (
      <AppShell>
        <main className="container-content py-12">
          <div className="mb-8 text-center">
            <span
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white shadow-sm"
              style={{ background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))" }}
            >
              <CalendarCheck size={24} />
            </span>
            <h1 className="mt-4 font-serif text-3xl font-semibold text-ink sm:text-4xl">Got an interview coming up?</h1>
            <p className="mx-auto mt-3 max-w-prose text-ink-2">
              Tell us when it is. We will build a simple day-by-day plan so you always know what to do next.
            </p>
          </div>

          <div className="card p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company">
                <input className="field" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g., Mercy Hospital" autoFocus />
              </Field>
              <Field label="Role">
                <input className="field" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g., Office Manager" />
              </Field>
            </div>
            <Field label="Interview date" className="mt-4">
              <input className="field sm:max-w-xs" type="date" value={date} min={todayKey()} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Button onClick={create} disabled={!company.trim() || !date} size="lg" className="mt-6 w-full sm:w-auto">
              Build my plan <Sparkles size={16} />
            </Button>
          </div>
        </main>
      </AppShell>
    );
  }

  const allTasks = plan.days.flatMap((d) => d.tasks);
  const doneCount = allTasks.filter((t) => t.done).length;
  const left = daysUntil(plan.dateISO);

  return (
    <AppShell>
      <main className="container-content py-10">
        {/* header */}
        <div
          className="relative overflow-hidden rounded-2xl p-7 text-white shadow-xl sm:p-8"
          style={{ background: "linear-gradient(135deg, #19a9b8 0%, #14808e 55%, #0c5660 120%)" }}
        >
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-25 blur-2xl" style={{ background: "radial-gradient(circle, #fff, transparent)" }} />
          <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-white/70">Your prep plan</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">
            {plan.company || "Your interview"}
          </h1>
          <p className="mt-1 text-white/85">
            {plan.role ? `${plan.role} · ` : ""}
            {left === 0 ? "Interview is today. You've got this." : left === 1 ? "1 day to go" : `${left} days to go`} ·{" "}
            {formatDateLong(plan.dateISO)}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${allTasks.length ? (doneCount / allTasks.length) * 100 : 0}%` }} />
            </div>
            <span className="text-sm text-white/85">{doneCount} of {allTasks.length} done</span>
          </div>
        </div>

        {/* days */}
        <div className="mt-6 space-y-4">
          {plan.days.map((day, di) => (
            <motion.div key={di} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: di * 0.05 }} className="card p-6">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-serif text-lg font-semibold text-ink">{day.label}</h2>
                <span className="text-xs text-ink-3">{formatDateLong(day.whenISO)}</span>
              </div>
              <div className="space-y-2">
                {day.tasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                    <button onClick={() => toggle(t.id)} aria-label={t.done ? "Mark not done" : "Mark done"} className="shrink-0">
                      {t.done ? (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-sage text-white">
                          <Check size={14} />
                        </span>
                      ) : (
                        <Circle size={24} className="text-ink-3" />
                      )}
                    </button>
                    <span className={cn("flex-1 text-sm font-medium", t.done ? "text-ink-3 line-through" : "text-ink")}>{t.label}</span>
                    <Link href={t.href} className="inline-flex items-center gap-1 text-sm font-medium text-primary-ink hover:underline">
                      Do it <ArrowRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button onClick={reset} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
            <RotateCcw size={14} /> Start a new plan
          </button>
        </div>
      </main>
    </AppShell>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}
