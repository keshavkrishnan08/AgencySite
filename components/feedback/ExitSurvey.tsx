"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PartyPopper, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { anonId } from "@/lib/attribution";
import { getProfile, getSessions, getStreak } from "@/lib/store";
import { average } from "@/lib/utils";

/* The cancel flow, which is really the outcome-collection flow.
 *
 * "I got the job" is the first option and the only one styled like good news,
 * because for this product it is: a job seeker churning because they got hired
 * is the success case, and it's the one statistic nothing else in the app can
 * observe. People will tell you here and essentially nowhere else.
 *
 * Everything is optional. Cancelling never depends on answering. */

const REASONS: { value: string; label: string; emoji: string; good?: boolean }[] = [
  { value: "got_job", label: "I got the job", emoji: "🎉", good: true },
  { value: "still_looking", label: "Still looking, just pausing", emoji: "🔎" },
  { value: "took_break", label: "Taking a break from searching", emoji: "☕" },
  { value: "too_expensive", label: "Too expensive", emoji: "💸" },
  { value: "not_useful", label: "Didn't help enough", emoji: "😕" },
  { value: "missing_features", label: "Missing something I needed", emoji: "🧩" },
  { value: "other", label: "Something else", emoji: "…" },
];

const SALARY_BANDS = ["Under $40k", "$40–60k", "$60–80k", "$80–110k", "$110k+", "Rather not say"];

export function ExitSurvey({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [reason, setReason] = useState<string>("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [salaryBand, setSalaryBand] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const gotJob = reason === "got_job";

  const submit = async () => {
    setBusy(true);
    const profile = getProfile();
    const sessions = getSessions();
    const streak = getStreak();
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "outcome",
          reason: reason || "other",
          email: profile.email || null,
          anonId: anonId(),
          company: company.trim() || null,
          role: role.trim() || profile.targetRole || null,
          salaryBand: salaryBand || null,
          detail: detail.trim() || null,
          sessionsDone: sessions.length,
          readiness: sessions.length ? average(sessions.slice(-5).map((s) => s.overall)) : null,
          bestScore: sessions.length ? Math.max(...sessions.map((s) => s.overall)) : null,
          streakLongest: streak.longest,
        }),
      });
    } catch {
      /* cancelling must never depend on this succeeding */
    }
    setBusy(false);
    if (gotJob) {
      setCelebrating(true);
      setTimeout(onConfirm, 2600);
      return;
    }
    onConfirm();
  };

  if (celebrating) {
    return (
      <Backdrop onClose={() => {}}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-elevated w-full max-w-md p-8 text-center"
        >
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage-soft text-sage-ink">
            <PartyPopper size={30} />
          </span>
          <h2 className="mt-5 font-serif text-2xl font-semibold text-ink">
            That&apos;s the whole point.
          </h2>
          <p className="mt-2 text-ink-2">
            Congratulations{company.trim() ? ` on ${company.trim()}` : ""}. You did the work, you
            walked in ready, and you got it. Go celebrate.
          </p>
        </motion.div>
      </Backdrop>
    );
  }

  return (
    <Backdrop onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="card-elevated max-h-[85vh] w-full max-w-lg overflow-y-auto p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-ink">Before you go</h2>
            <p className="mt-1 text-sm text-ink-2">
              One question, and it&apos;s optional. It&apos;s the only way we learn whether this
              actually works.
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-ink-3 transition-colors hover:bg-bg-tint hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {REASONS.map((r) => {
            const active = reason === r.value;
            return (
              <button
                key={r.value}
                onClick={() => setReason(r.value)}
                className="flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all"
                style={{
                  borderColor: active ? (r.good ? "var(--sage)" : "var(--primary)") : "var(--border)",
                  background: active ? (r.good ? "var(--sage-soft)" : "var(--primary-soft)") : "transparent",
                  color: active ? (r.good ? "var(--sage-ink)" : "var(--primary-ink)") : "var(--ink-2)",
                }}
              >
                <span className="text-base">{r.emoji}</span>
                {r.label}
              </button>
            );
          })}
        </div>

        {gotJob && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 space-y-3 overflow-hidden rounded-xl p-4"
            style={{ background: "var(--sage-soft)" }}
          >
            <p className="text-sm font-semibold text-sage-ink">
              Congratulations. Tell us where, if you don&apos;t mind?
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" className="field bg-white text-sm" />
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (optional)" className="field bg-white text-sm" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-sage-ink">Salary range (optional)</p>
              <div className="flex flex-wrap gap-1.5">
                {SALARY_BANDS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSalaryBand(salaryBand === b ? "" : b)}
                    className="rounded-full border px-2.5 py-1 text-2xs font-medium transition-all"
                    style={{
                      borderColor: salaryBand === b ? "var(--sage)" : "var(--border-strong)",
                      background: salaryBand === b ? "#fff" : "transparent",
                      color: salaryBand === b ? "var(--sage-ink)" : "var(--ink-2)",
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {reason && !gotJob && (
          <motion.textarea
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Anything we should fix? (optional)"
            className="field mt-4 min-h-[72px] resize-y text-sm"
          />
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button onClick={onClose} className="btn-ghost text-sm">
            Never mind, stay
          </button>
          <Button onClick={submit} disabled={busy} variant={gotJob ? "primary" : "secondary"}>
            {busy ? "Saving…" : gotJob ? "Send and cancel" : "Cancel my plan"}
          </Button>
        </div>
      </motion.div>
    </Backdrop>
  );
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
        {children}
      </div>
    </div>
  );
}
