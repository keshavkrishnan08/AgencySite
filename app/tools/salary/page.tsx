"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MessageSquare, Send, Sparkles, TrendingUp } from "lucide-react";
import { ToolShell } from "@/components/layout/ToolShell";
import { SalaryIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ScoreNumber } from "@/components/ui/Score";
import { getProfile } from "@/lib/store";
import { suggestSalaryRange } from "@/lib/salary";
import { Inline } from "@/components/ui/RichText";
import { average, scoreColor } from "@/lib/utils";

type Turn =
  | { kind: "manager"; text: string }
  | { kind: "you"; text: string }
  | { kind: "coach"; text: string; scores: { confidence: number; specificity: number; composure: number } };

const MAX_ROUNDS = 4;

export default function SalaryPage() {
  const [phase, setPhase] = useState<"setup" | "chat" | "done">("setup");
  const [role, setRole] = useState("");
  const [range, setRange] = useState("");
  const [target, setTarget] = useState("");
  const [walkaway, setWalkaway] = useState("");
  const [thread, setThread] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [round, setRound] = useState(0);
  const [loading, setLoading] = useState(false);
  const [overalls, setOveralls] = useState<number[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Prefill a role-aware estimate so the practice is custom to their job.
  useEffect(() => {
    const r = getProfile().targetRole || "this role";
    setRole(r);
    const est = suggestSalaryRange(r);
    setRange(est.range);
    setTarget(String(est.target));
    setWalkaway(String(est.walkaway));
  }, []);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [thread, phase]);

  const start = async () => {
    setPhase("chat");
    setLoading(true);
    try {
      const res = await fetch("/api/salary-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round: 0, message: "", role }),
      });
      const data = await res.json();
      setThread([{ kind: "manager", text: data.interviewerLine }]);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const message = input.trim();
    setInput("");
    setThread((t) => [...t, { kind: "you", text: message }]);
    setLoading(true);
    try {
      const res = await fetch("/api/salary-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round,
          message,
          target: Number(target) || 0,
          walkaway: Number(walkaway) || 0,
          range,
          role,
        }),
      });
      const data = await res.json();
      const scores = {
        confidence: data.confidence ?? 60,
        specificity: data.specificity ?? 60,
        composure: data.composure ?? 60,
      };
      const turnOverall = Math.round((scores.confidence + scores.specificity + scores.composure) / 3);
      const nextOveralls = [...overalls, turnOverall];
      setOveralls(nextOveralls);

      setThread((t) => [...t, { kind: "coach", text: data.feedback, scores }]);

      const nextRound = round + 1;
      if (data.accepted || nextRound >= MAX_ROUNDS) {
        setTimeout(() => {
          setThread((t) => [...t, { kind: "manager", text: data.interviewerLine }]);
          setPhase("done");
        }, 400);
      } else {
        setTimeout(() => setThread((t) => [...t, { kind: "manager", text: data.interviewerLine }]), 400);
        setRound(nextRound);
      }
    } finally {
      setLoading(false);
    }
  };

  const finalScore = average(overalls);

  return (
    <ToolShell
      icon={SalaryIcon}
      title="Salary Negotiation Practice"
      description="They offered the job. Then asked your number. Most people leave $5,000-$15,000 on the table. Practice the conversation until your voice doesn't shake."
    >
      {phase === "setup" && (
        <div className="card p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role">
              <input className="field" value={role} onChange={(e) => setRole(e.target.value)} />
            </Field>
            <Field label="Market range for this role">
              <input className="field" value={range} onChange={(e) => setRange(e.target.value)} />
            </Field>
            <Field label="Your target number ($)">
              <input className="field" type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
            <Field label="Your walkaway number ($)">
              <input className="field" type="number" value={walkaway} onChange={(e) => setWalkaway(e.target.value)} />
            </Field>
          </div>
          <Button onClick={start} size="lg" className="mt-6 w-full">
            Start the negotiation <Sparkles size={16} />
          </Button>
          <p className="mt-3 text-center text-sm text-ink-3">
            The hiring manager will push back. Hold your number, justify it, and stay composed.
          </p>
        </div>
      )}

      {(phase === "chat" || phase === "done") && (
        <div className="space-y-4">
          {thread.map((turn, i) => (
            <TurnBubble key={i} turn={turn} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-ink-3">
              <Loader2 size={15} className="animate-spin" /> The hiring manager is responding…
            </div>
          )}

          {phase === "done" && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-7 text-center">
              <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">Negotiation score</p>
              <ScoreNumber value={finalScore} className="text-6xl" suffix />
              <p className="mx-auto mt-3 max-w-sm text-ink-2">
                {finalScore >= 75
                  ? "Strong. You held your number and justified it with value. That's exactly how this should sound."
                  : finalScore >= 55
                  ? "Solid start. Next time, anchor higher and tie your number to data so you don't fold when they push."
                  : "You left money on the table. Practice holding firm: 'Based on my experience and the value I'd bring, I think my target is fair. Are there other components we can flex?'"}
              </p>
              <Button onClick={() => { setPhase("setup"); setThread([]); setRound(0); setOveralls([]); }} className="mt-6">
                <TrendingUp size={16} /> Practice again
              </Button>
            </motion.div>
          )}

          {phase === "chat" && (
            <div className="sticky bottom-4 mt-4 flex items-end gap-3 rounded-xl border bg-white/90 p-3 shadow-lg backdrop-blur" style={{ borderColor: "var(--border)" }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Your response…"
                className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 leading-relaxed outline-none"
                rows={1}
                autoFocus
              />
              <Button onClick={send} disabled={loading || !input.trim()}>
                <Send size={16} /> Send
              </Button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </ToolShell>
  );
}

function TurnBubble({ turn }: { turn: Turn }) {
  if (turn.kind === "manager") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-2xs font-bold text-white">HM</span>
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm border bg-surface px-4 py-3 text-ink shadow-sm" style={{ borderColor: "var(--border)" }}>
          <Inline text={turn.text} />
        </div>
      </motion.div>
    );
  }
  if (turn.kind === "you") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 text-white shadow-sm" style={{ background: "linear-gradient(135deg, var(--primary-bright), var(--primary-ink))" }}>
          {turn.text}
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-amber-soft/40 p-4" style={{ borderColor: "var(--border)" }}>
      <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-amber-ink">
        <Sparkles size={13} /> Coach
      </div>
      <p className="text-sm leading-relaxed text-ink-2"><Inline text={turn.text} /></p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["confidence", "specificity", "composure"] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-2 shadow-xs">
            <span className="capitalize">{k}</span>
            <span className="font-mono font-bold" style={{ color: scoreColor(turn.scores[k]) }}>{turn.scores[k]}</span>
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}
