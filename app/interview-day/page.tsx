"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Lock, Loader2, ShieldAlert, Timer } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { VoiceButton } from "@/components/ui/VoiceButton";
import { apiGenerateQuestions, apiScoreAnswer } from "@/lib/client";
import { aggregateDimensions, computeOverall } from "@/lib/scoring";
import { getProfile, getSessions, isPremium, saveSession } from "@/lib/store";
import { cn, formatClock, scoreColor, uid } from "@/lib/utils";
import type { Question, ScoredAnswer, Session } from "@/lib/types";

const SECONDS_PER_Q = 60;

type Phase = "intro" | "running" | "scoring" | "results";

export default function InterviewDayPage() {
  const [mounted, setMounted] = useState(false);
  const [premium, setPremium] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [answers, setAnswers] = useState<ScoredAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_Q);
  const [result, setResult] = useState<{ session: Session; verdict: string; delta: number } | null>(null);
  const sessionStart = useRef(0);
  const role = useRef("Office Manager");

  useEffect(() => {
    setMounted(true);
    setPremium(isPremium());
    role.current = getProfile().targetRole || "Office Manager";
  }, []);

  const finish = useCallback(
    (all: ScoredAnswer[]) => {
      const dimensions = aggregateDimensions(all);
      const overall = computeOverall(dimensions);
      const session: Session = {
        id: uid("id"),
        createdAt: new Date().toISOString(),
        targetRole: role.current,
        situation: getProfile().situation,
        mode: "interview_day",
        overall,
        dimensions,
        durationSeconds: Math.round((Date.now() - sessionStart.current) / 1000),
        answers: all,
      };
      saveSession(session);

      const practice = getSessions().filter((s) => s.mode === "practice");
      const practiceAvg = practice.length
        ? Math.round(practice.reduce((n, s) => n + s.overall, 0) / practice.length)
        : overall;
      const delta = overall - practiceAvg;
      const verdict =
        delta >= -3
          ? "You're ready. Your practice held up under pressure."
          : "Pressure pulled your scores down. Consider 2-3 more practice sessions before the real thing.";
      setResult({ session, verdict, delta });
      setPhase("results");
    },
    []
  );

  const submit = useCallback(async () => {
    const q = questions[index];
    if (!q) return;
    setPhase("scoring");
    const scored = await apiScoreAnswer({
      question: q.text,
      answer: answerText.trim() || "(no answer given)",
      targetRole: role.current,
      category: q.category,
      questionNumber: q.number,
    });
    const all = [...answers, scored];
    setAnswers(all);
    setAnswerText("");
    if (index + 1 >= questions.length) {
      finish(all);
    } else {
      setIndex((i) => i + 1);
      setTimeLeft(SECONDS_PER_Q);
      setPhase("running");
      window.scrollTo({ top: 0 });
    }
  }, [answers, answerText, finish, index, questions]);

  // countdown
  useEffect(() => {
    if (phase !== "running") return;
    if (timeLeft <= 0) {
      submit();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, submit]);

  const begin = async () => {
    setPhase("scoring");
    const profile = getProfile();
    const hist = getSessions();
    const avoid = Array.from(
      new Set(hist.flatMap((x) => (x.answers || []).map((a) => a.questionText)).filter(Boolean))
    ).slice(-16);
    const { questions } = await apiGenerateQuestions({
      situation: profile.situation,
      targetRole: role.current,
      company: profile.company || "",
      interviewGap: profile.interviewGap,
      seed: (hist.length * 101 + Math.floor(Date.now() / 1000)) % 9973,
      sessionCount: hist.length,
      avoid,
    });
    setQuestions(questions);
    setIndex(0);
    setAnswers([]);
    setAnswerText("");
    setTimeLeft(SECONDS_PER_Q);
    sessionStart.current = Date.now();
    setPhase("running");
  };

  if (!mounted) return <main className="min-h-screen" style={{ background: "#10141f" }} />;

  /* ---- locked (free) ---- */
  if (!premium && phase === "intro") {
    return (
      <DarkShell>
        <div className="mx-auto max-w-md text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-gold">
            <Lock size={28} />
          </span>
          <h1 className="mt-6 font-serif text-3xl font-semibold text-white">Interview Day is Premium</h1>
          <p className="mt-3 text-white/70">
            Simulate real interview pressure the night before. Timed answers, no going back, a final
            readiness check. Unlock it with Premium.
          </p>
          <ButtonLink href="/upgrade" variant="gold" size="lg" className="mt-7">
            Upgrade to Premium <ArrowRight size={18} />
          </ButtonLink>
          <div className="mt-4">
            <Link href="/dashboard" className="text-sm text-white/60 hover:text-white">
              Back to dashboard
            </Link>
          </div>
        </div>
      </DarkShell>
    );
  }

  /* ---- intro ---- */
  if (phase === "intro") {
    return (
      <DarkShell>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg text-center">
          <span className="chip border-white/15 bg-white/10 text-white/80">
            <Timer size={14} /> Final test before the real one
          </span>
          <h1 className="mt-6 font-serif text-5xl font-semibold text-white">Interview Day</h1>
          <p className="mt-4 text-lg leading-relaxed text-white/70">
            Simulate real interview pressure. {SECONDS_PER_Q} seconds per answer. No scores until the end.
            No going back. This is how you find out if your practice holds up.
          </p>
          <p className="mt-6 text-sm text-white/60">
            Role: <strong className="text-white">{role.current}</strong> · 8 questions · ~15 minutes
          </p>
          <Button onClick={begin} variant="gold" size="lg" className="mt-8">
            Begin simulation <ArrowRight size={18} />
          </Button>
          <div className="mt-4">
            <Link href="/dashboard" className="text-sm text-white/60 hover:text-white">
              Not yet. Back to dashboard
            </Link>
          </div>
        </motion.div>
      </DarkShell>
    );
  }

  /* ---- results ---- */
  if (phase === "results" && result) {
    const positive = result.delta >= -3;
    return (
      <DarkShell>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg text-center">
          <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-white/60">Interview Day complete</p>
          <div className="mt-4 font-serif text-8xl font-semibold" style={{ color: scoreColor(result.session.overall) }}>
            <AnimatedNumber value={result.session.overall} duration={1400} startOnView={false} />
          </div>
          <p className="text-white/60">out of 100</p>

          <div
            className={cn("mt-8 rounded-2xl border p-6 text-left", positive ? "border-sage/40" : "border-amber/40")}
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div className="mb-1.5 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider" style={{ color: positive ? "var(--sage)" : "var(--amber)" }}>
              <ShieldAlert size={14} /> Performance under pressure
            </div>
            <p className="text-white/85">{result.verdict}</p>
            <p className="mt-2 text-sm text-white/55">
              {result.delta >= 0 ? "+" : ""}
              {result.delta} vs your practice average
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <ButtonLink href={`/session/${result.session.id}`} variant="gold" size="lg">
              See full breakdown <ArrowRight size={18} />
            </ButtonLink>
            <Link href="/dashboard" className="text-sm text-white/60 hover:text-white">
              Back to dashboard
            </Link>
          </div>
        </motion.div>
      </DarkShell>
    );
  }

  /* ---- running / scoring ---- */
  const q = questions[index];
  const urgent = timeLeft <= 10;

  return (
    <DarkShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <span className="text-sm font-medium text-white/60">Question {index + 1} of {questions.length}</span>
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 font-mono text-lg font-bold tabular-nums transition-colors",
              urgent ? "bg-coral/20 text-coral" : "bg-white/10 text-white"
            )}
          >
            <Clock size={18} className={cn(urgent && "animate-pulse")} />
            {formatClock(Math.max(0, timeLeft))}
          </div>
        </div>

        {q && (
          <motion.h1
            key={index}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-3xl font-semibold leading-snug text-white"
          >
            {q.text}
          </motion.h1>
        )}

        <textarea
          autoFocus
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          disabled={phase === "scoring"}
          placeholder="Start typing your answer…"
          className="mt-7 min-h-[200px] w-full resize-y rounded-xl border border-white/15 bg-white/5 p-4 leading-relaxed text-white outline-none transition-colors placeholder:text-white/35 focus:border-white/40"
        />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <VoiceButton tone="dark" onTranscript={(t) => setAnswerText((p) => (p ? p.trim() + " " : "") + t)} />
          <Button onClick={submit} variant="gold" disabled={phase === "scoring"}>
            {phase === "scoring" ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Recording…
              </>
            ) : index + 1 >= questions.length ? (
              "Finish"
            ) : (
              <>Next <ArrowRight size={16} /></>
            )}
          </Button>
        </div>
      </div>
    </DarkShell>
  );
}

/* Inside the app shell (persistent sidebar + nav), but the simulation area stays
   dark and immersive. */
function DarkShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <main
        className="relative flex min-h-[calc(100vh-4rem)] flex-col"
        style={{ background: "radial-gradient(120% 80% at 50% -10%, #1b2740, #10141f 60%)" }}
      >
        <div className="container-wide flex items-center justify-end py-5">
          <span className="chip border-white/15 bg-white/10 text-white/70">Interview Day Mode</span>
        </div>
        <div className="container-content flex flex-1 items-center justify-center py-10">{children}</div>
      </main>
    </AppShell>
  );
}
