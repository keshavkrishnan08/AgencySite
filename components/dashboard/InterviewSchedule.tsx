"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Plus, ArrowRight, X, Check, Building2 } from "lucide-react";
import {
  getSchedule,
  addScheduled,
  removeScheduled,
  setActiveInterview,
  getActiveInterview,
  type ScheduledInterview,
} from "@/lib/store";

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + "T00:00:00").getTime() - today.getTime()) / 86400000);
}
const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function InterviewSchedule({ sessionsDone }: { sessionsDone: number }) {
  const [items, setItems] = useState<ScheduledInterview[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [date, setDate] = useState("");

  const refresh = () => {
    setItems(getSchedule());
    setActiveId(getActiveInterview()?.id ?? null);
  };
  useEffect(refresh, []);

  const add = () => {
    if (!company.trim() || !date) return;
    const rec = addScheduled({ company: company.trim(), role: role.trim(), dateISO: date });
    setActiveInterview(rec.id);
    setCompany(""); setRole(""); setDate(""); setAdding(false);
    refresh();
  };
  const remove = (id: string) => { removeScheduled(id); refresh(); };
  const choose = (id: string) => { setActiveInterview(id); setActiveId(id); };

  const active = items.find((i) => i.id === activeId) || null;

  // ---- empty: first-interview prompt ----
  if (items.length === 0 && !adding) {
    return (
      <div className="card-elevated mb-6 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink">
            <CalendarClock size={20} />
          </span>
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink">Schedule your interviews</h2>
            <p className="text-sm text-ink-2">Add each one and we&apos;ll build a countdown and pace your prep, soonest first.</p>
          </div>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary shrink-0 !px-5 !py-2 text-sm">
          <Plus size={15} /> Add interview
        </button>
      </div>
    );
  }

  return (
    <div className="card-elevated mb-6 space-y-5 p-6">
      {/* Active countdown */}
      {active && (() => {
        const left = daysUntil(active.dateISO);
        const recommended = Math.max(3, Math.min(Math.max(left, 0), 10));
        const remaining = Math.max(0, recommended - sessionsDone);
        const nudge =
          left < 0 ? "This one has passed. Log a debrief or switch to your next."
          : left === 0 ? "It's today. One quick warm-up and walk in ready."
          : remaining > 0 ? `${remaining} more ${remaining === 1 ? "session" : "sessions"} recommended before then.`
          : "You're on pace. Keep the streak going.";
        return (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-coral-soft text-coral-ink">
                <CalendarClock size={22} />
              </span>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-3xl font-semibold text-ink">{left < 0 ? "Past" : left === 0 ? "Today" : left}</span>
                  {left > 0 && <span className="text-sm font-medium text-ink-2">{left === 1 ? "day" : "days"} until {active.company}</span>}
                </div>
                <p className="mt-0.5 text-sm text-ink-2">
                  {active.role ? `${active.role} · ` : ""}{nudge}
                </p>
              </div>
            </div>
            <Link
              href="/practice?autostart=1"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm"
              style={{ background: "linear-gradient(135deg, var(--primary-bright), var(--primary-ink))" }}
            >
              Practice for this <ArrowRight size={15} />
            </Link>
          </div>
        );
      })()}

      {/* Selector: choose which interview you're preparing for (practice out of order) */}
      {items.length > 0 && (
        <div>
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-ink-3">Preparing for</p>
          <div className="flex flex-wrap gap-2">
            {items.map((it) => {
              const sel = it.id === activeId;
              const left = daysUntil(it.dateISO);
              return (
                <div
                  key={it.id}
                  className="group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all"
                  style={{
                    borderColor: sel ? "var(--primary)" : "var(--border-strong)",
                    background: sel ? "var(--primary-soft)" : "var(--surface)",
                    color: sel ? "var(--primary-ink)" : "var(--ink-2)",
                  }}
                >
                  <button onClick={() => choose(it.id)} className="flex items-center gap-1.5 font-medium">
                    {sel && <Check size={13} />}
                    <Building2 size={13} className="opacity-60" />
                    {it.company}
                    <span className="text-ink-3">· {fmtDate(it.dateISO)}{left >= 0 ? ` (${left}d)` : ""}</span>
                  </button>
                  <button onClick={() => remove(it.id)} aria-label="Remove" className="text-ink-3 opacity-0 transition-opacity hover:text-coral-ink group-hover:opacity-100">
                    <X size={13} />
                  </button>
                </div>
              );
            })}
            {!adding && (
              <button
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink"
                style={{ borderColor: "var(--border-strong)" }}
              >
                <Plus size={13} /> Add
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-sunk)" }}>
          <div className="grid gap-2 sm:grid-cols-[1.3fr_1.3fr_1fr_auto]">
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className="field !py-2 !text-sm" />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (optional)" className="field !py-2 !text-sm" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field !py-2 !text-sm" />
            <div className="flex items-center gap-1.5">
              <button onClick={add} disabled={!company.trim() || !date} className="btn-primary !px-4 !py-2 text-sm disabled:opacity-50">Save</button>
              <button onClick={() => setAdding(false)} className="px-2 py-2 text-sm text-ink-3 hover:text-ink">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
