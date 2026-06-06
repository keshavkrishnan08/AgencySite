"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, X, Loader2, Lock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AnswerScoreCard } from "@/components/practice/AnswerScoreCard";
import { apiGenerateExample, apiGenerateQuestions, apiScoreAnswer } from "@/lib/client";
import { aggregateDimensions, computeOverall } from "@/lib/scoring";
import {
  canStartSession,
  getOnboarding,
  getProfile,
  saveSession,
  sessionsThisWeek,
  FREE_WEEKLY_LIMIT,
  isPremium,
} from "@/lib/store";
import { uid } from "@/lib/utils";
import type { Dimension, Question, ScoredAnswer, Session, Situation } from "@/lib/types";

type Phase = "setup" | "loading" | "answer" | "score" | "blocked";

function PracticeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const focusDim = (params.get("focus") as Dimension) || undefined;
  const autostart = params.get("autostart") === "1";

  const [phase, setPhase] = useState<Phase>("loading");
  const [role, setRole] = useState("");
  const [situation, setSituation] = useState<Situation | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [scored, setScored] = useState<ScoredAnswer | null>(null);
  const [answers, setAnswers] = useState<ScoredAnswer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const sessionStart = useRef<number>(0);

  const start = useCallback(
    async (r: string, s: Situation | null) => {
      if (!canStartSession()) {
        setPhase("blocked");
        return;
      }
      setPhase("loading");
      setRole(r);
      setSituation(s);
      const { questions } = await apiGenerateQuestions({
        situation: s,
        targetRole: r,
        interviewGap: getProfile().interviewGap,
        seed: Math.floor(Date.now() / 1000) % 7,
        focusDimension: focusDim,
      });
      setQuestions(questions);
      setIndex(0);
      setAnswers([]);
      setScored(null);
      setAnswerText("");
      sessionStart.current = Date.now();
      setPhase("answer");
    },
    [focusDim]
  );

  useEffect(() => {
    const profile = getProfile();
    const ob = getOnboarding();
    const r = profile.targetRole || ob?.targetRole || "";
    const s = profile.situation || ob?.situation || null;
    setRole(r);
    setSituation(s);
    if (!canStartSession()) {
      setPhase("blocked");
    } else if (autostart || focusDim) {
      start(r || "Office Manager", s);
    } else {
      setPhase("setup");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wordCount = answerText.trim() ? answerText.trim().split(/\s+/).length : 0;
  const canSubmit = wordCount >= 8 && !submitting;
  const total = questions.length;
  const current = questions[index];

  const submit = async () => {
    if (!canSubmit || !current) return;
    setSubmitting(true);
    const result = await apiScoreAnswer(
      {
        question: current.text,
        answer: answerText,
        targetRole: role,
        situation: situation || "",
        category: current.category,
        questionNumber: current.number,
      },
      false
    );
    setScored(result);
    setSubmitting(false);
    setPhase("score");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finishSession = (finalAnswers: ScoredAnswer[]) => {
    const dimensions = aggregateDimensions(finalAnswers);
    const session: Session = {
      id: uid("s"),
      createdAt: new Date().toISOString(),
      targetRole: role,
      situation,
      mode: focusDim ? "focus" : "practice",
      overall: computeOverall(dimensions),
      dimensions,
      durationSeconds: Math.round((Date.now() - sessionStart.current) / 1000),
      answers: finalAnswers,
      focusDimension: focusDim,
    };
    saveSession(session);
    router.push(`/session/${session.id}`);
  };

  const next = () => {
    if (!scored) return;
    const updated = [...answers, scored];
    setAnswers(updated);
    if (index + 1 >= total) {
      finishSession(updated);
      return;
    }
    setIndex((i) => i + 1);
    setScored(null);
    setAnswerText("");
    setPhase("answer");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const endEarly = () => {
    const finalAnswers = scored ? [...answers, scored] : answers;
    if (finalAnswers.length > 0) finishSession(finalAnswers);
    else router.push("/dashboard");
  };

  /* ---------------- Render ---------------- */

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b" style={{ borderColor: "var(--border)" }}>
        <div className="container-content flex h-16 items-center justify-between gap-4">
          <Logo href="/dashboard" />
          {(phase === "answer" || phase === "score") && (
            <div className="flex flex-1 items-center justify-center gap-3">
              <span className="hidden text-sm font-medium text-ink-2 sm:inline">
                Question {index + 1} of {total}
              </span>
              <div className="h-1.5 w-32 overflow-hidden rounded-full sm:w-48" style={{ background: "var(--bg-tint)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${((index + (phase === "score" ? 1 : 0)) / total) * 100}%`,
                    background: "linear-gradient(90deg, var(--primary), var(--primary-bright))",
                  }}
                />
              </div>
            </div>
          )}
          <button onClick={endEarly} className="btn-ghost text-sm">
            <X size={16} /> End
          </button>
        </div>
      </div>

      <div className="container-content pt-10">
        {/* role chip */}
        {(phase === "answer" || phase === "score") && (
          <div className="mb-6 flex items-center gap-2">
            <span className="chip">Preparing for: <strong className="text-ink">{role}</strong></span>
            {focusDim && <span className="chip bg-primary-soft text-primary-ink">Focus: {focusDim}</span>}
          </div>
        )}

        {/* SETUP */}
        {phase === "setup" && (
          <SetupCard role={role} onStart={() => start(role || "Office Manager", situation)} />
        )}

        {/* BLOCKED (paywall) */}
        {phase === "blocked" && <BlockedCard />}

        {/* LOADING */}
        {phase === "loading" && <LoadingCard />}

        {/* ANSWERING */}
        <AnimatePresence mode="wait">
          {phase === "answer" && current && (
            <motion.div
              key={`q-${index}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div className="card-elevated p-7 sm:p-9">
                <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-primary-ink">
                  {current.category === "warmup"
                    ? "Warm up"
                    : current.category === "closer"
                    ? "Closing"
                    : current.category === "gap"
                    ? "Your story"
                    : current.category === "focus"
                    ? "Focus drill"
                    : "Behavioral"}
                </p>
                <h1 className="mt-3 font-serif text-2xl font-semibold leading-snug text-ink sm:text-3xl">
                  {current.text}
                </h1>
                {current.tip && (
                  <p className="mt-4 flex items-start gap-2 text-sm italic text-ink-3">
                    <Sparkles size={15} className="mt-0.5 shrink-0 text-primary" />
                    {current.tip}
                  </p>
                )}
              </div>

              <div className="mt-5">
                <textarea
                  autoFocus
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type your answer here… speak naturally, as if you're in the interview."
                  className="field min-h-[180px] resize-y leading-relaxed"
                  style={{ maxHeight: 420 }}
                />
                <div className="mt-2 flex items-center justify-between px-1">
                  <span className="text-xs text-ink-3">
                    {wordCount < 8
                      ? `${wordCount} words — aim for at least a few sentences`
                      : `${wordCount} words`}
                  </span>
                  <span className="text-xs text-ink-3">Tip: 60–150 words is the sweet spot</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={submit} disabled={!canSubmit} size="lg">
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Scoring…
                    </>
                  ) : (
                    <>
                      Submit answer <ArrowRight size={18} />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SCORE */}
        {phase === "score" && scored && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="mb-5 rounded-xl border bg-bg-sunk p-5" style={{ borderColor: "var(--border)" }}>
              <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">Your answer</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{scored.answerText}</p>
            </div>
            <AnswerScoreCard
              answer={scored}
              loadExample={(a) => apiGenerateExample(a.questionText, role, a.category)}
            />
            <div className="mt-8 flex items-center justify-between">
              <button onClick={endEarly} className="btn-ghost text-sm">
                End session
              </button>
              <Button onClick={next} size="lg">
                {index + 1 >= total ? "Finish & see results" : "Next question"}
                <ArrowRight size={18} />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}

/* ---------------- sub-views ---------------- */

function SetupCard({ role, onStart }: { role: string; onStart: () => void }) {
  const premium = typeof window !== "undefined" && isPremium();
  const used = typeof window !== "undefined" ? sessionsThisWeek() : 0;
  return (
    <div className="mx-auto max-w-lg text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-9">
        <span
          className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white shadow-sm"
          style={{ background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))" }}
        >
          <Sparkles size={24} />
        </span>
        <h1 className="mt-6 font-serif text-3xl font-semibold text-ink">Ready to practice?</h1>
        <p className="mt-3 text-ink-2">
          8 tailored questions for{" "}
          <strong className="text-ink">{role || "your role"}</strong>. About 10 minutes. Scored as you go.
        </p>
        <Button onClick={onStart} size="lg" className="mt-7 w-full">
          Start session <ArrowRight size={18} />
        </Button>
        {!premium && (
          <p className="mt-4 text-xs text-ink-3">
            Free plan: {Math.max(0, FREE_WEEKLY_LIMIT - used)} of {FREE_WEEKLY_LIMIT} sessions left this week
          </p>
        )}
        <ButtonLink href="/onboarding" variant="ghost" size="sm" className="mt-2">
          Change role or situation
        </ButtonLink>
      </motion.div>
    </div>
  );
}

function BlockedCard() {
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="card-elevated p-9">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold-soft text-gold-ink">
          <Lock size={24} />
        </span>
        <h1 className="mt-6 font-serif text-3xl font-semibold text-ink">You&apos;ve used this week&apos;s free sessions</h1>
        <p className="mt-3 text-ink-2">
          The free plan includes {FREE_WEEKLY_LIMIT} sessions per week. Go Premium for unlimited practice,
          full scoring, and every tool.
        </p>
        <ButtonLink href="/upgrade" variant="gold" size="lg" className="mt-7 w-full">
          Upgrade to Premium — $9.99/mo
        </ButtonLink>
        <ButtonLink href="/dashboard" variant="ghost" size="sm" className="mt-2">
          Back to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <Loader2 size={40} className="mx-auto animate-spin text-primary" />
      <h1 className="mt-6 font-serif text-2xl font-semibold text-ink">Preparing your interview…</h1>
      <p className="mt-2 text-ink-2">Tailoring questions to your role and situation.</p>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <PracticeInner />
    </Suspense>
  );
}
