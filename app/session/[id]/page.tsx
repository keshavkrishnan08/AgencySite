"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Download,
  Share2,
  Sparkles,
  TrendingUp,
  Target as TargetIcon,
  Trophy,
} from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ScoreNumber } from "@/components/ui/Score";
import { AnswerScoreCard } from "@/components/practice/AnswerScoreCard";
import { ProgressLineChart, RadarScoreChart } from "@/components/charts/Charts";
import {
  getSession,
  getSessions,
  isSignedIn,
  setProfile,
  getProfile,
} from "@/lib/store";
import { DIMENSIONS, cn, formatDate, formatDuration, scoreColor } from "@/lib/utils";
import { drawShareCard } from "@/lib/share";
import type { Dimension, ScoredAnswer, Session } from "@/lib/types";

export default function SessionPage() {
  const params = useParams();
  const id = String(params.id);
  const [session, setSession] = useState<Session | null>(null);
  const [all, setAll] = useState<Session[]>([]);
  const [signed, setSigned] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSession(getSession(id) ?? null);
    setAll(getSessions());
    setSigned(isSignedIn());
  }, [id]);

  const radarData = useMemo(
    () =>
      session
        ? DIMENSIONS.map((d) => ({ dimension: d.label, value: session.dimensions[d.key] }))
        : [],
    [session]
  );

  const progressData = useMemo(
    () => all.map((s, i) => ({ label: formatDate(s.createdAt) || `S${i + 1}`, score: s.overall })),
    [all]
  );

  if (!mounted) return <main className="min-h-screen" />;

  if (!session) {
    return (
      <>
        <AppNav />
        <main className="container-content py-24 text-center">
          <h1 className="font-serif text-2xl font-semibold text-ink">Session not found</h1>
          <p className="mt-2 text-ink-2">It may have been cleared. Start a fresh one.</p>
          <ButtonLink href="/practice" className="mt-6">
            New session <ArrowRight size={16} />
          </ButtonLink>
        </main>
      </>
    );
  }

  const { strongest, weakest } = bestAndWorst(session);

  return (
    <>
      <AppNav />
      <main className="container-wide max-w-4xl py-10 sm:py-12">
        {/* Hero score card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl p-8 text-white shadow-xl sm:p-10"
          style={{ background: "linear-gradient(135deg, #19a9b8 0%, #14808e 55%, #0c5660 120%)" }}
        >
          <div
            className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-30 blur-2xl"
            style={{ background: "radial-gradient(circle, #ffffff66, transparent)" }}
          />
          <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-white/70">
            {session.mode === "interview_day"
              ? "Interview Day complete"
              : session.mode === "focus"
              ? "Focus drill complete"
              : "Session complete"}
          </p>
          <div className="mt-3 flex items-end gap-2">
            <span className="font-serif text-7xl font-semibold leading-none sm:text-8xl">
              <AnimatedNumber value={session.overall} duration={1400} startOnView={false} />
            </span>
            <span className="mb-2 text-2xl text-white/70">/100</span>
          </div>
          <p className="mt-3 text-white/85">
            You answered {session.answers.length} questions in {formatDuration(session.durationSeconds)} ·
            preparing for {session.targetRole}
            {session.company ? ` at ${session.company}` : ""}
          </p>
        </motion.div>

        {/* Radar + progress */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card p-7">
            <h2 className="mb-2 font-serif text-lg font-semibold text-ink">Your five dimensions</h2>
            <RadarScoreChart data={radarData} />
          </div>
          <div className="card p-7">
            <h2 className="mb-2 font-serif text-lg font-semibold text-ink">Progress over time</h2>
            {all.length >= 2 ? (
              <ProgressLineChart data={progressData} height={260} />
            ) : (
              <div className="flex h-[260px] flex-col items-center justify-center text-center">
                <TrendingUp size={32} className="text-primary" />
                <p className="mt-3 max-w-xs text-sm text-ink-2">
                  This is your first session. Your baseline. Come back tomorrow and watch the line climb.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Strength + growth */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="card p-6" style={{ borderLeft: "4px solid var(--sage)" }}>
            <div className="mb-1.5 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-sage-ink">
              <Trophy size={14} /> Your strength
            </div>
            <p className="text-ink-2">
              <strong className="text-ink">{labelOf(strongest)}</strong>. This is what you do best. Keep
              leaning on it.
            </p>
          </div>
          <div className="card p-6" style={{ borderLeft: "4px solid var(--amber)" }}>
            <div className="mb-1.5 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-amber-ink">
              <TargetIcon size={14} /> Focus area
            </div>
            <p className="text-ink-2">{session.answers[0]?.growthSummary ?? growthOf(weakest)}</p>
          </div>
        </div>

        {/* Account capture / share */}
        {mounted && !signed ? (
          <AccountPrompt onDone={() => setSigned(true)} />
        ) : (
          <ShareCard session={session} sessionsCount={all.length} />
        )}

        {/* Per-question review */}
        <div className="mt-12">
          <h2 className="mb-4 font-serif text-xl font-semibold text-ink">Review every answer</h2>
          <div className="space-y-3">
            {session.answers.map((a, i) => (
              <QuestionAccordion key={i} answer={a} index={i} role={session.targetRole} />
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <ButtonLink href="/practice" size="lg">
            Practice again <ArrowRight size={18} />
          </ButtonLink>
          <Link href="/dashboard" className="text-sm text-ink-2 hover:text-ink">
            Go to dashboard
          </Link>
        </div>
      </main>
    </>
  );
}

/* ---------------- helpers ---------------- */

function bestAndWorst(s: Session): { strongest: Dimension; weakest: Dimension } {
  const entries = DIMENSIONS.map((d) => [d.key, s.dimensions[d.key]] as [Dimension, number]);
  const strongest = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const weakest = entries.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
  return { strongest, weakest };
}
const labelOf = (d: Dimension) => DIMENSIONS.find((x) => x.key === d)?.label ?? d;
const growthOf = (d: Dimension) => `${labelOf(d)} needs the most attention. Add concrete detail to every answer.`;

/* ---------------- account prompt ---------------- */

function AccountPrompt({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const save = () => {
    if (!email.includes("@")) return;
    setProfile({ email, name: name || email.split("@")[0] });
    onDone();
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-2xl border-2 p-7"
      style={{ borderColor: "var(--gold)", background: "var(--gold-soft)" }}
    >
      <div className="flex items-center gap-2 text-gold-ink">
        <Sparkles size={18} />
        <h2 className="font-serif text-xl font-semibold">Save your progress</h2>
      </div>
      <p className="mt-2 max-w-lg text-ink-2">
        Create a free account to track your scores, see your improvement over time, and pick up where you
        left off. No credit card.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name (optional)"
          className="field sm:max-w-[180px]"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="you@email.com"
          type="email"
          className="field flex-1"
        />
        <Button onClick={save}>Create account</Button>
      </div>
      <button
        onClick={() => {
          setProfile({ email: "you@preppath.ai", name: "You" });
          onDone();
        }}
        className="mt-3 text-sm text-ink-2 underline-offset-2 hover:underline"
      >
        Or continue with Google
      </button>
    </motion.div>
  );
}

/* ---------------- share ---------------- */

function ShareCard({ session, sessionsCount }: { session: Session; sessionsCount: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && canvasRef.current) {
      drawShareCard(canvasRef.current, {
        score: session.overall,
        role: session.targetRole,
        sessions: sessionsCount,
      });
    }
  }, [open, session, sessionsCount]);

  const download = () => {
    const c = canvasRef.current;
    if (!c) return;
    const link = document.createElement("a");
    link.download = `preppath-score-${session.overall}.png`;
    link.href = c.toDataURL("image/png");
    link.click();
  };

  if (session.overall < 70) return <div className="mt-8" />;

  return (
    <div className="mt-8 rounded-2xl border bg-surface p-6" style={{ borderColor: "var(--border)" }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">Proud of that score?</h2>
          <p className="text-sm text-ink-2">Generate a shareable card for your progress.</p>
        </div>
        <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
          <Share2 size={16} /> {open ? "Hide" : "Create share card"}
        </Button>
      </div>
      {open && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <canvas
            ref={canvasRef}
            className="w-full max-w-xs rounded-xl border shadow-lg"
            style={{ borderColor: "var(--border)" }}
          />
          <Button onClick={download}>
            <Download size={16} /> Download image
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- per-question accordion ---------------- */

function QuestionAccordion({
  answer,
  index,
  role,
}: {
  answer: ScoredAnswer;
  index: number;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const s = answer.scores.overall;
  return (
    <div className="card overflow-hidden p-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-bg-tint"
      >
        <span className="font-mono text-sm font-semibold text-ink-3">Q{index + 1}</span>
        <span className="flex-1 text-[0.95rem] font-medium text-ink line-clamp-1">{answer.questionText}</span>
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-sm font-bold text-white"
          style={{ background: scoreColor(s) }}
        >
          {s}
        </span>
        <ChevronDown size={18} className={cn("shrink-0 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t p-5" style={{ borderColor: "var(--border)" }}>
          <div className="mb-5 rounded-xl bg-bg-sunk p-4">
            <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">Your answer</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{answer.answerText}</p>
          </div>
          <AnswerScoreCard answer={answer} animate={false} />
        </div>
      )}
    </div>
  );
}
