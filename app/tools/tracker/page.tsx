"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Plus, Trash2, Trophy } from "lucide-react";
import { ToolShell } from "@/components/layout/ToolShell";
import { TrackerIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { deleteInterview, getInterviews, getProfile, saveInterview } from "@/lib/store";
import { track } from "@/lib/analytics";
import { cn, formatDateLong, todayKey, uid } from "@/lib/utils";
import type { InterviewRecord, InterviewStatus } from "@/lib/types";

const STATUS: { value: InterviewStatus; label: string; color: string; bg: string }[] = [
  { value: "upcoming", label: "Upcoming", color: "var(--primary-ink)", bg: "var(--primary-soft)" },
  { value: "completed", label: "Interviewed", color: "var(--amber-ink)", bg: "var(--amber-soft)" },
  { value: "callback", label: "Callback", color: "var(--gold-ink)", bg: "var(--gold-soft)" },
  { value: "offer", label: "Offer 🎉", color: "var(--sage-ink)", bg: "var(--sage-soft)" },
  { value: "rejected", label: "No this time", color: "var(--ink-3)", bg: "var(--bg-tint)" },
];
const meta = (s: InterviewStatus) => STATUS.find((x) => x.value === s)!;

export default function TrackerPage() {
  const [items, setItems] = useState<InterviewRecord[]>([]);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [date, setDate] = useState(todayKey());

  useEffect(() => {
    setItems(getInterviews());
    setRole(getProfile().targetRole || "");
  }, []);

  const add = () => {
    if (!company.trim()) return;
    saveInterview({
      id: uid("iv"),
      company: company.trim(),
      role: role.trim() || ", ",
      date,
      status: "upcoming",
      createdAt: new Date().toISOString(),
    });
    setItems(getInterviews());
    setCompany("");
    track("interview_tracked", {});
  };

  const setStatus = (rec: InterviewRecord, status: InterviewStatus) => {
    saveInterview({ ...rec, status });
    setItems(getInterviews());
    if (status === "offer") track("offer_logged", { company: rec.company });
  };
  const remove = (id: string) => {
    deleteInterview(id);
    setItems(getInterviews());
  };

  const offers = items.filter((i) => i.status === "offer").length;
  const callbacks = items.filter((i) => i.status === "callback").length;
  const upcoming = items.filter((i) => i.status === "upcoming").length;

  return (
    <ToolShell
      icon={TrackerIcon}
      title="Interview Tracker"
      description="Practice is the input. Offers are the point. Track every real interview here so you can see what's actually working. And prove PrepPath got you there."
    >
      {/* stats */}
      {items.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard label="Upcoming" value={upcoming} />
          <StatCard label="Callbacks" value={callbacks} />
          <StatCard label="Offers" value={offers} highlight />
        </div>
      )}

      {/* add form */}
      <div className="card p-6">
        <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_auto]">
          <input className="field" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" onKeyDown={(e) => e.key === "Enter" && add()} />
          <input className="field" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" />
          <input className="field sm:w-40" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button onClick={add} disabled={!company.trim()} className="mt-4 w-full sm:w-auto">
          <Plus size={16} /> Add interview
        </Button>
      </div>

      {/* list */}
      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: "var(--border-strong)" }}>
          <CalendarCheck size={32} className="mx-auto text-ink-3" />
          <p className="mt-3 text-ink-2">No interviews tracked yet. Add the next one you have lined up.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((rec) => (
            <motion.div key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">
                  {rec.company} <span className="text-ink-3">·</span> <span className="text-ink-2">{rec.role}</span>
                </p>
                <p className="text-xs text-ink-3">{rec.date ? formatDateLong(rec.date) : "No date"}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(rec, s.value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                      rec.status === s.value ? "shadow-xs ring-1" : "opacity-50 hover:opacity-100"
                    )}
                    style={{
                      background: rec.status === s.value ? s.bg : "transparent",
                      color: rec.status === s.value ? s.color : "var(--ink-3)",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button onClick={() => remove(rec.id)} className="rounded-lg p-2 text-ink-3 transition-colors hover:bg-coral-soft hover:text-coral-ink" aria-label="Delete">
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {offers > 0 && (
        <div className="mt-8 rounded-2xl border-2 p-6 text-center" style={{ borderColor: "var(--sage)", background: "var(--sage-soft)" }}>
          <Trophy size={28} className="mx-auto text-sage-ink" />
          <p className="mt-3 font-serif text-xl font-semibold text-ink">
            {offers === 1 ? "You got an offer." : `${offers} offers and counting.`}
          </p>
          <p className="mt-1 text-ink-2">That&apos;s the whole point. Nicely done.</p>
        </div>
      )}
    </ToolShell>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="card p-5 text-center">
      <div className="font-serif text-3xl font-semibold" style={{ color: highlight ? "var(--sage-ink)" : "var(--ink)" }}>
        {value}
      </div>
      <p className="mt-1 text-xs text-ink-3">{label}</p>
    </div>
  );
}
