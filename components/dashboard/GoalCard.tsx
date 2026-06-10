"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Target, ArrowRight, Check } from "lucide-react";
import { getGoal, setGoal } from "@/lib/store";

/* Interview countdown. Natural urgency + a reason to come back daily: set the
   date once, then every visit shows days left and how many sessions to go. */

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function GoalCard({ sessionsDone }: { sessionsDone: number }) {
  const [date, setDate] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDate(getGoal().interviewDate);
  }, []);

  const save = () => {
    if (!draft) return;
    setGoal({ interviewDate: draft });
    setDate(draft);
    setEditing(false);
  };
  const clear = () => {
    setGoal({ interviewDate: null });
    setDate(null);
    setDraft("");
  };

  // ---- no date yet (or editing): the prompt ----
  if (!date || editing) {
    return (
      <div className="card-elevated flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink">
            <Target size={20} />
          </span>
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink">When&apos;s your interview?</h2>
            <p className="text-sm text-ink-2">Set the date and we&apos;ll build a countdown and pace your practice.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="field !py-2 !text-sm"
          />
          <button
            onClick={save}
            disabled={!draft}
            className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--primary-bright), var(--primary-ink))" }}
          >
            Set
          </button>
        </div>
      </div>
    );
  }

  const left = daysUntil(date);

  // ---- interview has passed ----
  if (left < 0) {
    return (
      <div className="card-elevated flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sage-soft text-sage-ink">
            <Check size={20} />
          </span>
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink">How did it go?</h2>
            <p className="text-sm text-ink-2">Log a debrief while it&apos;s fresh, or set your next interview date.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/tools/debrief" className="font-semibold text-primary-ink hover:underline">Debrief</Link>
          <button onClick={() => { setDraft(""); setEditing(true); }} className="font-semibold text-ink-2 hover:text-ink">New date</button>
        </div>
      </div>
    );
  }

  // ---- countdown + pacing nudge ----
  const recommended = Math.max(3, Math.min(left, 10)); // a sensible target run
  const remaining = Math.max(0, recommended - sessionsDone);
  const nudge =
    left === 0 ? "It's today. One quick warm-up session and walk in ready."
    : remaining > 0 ? `${remaining} more ${remaining === 1 ? "session" : "sessions"} recommended before then.`
    : "You're on pace. Keep the streak going.";

  return (
    <div className="card-elevated flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-coral-soft text-coral-ink">
          <CalendarClock size={22} />
        </span>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-semibold text-ink">{left === 0 ? "Today" : left}</span>
            {left > 0 && <span className="text-sm font-medium text-ink-2">{left === 1 ? "day" : "days"} until your interview</span>}
          </div>
          <p className="mt-0.5 text-sm text-ink-2">{nudge}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/practice?autostart=1"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, var(--primary-bright), var(--primary-ink))" }}
        >
          Practice now <ArrowRight size={15} />
        </Link>
        <button onClick={() => { setDraft(date); setEditing(true); }} className="text-xs font-medium text-ink-3 hover:text-ink">Edit</button>
        <button onClick={clear} className="text-xs font-medium text-ink-3 hover:text-ink">Clear</button>
      </div>
    </div>
  );
}
