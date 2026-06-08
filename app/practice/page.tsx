"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, X, Loader2, Lock, Building2, ChevronDown, Check } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AnswerScoreCard } from "@/components/practice/AnswerScoreCard";
import { VoiceButton } from "@/components/ui/VoiceButton";
import { InfoTip } from "@/components/ui/Tooltip";
import { ShowcaseProgress } from "@/components/onboarding/Showcase";
import { apiFollowUp, apiGenerateExample, apiGenerateQuestions, apiScoreAnswer } from "@/lib/client";
import { aggregateDimensions, computeOverall } from "@/lib/scoring";
import {
  getOnboarding,
  getProfile,
  getSessions,
  saveSession,
  isPremium,
} from "@/lib/store";
import { average, cn, uid } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { Dimension, DeliveryMetrics, Question, ScoredAnswer, Session, Situation } from "@/lib/types";

// After the first answer, free users hit a hard paywall (analyzing -> paywall).
type Phase = "setup" | "loading" | "answer" | "score" | "analyzing" | "paywall";

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
  const [interim, setInterim] = useState(""); // live speech-to-text, before it's final
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
    if (autostart || focusDim) {
      start(r || "Office Manager", s);
    } else {
      setPhase("setup");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After the first answer, free users get a brief analysis, then the paywall.
  useEffect(() => {
    if (phase !== "analyzing") return;
    const id = setTimeout(() => {
      setPhase("paywall");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 2400);
    return () => clearTimeout(id);
  }, [phase]);

  const wordCount = answerText.trim() ? answerText.trim().split(/\s+/).length : 0;
  const MIN_WORDS = 5;
  const canSubmit = wordCount >= MIN_WORDS && !submitting;
  const total = questions.length;
  const current = questions[index];

  const submit = async () => {
    if (!canSubmit || !current) return;
    setSubmitting(true);
    setInterim("");
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
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Hard paywall: free users answer one question, then must upgrade. Their
    // real score and coaching are computed (so they're real behind the blur)
    // but locked. Premium users continue the full session.
    if (index === 0 && !isPremium()) {
      track("paywall_hit", { role });
      setPhase("analyzing");
      return;
    }

    setPhase("score");
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
    setInterim("");
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
    <div className="lg:grid lg:grid-cols-2">
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

        {/* ANALYZING (post first answer, before paywall) */}
        {phase === "analyzing" && <AnalyzingCard />}

        {/* PAYWALL (hard gate after first answer) */}
        {phase === "paywall" && scored && (
          <PaywallScore answer={scored} gentle={gentle} role={role} />
        )}

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
                <h1 className="mt-3 flex items-start gap-2 font-serif text-2xl font-semibold leading-snug text-ink sm:text-3xl">
                  <span>{current.text}</span>
                  {current.tip && (
                    <InfoTip title="How to nail this" iconSize={17} className="mt-1.5 shrink-0">
                      {current.tip}
                    </InfoTip>
                  )}
                </h1>
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
                {interim && (
                  <p className="mt-2 flex items-start gap-2 px-1 text-sm italic text-ink-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-coral" />
                    {interim}…
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between px-1">
                  <span className="text-xs text-ink-3">
                    {wordCount < MIN_WORDS
                      ? `${wordCount} word${wordCount === 1 ? "" : "s"}. A few more to submit (${MIN_WORDS}+)`
                      : `${wordCount} words`}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-ink-3">
                    Ideal length
                    <InfoTip title="How long should it be?">
                      60 to 150 words is the sweet spot. Long enough to tell a real story, short enough to stay sharp.
                    </InfoTip>
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <VoiceButton
                  onTranscript={(t) => { setAnswerText((p) => (p ? p.trim() + " " : "") + t); setInterim(""); }}
                  onInterim={setInterim}
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
      <PracticeAside />
    </div>
  );
}

/* Right half: a motivating, animated panel mirroring the onboarding split. */
function PracticeAside() {
  return (
    <aside
      className="relative hidden overflow-hidden lg:block"
      style={{ background: "linear-gradient(160deg, #19a9b8 0%, #14808e 50%, #0c5660 120%)" }}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, #ffffff66, transparent)" }} />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, #ffe0a655, transparent)" }} />
      <div className="sticky top-0 flex min-h-screen flex-col justify-center px-12 py-16 text-white xl:px-16">
        <span className="text-2xs font-semibold uppercase tracking-[0.18em] text-white/70">Every answer counts</span>
        <h2 className="mt-4 max-w-md font-serif text-[2.1rem] font-semibold leading-tight">
          You&apos;re building real readiness.
        </h2>
        <div className="mt-10">
          <ShowcaseProgress />
        </div>
        <p className="mt-12 text-sm text-white/75">Say it out loud. That&apos;s how it sticks.</p>
      </div>
    </aside>
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
        <div className="text-center">
          <ButtonLink href="/onboarding" variant="ghost" size="sm" className="mt-2">
            Change role or situation
          </ButtonLink>
        </div>
      </motion.div>
    </div>
  );
}

/* Beautiful analysis beat between the first answer and the paywall. */
const ANALYZE_STEPS = [
  "Reading your answer",
  "Scoring clarity and structure",
  "Listening to your delivery",
  "Writing your personal coaching",
];
function AnalyzingCard() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, ANALYZE_STEPS.length - 1)), 600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-20 text-center">
      <div className="relative grid h-28 w-28 place-items-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: "var(--primary)" }}
            initial={{ scale: 0.5, opacity: 0.5 }}
            animate={{ scale: 1.25, opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
          />
        ))}
        <span
          className="grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg"
          style={{ background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))" }}
        >
          <Sparkles size={26} />
        </span>
      </div>
      <h1 className="mt-8 font-serif text-2xl font-semibold text-ink">Analyzing your answer…</h1>
      <div className="mt-4 h-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-ink-2"
          >
            {ANALYZE_STEPS[step]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* Hard paywall. The real score and coaching render behind a frosted gate so
   the value is visible but locked. No way forward but Premium. */
const UNLOCKS = [
  "Your full score on all five dimensions",
  "Personal coaching with one clear fix",
  "The other seven questions in this session",
  "Every tool: gap stories, salary, research",
];
function PaywallScore({ answer, gentle, role }: { answer: ScoredAnswer; gentle: boolean; role: string }) {
  return (
    <div className="relative mx-auto max-w-2xl">
      {/* real, blurred score behind the gate */}
      <div aria-hidden className="pointer-events-none select-none blur-[7px] saturate-[0.92] opacity-70">
        <div className="mb-5 rounded-xl border bg-bg-sunk p-5" style={{ borderColor: "var(--border)" }}>
          <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">Your answer</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{answer.answerText}</p>
        </div>
        <AnswerScoreCard answer={answer} gentle={gentle} loadExample={async () => ""} />
      </div>

      {/* gate overlay */}
      <div className="absolute inset-0 flex items-start justify-center p-4 pt-10 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md overflow-hidden rounded-2xl border bg-surface/95 p-8 text-center shadow-xl backdrop-blur-xl"
          style={{ borderColor: "var(--border-strong)" }}
        >
          <span className="premium-badge mx-auto"> <Lock size={12} /> Locked</span>
          <h1 className="mt-5 font-serif text-3xl font-semibold leading-tight text-ink">
            Your score is ready.
          </h1>
          <p className="mt-3 text-ink-2">
            We scored your answer for <strong className="text-ink">{role || "your role"}</strong> and wrote
            your personal coaching. Unlock it to see exactly where you stand, and keep going.
          </p>
          <ul className="mx-auto mt-6 max-w-xs space-y-2.5 text-left">
            {UNLOCKS.map((u) => (
              <li key={u} className="flex items-start gap-2.5 text-sm font-medium text-ink">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sage-soft">
                  <Check size={12} className="text-sage-ink" />
                </span>
                {u}
              </li>
            ))}
          </ul>
          <ButtonLink href="/upgrade" variant="gold" size="lg" className="mt-7 w-full">
            Unlock my score, $9.99/mo
          </ButtonLink>
          <ButtonLink href="/dashboard" variant="ghost" size="sm" className="mt-1">
            Maybe later
          </ButtonLink>
        </motion.div>
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
