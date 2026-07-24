"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Building2, Check, Loader2, Lock, Mic, Sparkles, TrendingUp } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ScoreNumber, DimensionBars } from "@/components/ui/Score";
import { scoreLabel, scoreColor } from "@/lib/utils";

/* A looping, expedited carbon-copy of the WHOLE main flow, shown inside a Safari
   window: pick the interview type + role + company, generate questions, then go
   through every question (answer types itself, gets scored), and finish on the
   session summary. Same components and colorway as the live app. */

const ROLES = ["Office Manager", "Registered Nurse", "Sales Rep", "Project Manager"];
const ROLE_I = 0;
const COMPANY = "Mercy Hospital";

interface Q {
  q: string;
  a: string;
  scores: { clarity: number; relevance: number; specificity: number; confidence: number; conciseness: number };
  overall: number;
  improve: string;
}

const QUESTIONS: Q[] = [
  {
    q: "Tell me about yourself.",
    a: "I've run front-office operations for eight years, most recently leading a ten-person team and cutting scheduling errors by a third.",
    scores: { clarity: 84, relevance: 86, specificity: 80, confidence: 82, conciseness: 88 },
    overall: 84,
    improve: "Trim the intro by a sentence so your result lands sooner.",
  },
  {
    q: "Tell me about a time you handled conflict.",
    a: "When two departments clashed over coverage, I set a shared schedule and a weekly check-in. The friction stopped and we kept full coverage.",
    scores: { clarity: 82, relevance: 88, specificity: 74, confidence: 80, conciseness: 85 },
    overall: 81,
    improve: "Add a number to the result so it lands harder.",
  },
  {
    q: "Why are you leaving your current role?",
    a: "I've grown as far as I can here and I want a bigger team to lead. Mercy's scale is exactly the next step I'm looking for.",
    scores: { clarity: 86, relevance: 84, specificity: 72, confidence: 85, conciseness: 90 },
    overall: 83,
    improve: "Name one specific thing about Mercy to show you did the homework.",
  },
];
const SUMMARY_AVG = 83;

type Scene = "setup" | "loading" | "question" | "summary";
type Phase = "typing" | "submitting" | "scored";

