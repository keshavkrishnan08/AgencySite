"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Loader2, Mic, ShieldCheck, Star, Check,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Inline } from "@/components/ui/RichText";
import { AnswerScoreCard } from "@/components/practice/AnswerScoreCard";
import { VoiceButton } from "@/components/ui/VoiceButton";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { RadarScoreChart } from "@/components/charts/Charts";
import { apiGenerateQuestions, apiScoreAnswer } from "@/lib/client";
import { aggregateDimensions, computeOverall } from "@/lib/scoring";
import { getOnboarding, getProfile, saveSession } from "@/lib/store";
import { uid, cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { Dimension, Question, ScoredAnswer, Session, Situation } from "@/lib/types";

/* Free 3-question trial session in the onboarding half-and-half layout.
   Same interview UI as /practice, but wrapped in the split design:
   left = the interview interaction, right = teal conversion panel.
   No AppShell, no auth required. */

const DIMS: { key: Dimension; label: string }[] = [
  { key: "clarity", label: "Clarity" },
  { key: "relevance", label: "Relevance" },
  { key: "specificity", label: "Specificity" },
  { key: "confidence", label: "Confidence" },
  { key: "conciseness", label: "Conciseness" },
];

type Phase = "loading" | "answer" | "score" | "done";

function TrialInner() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [role, setRole] = useState("");
  const [situation, setSituation] = useState<Situation | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [interim, setInterim] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scored, setScored] = useState<ScoredAnswer | null>(null);
  const [answers, setAnswers] = useState<ScoredAnswer[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const sessionStart = useRef(Date.now());
  const deliveryRef = useRef<any>(null);

  // Load role from onboarding and auto-start
  useEffect(() => {
    const profile = getProfile();
    const ob = getOnboarding();
    const r = profile.targetRole || ob?.targetRole || "Office Manager";
    const s = profile.situation || ob?.situation || null;
    setRole(r);
    setSituation(s);

    (async () => {
      try {
        const { questions: qs } = await apiGenerateQuestions({
          situation: s, targetRole: r, count: 3, difficulty: "standard",
        });
        setQuestions(qs);
        setPhase("answer");
        track("session_started", { mode: "trial", role: r, count: 3 });
      } catch {
        // Heuristic fallback happens inside apiGenerateQuestions
        setPhase("answer");
      }
    })();
  }, []);

  const total = questions.length || 3;
  const current = questions[index];
  const wordCount = answerText.trim() ? answerText.trim().split(/\s+/).length : 0;
  const canSubmit = wordCount >= 5 && !submitting;

  const submit = async () => {
    if (!canSubmit || !current) return;
    setSubmitting(true);
    setInterim("");
    const result = await apiScoreAnswer({
      question: current.text, answer: answerText, targetRole: role,
      situation: situation || "", category: current.category,
      questionNumber: current.number,
    });
    result.answerText = answerText;
    result.questionText = current.text;
    result.questionNumber = current.number;
    result.category = current.category;
    result.wordCount = wordCount;
    result.delivery = deliveryRef.current ?? undefined;
    setScored(result);
    setSubmitting(false);
    setPhase("score");
  };

  const next = () => {
    if (!scored) return;
    const updated = [...answers, scored];
    setAnswers(updated);
    if (index + 1 >= total) {
      // Finish
      const dimensions = aggregateDimensions(updated);
      const sess: Session = {
        id: uid("trial"),
        createdAt: new Date().toISOString(),
        targetRole: role,
        situation,
        mode: "practice",
        overall: computeOverall(dimensions),
        dimensions,
        durationSeconds: Math.round((Date.now() - sessionStart.current) / 1000),
        answers: updated,
      };
      saveSession(sess);
      setSession(sess);
      setPhase("done");
      track("session_complete", { mode: "trial", overall: sess.overall, questions: 3 });
      return;
    }
    setIndex((i) => i + 1);
    setScored(null);
    setAnswerText("");
    setInterim("");
    deliveryRef.current = null;
    setPhase("answer");
  };

  /* ---- Render ---- */

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      {/* ============ LEFT — the interview ============ */}
      <div className="relative flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-6 py-6 sm:px-10">
          <Logo />
          {phase !== "done" && (
            <span className="text-sm text-ink-3">
              Question {Math.min(index + 1, total)} of {total}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {phase !== "done" && (
          <div className="px-6 sm:px-10">
            <div className="mx-auto flex max-w-md items-center gap-1.5">
              {Array.from({ length: total }).map((_, i) => (
                <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={false}
                    animate={{ width: i < index + (phase === "score" ? 1 : 0) ? "100%" : "0%" }}
                    transition={{ duration: 0.45 }}
                    style={{ background: "linear-gradient(90deg, var(--primary), var(--primary-bright))" }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-lg">
            <AnimatePresence mode="wait">
              {/* LOADING */}
              {phase === "loading" && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-20">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <p className="text-ink-2">Building your interview questions…</p>
                </motion.div>
              )}

              {/* ANSWERING */}
              {phase === "answer" && current && (
                <motion.div key={`q-${index}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
                  <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-primary-ink">
                    {current.category === "warmup" ? "Warm up" : current.category === "closer" ? "Closing" : "Behavioral"}
                  </p>
                  <h1 className="mt-3 font-serif text-2xl font-semibold leading-snug text-ink sm:text-3xl">
                    <Inline text={current.text} />
                  </h1>
                  <textarea
                    autoFocus
                    value={answerText + (interim ? (answerText && !answerText.endsWith(" ") ? " " : "") + interim : "")}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Type your answer here, or tap the mic and just talk."
                    className="field mt-6 min-h-[280px] resize-y leading-relaxed"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-ink-3">
                      {wordCount < 5 ? `${wordCount} words — a few more to submit` : `${wordCount} words`}
                    </span>
                    <VoiceButton
                      onTranscript={(t) => setAnswerText((prev) => prev + (prev && !prev.endsWith(" ") ? " " : "") + t)}
                      onInterim={setInterim}
                      onDelivery={(d) => { deliveryRef.current = d; }}
                    />
                  </div>
                  <Button size="lg" className="mt-5 w-full" onClick={submit} disabled={!canSubmit}>
                    {submitting ? <><Loader2 size={18} className="animate-spin" /> Scoring…</> : <>Submit answer <ArrowRight size={18} /></>}
                  </Button>
                </motion.div>
              )}

              {/* SCORE */}
              {phase === "score" && scored && (
                <motion.div key={`s-${index}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
                  <AnswerScoreCard answer={scored} />
                  <Button size="lg" className="mt-6 w-full" onClick={next}>
                    {index + 1 >= total ? <>See my results <ArrowRight size={18} /></> : <>Next question <ArrowRight size={18} /></>}
                  </Button>
                </motion.div>
              )}

              {/* DONE — results + signup CTA */}
              {phase === "done" && session && (
                <motion.div key="done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                  <div className="text-center">
                    <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-primary-ink">Your interview score</p>
                    <div className="mt-3 font-serif text-8xl font-semibold text-ink">
                      <AnimatedNumber value={session.overall} duration={1400} startOnView={false} />
                      <span className="text-3xl text-ink-3">/100</span>
                    </div>
                    <p className="mt-3 text-ink-2">
                      {session.overall >= 75 ? "Great start. You're closer than you think."
                        : session.overall >= 50 ? "Solid foundation. Most people hit 80+ within a week."
                        : "That's your starting point — it goes up fast with practice."}
                    </p>
                  </div>

                  <div className="mt-8">
                    <RadarScoreChart data={DIMS.map((d) => ({ dimension: d.label, value: session.dimensions[d.key] }))} />
                  </div>

                  {/* Per-answer summary */}
                  <div className="mt-8 space-y-3">
                    {session.answers.map((a, i) => (
                      <div key={i} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                        <p className="text-xs font-semibold uppercase text-primary-ink">{a.category}</p>
                        <p className="mt-1 text-sm font-medium text-ink">{a.questionText}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="font-serif text-xl font-semibold" style={{ color: a.scores.overall >= 75 ? "var(--sage-ink)" : a.scores.overall >= 50 ? "var(--amber-ink)" : "var(--coral-ink)" }}>
                            {a.scores.overall}
                          </span>
                          <span className="text-xs text-ink-3">/100</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <ButtonLink href="/signin?mode=signup&next=%2Fupgrade" size="lg" className="mt-10 w-full">
                    Sign up to keep practicing <ArrowRight size={18} />
                  </ButtonLink>
                  <p className="mt-3 text-center text-xs text-ink-3">Your score is saved. Sign up to track your progress over time.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ============ RIGHT — conversion panel ============ */}
      <TrialPanel phase={phase} score={session?.overall ?? 0} index={index} total={total} />
    </main>
  );
}

/* The teal right panel — mirrors the onboarding design but shows contextual
   messaging that changes with the interview phase. */
function TrialPanel({ phase, score, index, total }: { phase: Phase; score: number; index: number; total: number }) {
  const heads: Record<Phase, React.ReactNode> = {
    loading: "Building your interview…",
    answer: <>Answer like you would in a real interview.</>,
    score: <>See exactly what to improve.</>,
    done: <>This is where it starts.</>,
  };

  const subs: Record<Phase, string> = {
    loading: "Three questions matched to your role. Just like the real thing.",
    answer: `Question ${index + 1} of ${total}. Say it out loud or type it — we score both.`,
    score: "Every answer is scored on five dimensions. No vague tips — real numbers.",
    done: score >= 75
      ? `You scored ${score}. Imagine where you'll be after a week of practice.`
      : `You scored ${score}. Most people improve 15+ points in their first week.`,
  };

  return (
    <aside className="relative hidden overflow-hidden lg:block" style={{ background: "linear-gradient(160deg, #19a9b8 0%, #14808e 50%, #0c5660 120%)" }}>
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, #ffffff66, transparent)" }} />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, #ffe0a655, transparent)" }} />
      <div className="sticky top-0 flex min-h-screen flex-col justify-center px-12 py-16 text-white xl:px-16">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} className="fill-white text-white" />)}
          <span className="ml-2 text-sm font-medium text-white/85">Loved by 12,000+ job seekers</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={phase + index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
            <h2 className="mt-6 max-w-md font-serif text-[2.1rem] font-semibold leading-tight">{heads[phase]}</h2>
            <p className="mt-4 max-w-sm text-lg text-white/80">{subs[phase]}</p>
          </motion.div>
        </AnimatePresence>

        {phase === "done" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }} className="mt-10 space-y-3">
            {[
              "Unlimited scored practice sessions",
              "Anxiety detector catches filler words",
              "Question predictor for any job posting",
              "Readiness score that tracks your progress",
              "Gap story builder for career breaks",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-white/90">
                <Check size={18} className="shrink-0 text-white" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </motion.div>
        )}

        <p className="mt-12 flex items-center gap-2 text-sm text-white/75"><ShieldCheck size={16} /> Private by design. Cancel anytime.</p>
      </div>
    </aside>
  );
}

export default function TrialPage() {
  return (
    <Suspense fallback={
      <main className="grid min-h-screen place-items-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </main>
    }>
      <TrialInner />
    </Suspense>
  );
}
