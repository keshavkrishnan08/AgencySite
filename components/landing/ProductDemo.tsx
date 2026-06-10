"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2, Mic, TrendingUp } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ScoreNumber, DimensionBars } from "@/components/ui/Score";
import { scoreLabel, scoreColor } from "@/lib/utils";

/* A looping, expedited carbon-copy of the real practice screen: a question comes
   up, the answer types itself out, it gets "scored," and the score reveal slides
   in (overall + the five dimension bars + the one thing to fix). Same components
   and colorway as the live app — this IS the product, just sped up. */

const QUESTION = "Tell me about a time you handled conflict at work.";
const ANSWER =
  "When a project stalled over a deadline disagreement, I set up a call, heard the other team out, and we agreed on a phased timeline. We shipped two days early.";
const SCORES = { clarity: 82, relevance: 88, specificity: 74, confidence: 80, conciseness: 85 };
const OVERALL = 81;
const IMPROVE = [
  "Add one number to your result so it lands harder.",
  "Lead with the outcome, then the backstory.",
];

type Phase = "typing" | "submitting" | "scored";

export function ProductDemo() {
  const [cycle, setCycle] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => {
      const t = setTimeout(() => alive && fn(), ms);
      timers.push(t);
    };

    setPhase("typing");
    setTyped("");

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setTyped(ANSWER);
      setPhase("scored");
      after(6000, () => setCycle((c) => c + 1));
      return () => {
        alive = false;
        timers.forEach(clearTimeout);
      };
    }

    let i = 0;
    const typeId = setInterval(() => {
      if (!alive) return;
      i += 1;
      setTyped(ANSWER.slice(0, i));
      if (i >= ANSWER.length) {
        clearInterval(typeId);
        after(650, () => {
          setPhase("submitting");
          after(1100, () => {
            setPhase("scored");
            after(4400, () => setCycle((c) => c + 1));
          });
        });
      }
    }, 22);

    return () => {
      alive = false;
      clearInterval(typeId);
      timers.forEach(clearTimeout);
    };
  }, [cycle]);

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      {/* ambient glow */}
      <div
        className="absolute -inset-6 -z-10 rounded-[44px] opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(55% 55% at 25% 15%, rgba(25,169,184,0.26), transparent), radial-gradient(50% 50% at 90% 95%, rgba(184,137,59,0.20), transparent)",
        }}
      />

      <div className="card-elevated overflow-hidden p-0">
        {/* app top bar — mirrors the real practice header */}
        <div
          className="glass flex items-center justify-between gap-4 border-b px-5 py-3.5"
          style={{ borderColor: "var(--border)" }}
        >
          <Logo />
          <div className="flex flex-1 items-center justify-center gap-3">
            <span className="hidden text-xs font-medium text-ink-2 sm:inline">Question 2 of 8</span>
            <div className="h-1.5 w-28 overflow-hidden rounded-full sm:w-44" style={{ background: "var(--bg-tint)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: phase === "scored" ? "37%" : "25%", background: "var(--primary)" }}
              />
            </div>
          </div>
          <span className="chip">Behavioral</span>
        </div>

        {/* body */}
        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {phase !== "scored" ? (
              <motion.div
                key="answer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-primary-ink">
                  Question
                </p>
                <h3 className="mt-2 font-serif text-2xl font-semibold leading-snug text-ink sm:text-3xl">
                  {QUESTION}
                </h3>

                <div className="field mt-5 min-h-[150px] leading-relaxed text-ink">
                  {typed || <span className="text-ink-3">Type your answer, or tap the mic to speak…</span>}
                  {phase === "typing" && (
                    <span className="ml-0.5 inline-block animate-pulse text-primary-ink">▌</span>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="chip">
                    <Mic size={14} /> Tap to speak
                  </span>
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
                    style={{ background: "linear-gradient(135deg, var(--primary-bright), var(--primary-ink))" }}
                  >
                    {phase === "submitting" ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Scoring…
                      </>
                    ) : (
                      <>
                        Score answer <ArrowRight size={16} />
                      </>
                    )}
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="score"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-5"
              >
                {/* what to fix — the minimal coach output */}
                <div className="flex gap-2.5 rounded-xl border bg-amber-soft/40 p-4" style={{ borderColor: "var(--border)" }}>
                  <TrendingUp size={18} className="mt-0.5 shrink-0 text-amber-ink" />
                  <div>
                    <p className="text-2xs font-semibold uppercase tracking-wider text-amber-ink">Work on this next</p>
                    <ul className="mt-1.5 space-y-1">
                      {IMPROVE.map((t) => (
                        <li key={t} className="text-[0.95rem] leading-relaxed text-ink">{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* overall + dimension breakdown */}
                <div className="card grid items-center gap-7 p-6 sm:grid-cols-[auto_1fr] sm:p-7">
                  <div className="text-center sm:border-r sm:pr-7" style={{ borderColor: "var(--border)" }}>
                    <ScoreNumber key={cycle} value={OVERALL} className="text-[4rem]" />
                    <p className="mt-1 text-sm font-semibold" style={{ color: scoreColor(OVERALL) }}>
                      {scoreLabel(OVERALL)}
                    </p>
                    <p className="mt-0.5 text-2xs uppercase tracking-wider text-ink-3">out of 100</p>
                  </div>
                  <DimensionBars key={cycle} dimensions={SCORES} />
                </div>

                <div className="flex items-center gap-2 px-1 text-sm text-sage-ink">
                  <Check size={15} /> Scored in seconds. Same rules every session.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