export function ProductDemo() {
  const [scene, setScene] = useState<Scene>("setup");
  const [selRole, setSelRole] = useState<number | null>(null);
  const [company, setCompany] = useState("");
  const [qi, setQi] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");
  const [rev, setRev] = useState(0); // bumps to re-trigger score animations

  useEffect(() => {
    let alive = true;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const type = async (text: string, set: (s: string) => void, speed = 16) => {
      for (let i = 1; i <= text.length; i++) {
        if (!alive) return;
        set(text.slice(0, i));
        await sleep(speed);
      }
    };

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setScene("question");
      setSelRole(ROLE_I);
      setCompany(COMPANY);
      setQi(1);
      setTyped(QUESTIONS[1].a);
      setPhase("scored");
      return () => {
        alive = false;
      };
    }

    async function loop() {
      while (alive) {
        // ---- reset ----
        setScene("setup");
        setSelRole(null);
        setCompany("");
        setQi(0);
        setTyped("");
        setPhase("typing");
        await sleep(900);
        if (!alive) return;

        // ---- setup: pick role + type company ----
        setSelRole(ROLE_I);
        await sleep(750);
        if (!alive) return;
        await type(COMPANY, setCompany, 55);
        await sleep(650);
        if (!alive) return;

        // ---- generating questions ----
        setScene("loading");
        await sleep(1200);
        if (!alive) return;

        // ---- go through every question ----
        for (let i = 0; i < QUESTIONS.length; i++) {
          if (!alive) return;
          setScene("question");
          setQi(i);
          setPhase("typing");
          setTyped("");
          await sleep(450);
          if (!alive) return;
          await type(QUESTIONS[i].a, setTyped, 14);
          await sleep(400);
          if (!alive) return;
          setPhase("submitting");
          await sleep(950);
          if (!alive) return;
          setPhase("scored");
          setRev((r) => r + 1);
          await sleep(2500);
        }
        if (!alive) return;

        // ---- session summary ----
        setScene("summary");
        setRev((r) => r + 1);
        await sleep(3800);
      }
    }

    loop();
    return () => {
      alive = false;
    };
  }, []);

  const total = QUESTIONS.length;
  const cur = QUESTIONS[qi];
  const progress =
    scene === "summary" ? 100 : scene === "question" ? ((qi + (phase === "scored" ? 1 : 0)) / total) * 100 : 4;

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      {/* ambient glow */}
      <div
        className="absolute -inset-6 -z-10 rounded-[44px] opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(55% 55% at 25% 15%, rgba(25,169,184,0.26), transparent), radial-gradient(50% 50% at 90% 95%, rgba(184,137,59,0.20), transparent)",
        }}
      />

      {/* ---- Safari window chrome ---- */}
      <div className="overflow-hidden rounded-2xl border shadow-2xl" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex items-center gap-3 border-b px-4 py-2.5" style={{ borderColor: "var(--border)", background: "var(--bg-sunk)" }}>
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
            <span className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
            <span className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
          </div>
          <div className="mx-auto flex min-w-[220px] max-w-[60%] items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs text-ink-3 shadow-inner" style={{ background: "var(--surface)" }}>
            <Lock size={11} /> axonservices.dev/practice
          </div>
          <div className="w-8" />
        </div>

        {/* ---- in-app header ---- */}
        <div className="flex items-center justify-between gap-4 border-b px-5 py-3" style={{ borderColor: "var(--border)" }}>
          <Logo />
          <div className="flex flex-1 items-center justify-center gap-3">
            <span className="hidden text-xs font-medium text-ink-2 sm:inline">
              {scene === "question" ? `Question ${qi + 1} of ${total}` : scene === "summary" ? "Session complete" : "New session"}
            </span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full sm:w-40" style={{ background: "var(--bg-tint)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: "var(--primary)" }} />
            </div>
          </div>
          <span className="chip">Behavioral</span>
        </div>

        {/* ---- body ---- */}
        <div className="min-h-[546px] p-6 sm:p-10">
          <AnimatePresence mode="wait">
            {/* ===== SETUP ===== */}
            {scene === "setup" && (
              <motion.div key="setup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
                <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-primary-ink">Set up your practice</p>
                <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">What are you preparing for?</h3>

                <p className="mt-5 text-sm font-medium text-ink-2">Your role</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ROLES.map((r, i) => (
                    <span
                      key={r}
                      className="rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition-all"
                      style={
                        selRole === i
                          ? { borderColor: "var(--primary)", background: "var(--primary-soft)", color: "var(--primary-ink)" }
                          : { borderColor: "var(--border)", color: "var(--ink-2)" }
                      }
                    >
                      {selRole === i && <Check size={13} className="mr-1 inline" />}
                      {r}
                    </span>
                  ))}
                </div>

                <p className="mt-6 text-sm font-medium text-ink-2">Company <span className="text-ink-3">(optional)</span></p>
                <div className="field mt-2 flex items-center gap-2">
                  <Building2 size={16} className="text-ink-3" />
                  {company || <span className="text-ink-3">e.g. Mercy Hospital</span>}
                  {selRole !== null && company.length < COMPANY.length && (
                    <span className="inline-block animate-pulse text-primary-ink">▌</span>
                  )}
                </div>

                <div className="mt-7 flex justify-end">
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
                    style={{ background: "linear-gradient(135deg, var(--primary-bright), var(--primary-ink))", opacity: company === COMPANY ? 1 : 0.55 }}
                  >
                    Start practice <ArrowRight size={16} />
                  </span>
                </div>
              </motion.div>
            )}

            {/* ===== LOADING ===== */}
            {scene === "loading" && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="flex min-h-[468px] flex-col items-center justify-center text-center">
                <Loader2 size={32} className="animate-spin text-primary" />
                <p className="mt-5 font-serif text-xl font-semibold text-ink">Building your questions…</p>
                <p className="mt-2 text-sm text-ink-2">
                  Tailored for an <span className="font-medium text-ink">{ROLES[ROLE_I]}</span> at <span className="font-medium text-ink">{COMPANY}</span>
                </p>
              </motion.div>
            )}

            {/* ===== QUESTION ===== */}
            {scene === "question" && (
              <motion.div key={`q-${qi}-${phase === "scored" ? "s" : "a"}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
                {phase !== "scored" ? (
                  <>
                    <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-primary-ink">Question {qi + 1}</p>
                    <h3 className="mt-2 font-serif text-2xl font-semibold leading-snug text-ink sm:text-3xl">{cur.q}</h3>
                    <div className="field mt-5 min-h-[182px] leading-relaxed text-ink">
                      {typed || <span className="text-ink-3">Type your answer, or tap the mic to speak…</span>}
                      {phase === "typing" && <span className="ml-0.5 inline-block animate-pulse text-primary-ink">▌</span>}
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className="chip"><Mic size={14} /> Tap to speak</span>
                      <span className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm" style={{ background: "linear-gradient(135deg, var(--primary-bright), var(--primary-ink))" }}>
                        {phase === "submitting" ? (<><Loader2 size={16} className="animate-spin" /> Scoring…</>) : (<>Score answer <ArrowRight size={16} /></>)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="space-y-5">
                    <div className="flex gap-2.5 rounded-xl border bg-amber-soft/40 p-4" style={{ borderColor: "var(--border)" }}>
                      <TrendingUp size={18} className="mt-0.5 shrink-0 text-amber-ink" />
                      <div>
                        <p className="text-2xs font-semibold uppercase tracking-wider text-amber-ink">Work on this next</p>
                        <p className="mt-1 text-[0.95rem] leading-relaxed text-ink">{cur.improve}</p>
                      </div>
                    </div>
                    <div className="card grid items-center gap-7 p-6 sm:grid-cols-[auto_1fr] sm:p-7">
                      <div className="text-center sm:border-r sm:pr-7" style={{ borderColor: "var(--border)" }}>
                        <ScoreNumber key={rev} value={cur.overall} className="text-[4rem]" />
                        <p className="mt-1 text-sm font-semibold" style={{ color: scoreColor(cur.overall) }}>{scoreLabel(cur.overall)}</p>
                        <p className="mt-0.5 text-2xs uppercase tracking-wider text-ink-3">out of 100</p>
                      </div>
                      <DimensionBars key={rev} dimensions={cur.scores} />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ===== SUMMARY ===== */}
            {scene === "summary" && (
              <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage-soft text-sage-ink"><Sparkles size={26} /></span>
                <h3 className="mt-4 font-serif text-2xl font-semibold text-ink">Session complete</h3>
                <ScoreNumber key={rev} value={SUMMARY_AVG} className="mt-2 text-[3.5rem]" />
                <p className="text-sm font-semibold text-sage-ink">You&apos;re interview-ready.</p>
                <div className="mx-auto mt-6 max-w-md space-y-2 text-left">
                  {QUESTIONS.map((q) => (
                    <div key={q.q} className="flex items-center justify-between rounded-xl bg-bg-sunk px-4 py-2.5">
                      <span className="truncate pr-3 text-sm text-ink-2">{q.q}</span>
                      <span className="font-mono text-sm font-bold" style={{ color: scoreColor(q.overall) }}>{q.overall}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
