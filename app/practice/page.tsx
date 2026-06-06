"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, X, Loader2, Lock, Building2, ChevronDown } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AnswerScoreCard } from "@/components/practice/AnswerScoreCard";
import { VoiceButton } from "@/components/ui/VoiceButton";
import { apiFollowUp, apiGenerateExample, apiGenerateQuestions, apiScoreAnswer } from "@/lib/client";
import { aggregateDimensions, computeOverall } from "@/lib/scoring";
import {
  canStartSession,
  getOnboarding,
  getProfile,
  getSessions,
  saveSession,
  sessionsThisWeek,
  FREE_WEEKLY_LIMIT,
  isPremium,
} from "@/lib/store";
import { average, cn, uid } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { Dimension, DeliveryMetrics, Question, ScoredAnswer, Session, Situation } from "@/lib/types";

type Phase = "setup" | "loading" | "answer" | "score" | "blocked";

function PracticeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const focusDim = (params.get("focus") as Dimension) || undefined;
  const autostart = params.get("autostart") === "1";

  const [phase, setPhase] = useState<Phase>("loading");
  const [role, setRole] = useState("");
  const [situation, setSituation] = useState<Situation | null>(null);
  const [company, setCompany] = useState("");
  const [posting, setPosting] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [scored, setScored] = useState<ScoredAnswer | null>(null);
  const [answers, setAnswers] = useState<ScoredAnswer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Conversational follow-up (B)
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [followUpScored, setFollowUpScored] = useState<ScoredAnswer | null>(null);
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const sessionStart = useRef<number>(0);
  const [gentle, setGentle] = useState(false);
  // Per-user personalization computed from history, fed into every AI call.
  const perso = useRef({ weakestDimension: "", recentAverage: 0, name: "", interviewGap: "" });
  // Spoken-delivery metrics captured by the mic for the current answers.
  const deliveryRef = useRef<DeliveryMetrics | null>(null);
  const fuDeliveryRef = useRef<DeliveryMetrics | null>(null);

  const start = useCallback(
    async (r: string, s: Situation | null) => {
      if (!canStartSession()) {
        setPhase("blocked");
        return;
      }
      setPhase("loading");
      setRole(r);
      setSituation(s);

      // Build per-user personalization from their history.
      const profile = getProfile();
      const hist = getSessions();
      const recent = hist.slice(-5);
      const recentAverage = recent.length ? average(recent.map((x) => x.overall)) : 0;
      const dimKeys: Dimension[] = ["clarity", "relevance", "specificity", "confidence", "conciseness"];
      let weakestDimension = "";
      if (recent.length) {
        let lowest = 101;
        for (const k of dimKeys) {
          const avg = average(recent.map((x) => x.dimensions[k] || 0));
          if (avg < lowest) {
            lowest = avg;
            weakestDimension = k;
          }
        }
      }
      perso.current = { weakestDimension, recentAverage, name: profile.name, interviewGap: profile.interviewGap || "" };
      setGentle(hist.length === 0);

      const { questions } = await apiGenerateQuestions({
        situation: s,
        targetRole: r,
        interviewGap: profile.interviewGap,
        seed: Math.floor(Date.now() / 1000) % 7,
        focusDimension: focusDim,
        company: company.trim(),
        posting: posting.trim(),
        name: profile.name,
        weakestDimension,
      });
      setQuestions(questions);
      setIndex(0);
      setAnswers([]);
      setScored(null);
      setAnswerText("");
      sessionStart.current = Date.now();
      setPhase("answer");
    },
    [focusDim, company, posting]
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
    setFollowUp(null);
    setFollowUpScored(null);
    setFollowUpAnswer("");
    const result = await apiScoreAnswer(
      {
        question: current.text,
        answer: answerText,
        targetRole: role,
        situation: situation || "",
        category: current.category,
        questionNumber: current.number,
        name: perso.current.name,
        company: company.trim(),
        interviewGap: perso.current.interviewGap,
        weakestDimension: perso.current.weakestDimension,
        recentAverage: perso.current.recentAverage,
      },
      false
    );
    result.delivery = deliveryRef.current ?? undefined;
    setScored(result);
    setSubmitting(false);
    setPhase("score");
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Conversational interviewer: probe deeper into what they just said.
    if (current.category !== "closer") {
      apiFollowUp({
        question: current.text,
        answer: answerText,
        targetRole: role,
        company: company.trim(),
        situation: situation || "",
        interviewGap: perso.current.interviewGap,
      })
        .then(setFollowUp)
        .catch(() => setFollowUp(null));
    }
  };

  const submitFollowUp = async () => {
    if (!current || !followUp || followUpAnswer.trim().split(/\s+/).length < 5) return;
    setSubmittingFollowUp(true);
    const result = await apiScoreAnswer({
      question: followUp,
      answer: followUpAnswer,
      targetRole: role,
      situation: situation || "",
      category: current.category,
      questionNumber: current.number,
      name: perso.current.name,
      company: company.trim(),
      interviewGap: perso.current.interviewGap,
      weakestDimension: perso.current.weakestDimension,
      recentAverage: perso.current.recentAverage,
    });
    result.delivery = fuDeliveryRef.current ?? undefined;
    setFollowUpScored(result);
    setSubmittingFollowUp(false);
  };

  const finishSession = (finalAnswers: ScoredAnswer[]) => {
    const dimensions = aggregateDimensions(finalAnswers);
    const session: Session = {
      id: uid("s"),
      createdAt: new Date().toISOString(),
      targetRole: role,
      company: company.trim() || undefined,
      situation,
      mode: focusDim ? "focus" : "practice",
      overall: computeOverall(dimensions),
      dimensions,
      durationSeconds: Math.round((Date.now() - sessionStart.current) / 1000),
      answers: finalAnswers,
      focusDimension: focusDim,
    };
    saveSession(session);
    track("session_complete", { overall: session.overall, mode: session.mode, role });
    router.push(`/session/${session.id}`);
  };

  const collectAnswers = () =>
    [...answers, scored, followUpScored].filter(Boolean) as ScoredAnswer[];

  const next = () => {
    if (!scored) return;
    const updated = collectAnswers();
    setAnswers(updated);
    if (index + 1 >= total) {
      finishSession(updated);
      return;
    }
    setIndex((i) => i + 1);
    setScored(null);
    setFollowUp(null);
    setFollowUpScored(null);
    setFollowUpAnswer("");
    setAnswerText("");
    deliveryRef.current = null;
    fuDeliveryRef.current = null;
    setPhase("answer");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const endEarly = () => {
    const finalAnswers = scored ? collectAnswers() : answers;
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
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="chip">Preparing for: <strong className="text-ink">{role}</strong></span>
            {company && <span className="chip">at <strong className="text-ink">{company}</strong></span>}
            {focusDim && <span className="chip bg-primary-soft text-primary-ink">Focus: {focusDim}</span>}
          </div>
        )}

        {/* SETUP */}
        {phase === "setup" && (
          <SetupCard
            role={role}
            company={company}
            posting={posting}
            setCompany={setCompany}
            setPosting={setPosting}
            onStart={() => start(role || "Office Manager", situation)}
          />
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
                      ? `${wordCount} words. Aim for at least a few sentences`
                      : `${wordCount} words`}
                  </span>
                  <span className="text-xs text-ink-3">Tip: 60-150 words is the sweet spot</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <VoiceButton
                  onTranscript={(t) => setAnswerText((p) => (p ? p.trim() + " " : "") + t)}
                  onDelivery={(m) => (deliveryRef.current = m)}
                />
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
              gentle={gentle}
              loadExample={(a) => apiGenerateExample(a.questionText, role, a.category)}
            />

            {/* Conversational follow-up */}
            {followUp && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-2xl border-2 p-6"
                style={{ borderColor: "var(--primary)", background: "var(--primary-soft)" }}
              >
                <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-primary-ink">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">HM</span>
                  The interviewer follows up
                </div>
                <p className="font-serif text-lg font-semibold text-ink">&ldquo;{followUp}&rdquo;</p>

                {!followUpScored ? (
                  <>
                    <textarea
                      value={followUpAnswer}
                      onChange={(e) => setFollowUpAnswer(e.target.value)}
                      placeholder="Answer the follow-up… this is where real interviews are won or lost."
                      className="field mt-4 min-h-[120px] resize-y bg-white leading-relaxed"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <VoiceButton
                        onTranscript={(t) => setFollowUpAnswer((p) => (p ? p.trim() + " " : "") + t)}
                        onDelivery={(m) => (fuDeliveryRef.current = m)}
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => setFollowUp(null)} className="btn-ghost text-sm">
                          Skip
                        </button>
                        <Button
                          onClick={submitFollowUp}
                          disabled={submittingFollowUp || followUpAnswer.trim().split(/\s+/).length < 5}
                        >
                          {submittingFollowUp ? (
                            <><Loader2 size={16} className="animate-spin" /> Scoring…</>
                          ) : (
                            <>Answer it</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-4">
                    <AnswerScoreCard answer={followUpScored} animate={false} />
                  </div>
                )}
              </motion.div>
            )}

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

function SetupCard({
  role,
  company,
  posting,
  setCompany,
  setPosting,
  onStart,
}: {
  role: string;
  company: string;
  posting: string;
  setCompany: (v: string) => void;
  setPosting: (v: string) => void;
  onStart: () => void;
}) {
  const premium = typeof window !== "undefined" && isPremium();
  const used = typeof window !== "undefined" ? sessionsThisWeek() : 0;
  const [showContext, setShowContext] = useState(Boolean(company || posting));
  return (
    <div className="mx-auto max-w-xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-8 sm:p-9">
        <div className="text-center">
          <span
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white shadow-sm"
            style={{ background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))" }}
          >
            <Sparkles size={24} />
          </span>
          <h1 className="mt-6 font-serif text-3xl font-semibold text-ink">Ready to practice?</h1>
          <p className="mt-3 text-ink-2">
            8 tailored questions for <strong className="text-ink">{role || "your role"}</strong>. About 10
            minutes. Scored as you go.
          </p>
        </div>

        {/* Job context (optional) */}
        <div className="mt-7 rounded-xl border bg-bg-sunk/60 p-5" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setShowContext((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="flex items-center gap-2 font-medium text-ink">
              <Building2 size={17} className="text-primary" />
              Tailor to a specific job
              <span className="text-sm font-normal text-ink-3">(optional)</span>
            </span>
            <ChevronDown size={18} className={cn("text-ink-3 transition-transform", showContext && "rotate-180")} />
          </button>

          {showContext && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-ink-2">
                Add the company and paste the posting, and we&apos;ll write questions a real hiring manager
                for <em>this exact job</em> would ask.
              </p>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-2">Company name</span>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g., Mercy Hospital"
                  className="field"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-2">
                  Job description / posting
                </span>
                <textarea
                  value={posting}
                  onChange={(e) => setPosting(e.target.value)}
                  placeholder="Paste the responsibilities and requirements here. The more you add, the more specific your questions get."
                  className="field min-h-[120px] resize-y leading-relaxed text-sm"
                />
              </label>
            </div>
          )}
        </div>

        <Button onClick={onStart} size="lg" className="mt-6 w-full">
          Start session <ArrowRight size={18} />
        </Button>
        {!premium && (
          <p className="mt-4 text-center text-xs text-ink-3">
            Free plan: {Math.max(0, FREE_WEEKLY_LIMIT - used)} of {FREE_WEEKLY_LIMIT} sessions left this week
          </p>
        )}
        <div className="text-center">
          <ButtonLink href="/onboarding" variant="ghost" size="sm" className="mt-2">
            Change role or situation
          </ButtonLink>
        </div>
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
          Upgrade to Premium, $9.99/mo
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
