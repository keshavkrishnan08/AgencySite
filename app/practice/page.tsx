"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Sparkles, X, Loader2, Building2, ChevronDown,
  Mic, BookOpen, MessageSquare, Layers, Target, Zap, Flame, ChevronLeft,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Inline } from "@/components/ui/RichText";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AnswerScoreCard } from "@/components/practice/AnswerScoreCard";
import { VoiceButton } from "@/components/ui/VoiceButton";
import { InfoTip } from "@/components/ui/Tooltip";
import { apiFollowUp, apiGenerateExample, apiGenerateQuestions, apiScoreAnswer } from "@/lib/client";
import { aggregateDimensions, computeOverall } from "@/lib/scoring";
import { getOnboarding, getPredictedSet, getProfile, getSessions, saveSession } from "@/lib/store";
import { average, cn, uid } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { mixpanelIncrement } from "@/lib/mixpanel";
import type { Dimension, DeliveryMetrics, Question, ScoredAnswer, Session, Situation } from "@/lib/types";

type Domain = "interview" | "storytelling" | "public_speaking";

// setup = the practice hub (the precursor). custom = the fine-grained builder.
// Access is gated once, at the app shell (unpaid = whole app blurred). So there
// is NO paywall inside a session: everyone who's in the app runs the full thing.
type Phase = "setup" | "custom" | "loading" | "answer" | "score";

function PracticeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const focusDim = (params.get("focus") as Dimension) || undefined;
  const autostart = params.get("autostart") === "1";
  // Handoff from the Question Predictor: run this session on the exact
  // questions we predicted for that posting, in likelihood order.
  const predictedId = params.get("predicted") || "";
  const [fromPredicted, setFromPredicted] = useState(false);

  const [phase, setPhase] = useState<Phase>("loading");
  const [role, setRole] = useState("");
  const [situation, setSituation] = useState<Situation | null>(null);
  const [company, setCompany] = useState("");
  const companyRef = useRef("");
  useEffect(() => { companyRef.current = company; }, [company]);
  const [posting, setPosting] = useState("");
  // Session customization (from the setup screen). Refs so the mount-time
  // start() reads current values, mirroring the company fix.
  const [focusTypes, setFocusTypes] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("standard");
  const [count, setCount] = useState(8);
  const customRef = useRef({ focusTypes: [] as string[], difficulty: "standard", count: 8 });
  useEffect(() => { customRef.current = { focusTypes, difficulty, count }; }, [focusTypes, difficulty, count]);
  // Which practice domain this session is: interview, storytelling, or public
  // speaking. Threaded through a ref so the mount-time start() reads it fresh.
  const [domain, setDomain] = useState<Domain>("interview");
  const domainRef = useRef<Domain>("interview");
  useEffect(() => { domainRef.current = domain; }, [domain]);
  const [interviewGap, setInterviewGap] = useState("");
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
  const questionStart = useRef<number>(0); // wall-clock start of the current question
  const [gentle, setGentle] = useState(false);
  // Per-user personalization computed from history, fed into every AI call.
  const perso = useRef({ weakestDimension: "", recentAverage: 0, name: "", interviewGap: "" });
  // Spoken-delivery metrics captured by the mic for the current answers.
  const deliveryRef = useRef<DeliveryMetrics | null>(null);
  const fuDeliveryRef = useRef<DeliveryMetrics | null>(null);

  const start = useCallback(
    async (r: string, s: Situation | null, predictedSetId?: string) => {
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

      // Predictor handoff: skip generation entirely and drill the exact
      // questions we told them this posting would ask, most likely first.
      const set = predictedSetId ? getPredictedSet(predictedSetId) : undefined;
      if (set?.questions?.length) {
        setFromPredicted(true);
        if (set.company) setCompany(set.company);
        setQuestions(
          [...set.questions]
            .sort((a, b) => (b.probability || 0) - (a.probability || 0))
            .map((q, i) => ({
              number: i + 1,
              text: q.question,
              category: "behavioral",
              tip: q.why || "",
            }))
        );
        setIndex(0);
        setAnswers([]);
        setScored(null);
        setAnswerText("");
        sessionStart.current = Date.now();
        track("session_started", { mode: "predicted", role: r, questions: set.questions.length });
        mixpanelIncrement("sessions_started");
        setPhase("answer");
        return;
      }
      setFromPredicted(false);

      // Recent questions to steer the generator away from repeats across sessions.
      const recentQuestions = Array.from(
        new Set(hist.flatMap((x) => (x.answers || []).map((a) => a.questionText)).filter(Boolean))
      ).slice(-16);
      const { questions } = await apiGenerateQuestions({
        situation: s,
        targetRole: r,
        interviewGap: profile.interviewGap,
        seed: (hist.length * 101 + Math.floor(Date.now() / 1000)) % 9973,
        focusDimension: focusDim,
        // Read the ref, not the state: on the first autostarted session the
        // company was just setCompany'd in the mount effect and the closure
        // value here would still be "".
        company: companyRef.current.trim(),
        posting: posting.trim(),
        name: profile.name,
        weakestDimension,
        sessionCount: hist.length,
        avoid: recentQuestions,
        focusTypes: customRef.current.focusTypes,
        difficulty: customRef.current.difficulty,
        count: customRef.current.count,
        domain: domainRef.current,
      });
      setQuestions(questions);
      setIndex(0);
      setAnswers([]);
      setScored(null);
      setAnswerText("");
      sessionStart.current = Date.now();
      track("session_started", {
        mode: focusDim ? "focus" : "practice",
        role: r,
        questions: questions.length,
        sessionCount: hist.length,
      });
      mixpanelIncrement("sessions_started");
      setPhase("answer");
    },
    [focusDim, company, posting]
  );

  useEffect(() => {
    const profile = getProfile();
    const ob = getOnboarding();
    const set = predictedId ? getPredictedSet(predictedId) : undefined;
    const r = set?.role || profile.targetRole || ob?.targetRole || "";
    const s = profile.situation || ob?.situation || null;
    setRole(r);
    setSituation(s);
    setInterviewGap(profile.interviewGap || ob?.interviewGap || "");
    const resolvedCompany = set?.company || profile.company || ob?.company || "";
    companyRef.current = resolvedCompany;
    setCompany(resolvedCompany);
    // Deep links (a predicted set, a focus drill, or explicit autostart) drop
    // straight into a session. Otherwise we land on the practice HUB — the
    // precursor — even when the role is known, so people pick a track, a phase,
    // or a focus instead of being thrown into questions.
    if (predictedId || autostart || focusDim) {
      start(r || "Office Manager", s, predictedId || undefined);
    } else {
      setPhase("setup");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Launch a session from a hub choice. Writes the refs synchronously (not just
  // state) so the immediately-following start() reads the right config.
  const launch = useCallback(
    (cfg: { domain?: Domain; focusTypes?: string[]; difficulty?: string; count?: number; label?: string }) => {
      const d = cfg.domain || "interview";
      const ft = cfg.focusTypes || [];
      const diff = cfg.difficulty || "standard";
      const c = cfg.count || 8;
      setDomain(d); domainRef.current = d;
      setFocusTypes(ft); setDifficulty(diff); setCount(c);
      customRef.current = { focusTypes: ft, difficulty: diff, count: c };
      track("practice:track_start", { domain: d, difficulty: diff, count: c, label: cfg.label || "" });
      start(role || "Office Manager", situation);
    },
    [role, situation, start]
  );

  // Stamp the clock each time a fresh question is presented, so we can measure
  // how long the candidate spends per question.
  useEffect(() => {
    if (phase !== "answer") return;
    questionStart.current = Date.now();
    const q = questions[index];
    if (q) track("practice:question_view", { index: index + 1, total: questions.length, category: q.category });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index]);

  // First keystroke on a question: the gap between seeing it and starting to
  // answer is where hesitation shows up, and where people abandon.
  const startedRef = useRef(false);
  useEffect(() => {
    startedRef.current = false;
  }, [index]);
  const noteAnswerStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    track("practice:answer_start", {
      index: index + 1,
      secondsToStart: questionStart.current ? Math.round((Date.now() - questionStart.current) / 1000) : 0,
    });
  };

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
    result.secondsOnQuestion = questionStart.current
      ? Math.round((Date.now() - questionStart.current) / 1000)
      : undefined;
    setScored(result);
    setSubmitting(false);
    track("practice:scored", {
      index: index + 1,
      overall: result.scores?.overall ?? 0,
      words: result.wordCount,
      source: result.source,
      spoken: Boolean(result.delivery),
    });
    mixpanelIncrement("answers_scored");
    window.scrollTo({ top: 0, behavior: "smooth" });

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
        .then((fu) => {
          setFollowUp(fu);
          if (fu) track("practice:followup_shown", { index: index + 1 });
        })
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
    track("practice:followup_answered", { index: index + 1, overall: result.scores?.overall ?? 0 });
    mixpanelIncrement("followups_answered");
  };

  const finishSession = (finalAnswers: ScoredAnswer[]) => {
    const dimensions = aggregateDimensions(finalAnswers);
    const perQ = finalAnswers.map((a) => a.secondsOnQuestion || 0).filter((n) => n > 0);
    const avgSecondsPerQuestion = perQ.length
      ? Math.round(perQ.reduce((s, n) => s + n, 0) / perQ.length)
      : undefined;
    const session: Session = {
      id: uid("s"),
      createdAt: new Date().toISOString(),
      targetRole: role,
      company: company.trim() || undefined,
      situation,
      mode: focusDim ? "focus" : fromPredicted ? "predicted" : "practice",
      overall: computeOverall(dimensions),
      dimensions,
      durationSeconds: Math.round((Date.now() - sessionStart.current) / 1000),
      avgSecondsPerQuestion,
      answers: finalAnswers,
      focusDimension: focusDim,
    };
    saveSession(session);
    track("session_complete", { overall: session.overall, mode: session.mode, role, questions: finalAnswers.length });
    mixpanelIncrement("sessions_completed");
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
    track("practice:end_early", { index: index + 1, total: questions.length, answered: answers.length });
    const finalAnswers = scored ? collectAnswers() : answers;
    if (finalAnswers.length > 0) finishSession(finalAnswers);
    else router.push("/dashboard");
  };

  /* ---------------- Render ---------------- */

  return (
    <AppShell>
      <main className="pb-24">
      {/* In-session bar (progress + end), sits under the app nav */}
      <div className="sticky top-16 z-30 glass border-b" style={{ borderColor: "var(--border)" }}>
        <div className="container-content flex h-14 items-center justify-between gap-4">
          {(phase === "answer" || phase === "score") ? (
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
          ) : (
            <span />
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
            {fromPredicted && (
              <span className="chip bg-gold-soft text-gold-ink">Predicted questions</span>
            )}
          </div>
        )}

        {/* HUB — the precursor. Tracks, phases, focus areas, customization. */}
        {phase === "setup" && (
          <PracticeHub
            role={role}
            interviewGap={interviewGap}
            situation={situation}
            onLaunch={launch}
            onCustom={() => setPhase("custom")}
          />
        )}

        {/* CUSTOM builder (the fine-grained session builder). */}
        {phase === "custom" && (
          <SetupCard
            role={role}
            company={company}
            posting={posting}
            setCompany={setCompany}
            setPosting={setPosting}
            focusTypes={focusTypes}
            setFocusTypes={setFocusTypes}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            count={count}
            setCount={setCount}
            onBack={() => setPhase("setup")}
            onStart={() => { setDomain("interview"); domainRef.current = "interview"; start(role || "Office Manager", situation); }}
          />
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
                    : current.category === "story"
                    ? "Storytelling"
                    : current.category === "speech"
                    ? "Speaking drill"
                    : "Behavioral"}
                </p>
                <h1 className="mt-3 flex items-start gap-2 font-serif text-2xl font-semibold leading-snug text-ink sm:text-3xl">
                  <span><Inline text={current.text} /></span>
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
                  onChange={(e) => { noteAnswerStart(); setAnswerText(e.target.value); }}
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
              recentAverage={perso.current.recentAverage}
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
                <p className="font-serif text-lg font-semibold text-ink">&ldquo;<Inline text={followUp} />&rdquo;</p>

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
                        <button
                          onClick={() => {
                            track("practice:followup_skipped", { index: index + 1 });
                            setFollowUp(null);
                          }}
                          className="btn-ghost text-sm"
                        >
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
                    <AnswerScoreCard
                      answer={followUpScored}
                      animate={false}
                      loadExample={(a) => apiGenerateExample(a.questionText, role, a.category)}
                    />
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
    </AppShell>
  );
}

/* ---------------- sub-views ---------------- */

/* ============================ Practice Hub ============================
   The precursor. Instead of dropping people straight into questions, this is
   the room they choose from: three practice domains (interview, storytelling,
   public speaking), a four-phase specialization path for the long haul, single-
   skill drills, and — only when it's relevant to them — the gap story. It's a
   deliberate "this is a practice you build over time" surface, not a one-shot. */

type LaunchCfg = { domain?: Domain; focusTypes?: string[]; difficulty?: string; count?: number; label?: string };

const DOMAINS: { key: Domain; icon: typeof MessageSquare; title: string; desc: string; minutes: string; cfg: LaunchCfg }[] = [
  {
    key: "interview", icon: MessageSquare, title: "Interview practice", minutes: "~10 min",
    desc: "A tailored mock for your exact role — behavioral, situational, and the questions this job actually asks.",
    cfg: { domain: "interview", count: 8, label: "interview" },
  },
  {
    key: "storytelling", icon: BookOpen, title: "Storytelling", minutes: "~8 min",
    desc: "Build the signature stories interviews turn on — a challenge, a failure, a time you led — and land each in one clean line.",
    cfg: { domain: "storytelling", count: 6, label: "storytelling" },
  },
  {
    key: "public_speaking", icon: Mic, title: "Public speaking", minutes: "~8 min",
    desc: "Impromptu topics, persuasion, and delivery drills for a calmer, clearer, more convincing voice — on any stage.",
    cfg: { domain: "public_speaking", count: 6, label: "public_speaking" },
  },
];

const PHASES: { n: number; title: string; tag: string; detail: string; cfg: LaunchCfg }[] = [
  { n: 1, title: "Foundations", tag: "Structure & STAR", detail: "Learn the shape of a strong answer and get comfortable.", cfg: { difficulty: "easy", count: 5, focusTypes: ["warmup", "behavioral"], label: "phase_foundations" } },
  { n: 2, title: "Fluency", tag: "Cut filler, tighten", detail: "Say more with fewer words. Kill the ums.", cfg: { difficulty: "standard", count: 8, focusTypes: ["behavioral", "situation"], label: "phase_fluency" } },
  { n: 3, title: "Pressure", tag: "Tough Qs & follow-ups", detail: "Hold steady when the panel pushes back.", cfg: { difficulty: "hard", count: 8, focusTypes: ["behavioral", "leadership", "situation"], label: "phase_pressure" } },
  { n: 4, title: "Mastery", tag: "Full mock, curveballs", detail: "A complete panel with no easing in.", cfg: { difficulty: "hard", count: 12, focusTypes: [], label: "phase_mastery" } },
];

const FOCUS_AREAS: { key: Dimension; label: string; blurb: string }[] = [
  { key: "clarity", label: "Clarity", blurb: "Lead with the point" },
  { key: "relevance", label: "Relevance", blurb: "Answer what was asked" },
  { key: "specificity", label: "Specificity", blurb: "Real details, real numbers" },
  { key: "confidence", label: "Confidence", blurb: "Drop the hedging" },
  { key: "conciseness", label: "Conciseness", blurb: "Trim the ramble" },
];

function PracticeHub({
  role,
  interviewGap,
  situation,
  onLaunch,
  onCustom,
}: {
  role: string;
  interviewGap: string;
  situation: Situation | null;
  onLaunch: (cfg: LaunchCfg) => void;
  onCustom: () => void;
}) {
  // The gap story is NOT for everyone. Show it only to people whose answers say
  // they actually have one, and frame it as situational, not a required step.
  const hasGap =
    interviewGap === "3-5yr" ||
    interviewGap === "5+yr" ||
    situation === "returning" ||
    situation === "laid_off" ||
    situation === "career_change";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <span className="eyebrow">Practice studio</span>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink sm:text-4xl">What do you want to work on?</h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-2">
          You&apos;re preparing for <strong className="text-ink">{role || "your role"}</strong>. Pick a track, follow the
          phases as you improve, or drill one skill. Everything you do is scored and feeds your metrics.
        </p>
      </div>

      {/* Quick start */}
      <button
        onClick={() => onLaunch({ domain: "interview", count: 8, label: "quick_start" })}
        className="group mt-8 flex w-full items-center gap-4 rounded-2xl p-6 text-left text-white shadow-lg transition-transform hover:-translate-y-0.5"
        style={{ background: "linear-gradient(135deg, var(--primary-bright), var(--primary-ink))" }}
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15">
          <Zap size={24} />
        </span>
        <span className="flex-1">
          <span className="block font-serif text-xl font-semibold">Quick start</span>
          <span className="block text-sm text-white/85">A full tailored interview for {role || "your role"}. About 10 minutes.</span>
        </span>
        <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" />
      </button>

      {/* Tracks / domains */}
      <SectionLabel icon={Layers} title="Choose a track" sub="Interviews are one skill. These build the others too." />
      <div className="grid gap-4 sm:grid-cols-3">
        {DOMAINS.map((d) => {
          const Icon = d.icon;
          return (
            <button
              key={d.key}
              onClick={() => onLaunch(d.cfg)}
              className="group flex flex-col rounded-2xl border bg-surface p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: "var(--primary-soft)" }}>
                <Icon size={20} className="text-primary-ink" />
              </span>
              <span className="mt-3 font-serif text-lg font-semibold text-ink">{d.title}</span>
              <span className="mt-1 flex-1 text-sm leading-relaxed text-ink-2">{d.desc}</span>
              <span className="mt-3 flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-primary-ink">
                {d.minutes}
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Specialization phases */}
      <SectionLabel icon={Flame} title="Specialization path" sub="A route from first reps to interview-ready. Move up as you improve." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PHASES.map((p) => (
          <button
            key={p.title}
            onClick={() => onLaunch(p.cfg)}
            className="group relative flex flex-col rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="font-mono text-2xs font-bold text-ink-3">PHASE {p.n}</span>
            <span className="mt-1.5 font-serif text-lg font-semibold text-ink">{p.title}</span>
            <span className="mt-0.5 text-2xs font-semibold uppercase tracking-wider text-primary-ink">{p.tag}</span>
            <span className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{p.detail}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-ink">
              Start <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>

      {/* Focus drills */}
      <SectionLabel icon={Target} title="Drill one skill" sub="Short sets aimed at a single dimension of your score." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {FOCUS_AREAS.map((f) => (
          <Link
            key={f.key}
            href={`/practice?focus=${f.key}&autostart=1`}
            onClick={() => track("practice:focus_start", { dimension: f.key })}
            className="rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="font-medium text-ink">{f.label}</span>
            <span className="mt-0.5 block text-xs text-ink-3">{f.blurb}</span>
          </Link>
        ))}
      </div>

      {/* Conditional: the gap story — only for people it applies to. */}
      {hasGap && (
        <div className="mt-6 rounded-2xl border-2 border-dashed p-6" style={{ borderColor: "var(--amber)" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-amber-ink">
                <BookOpen size={14} /> If you have a gap to explain
              </div>
              <h3 className="mt-1.5 font-serif text-lg font-semibold text-ink">Turn the gap question into your best answer</h3>
              <p className="mt-1 text-sm text-ink-2">
                Time away, a layoff, a career switch — the story you tell decides how it lands. Build one you believe, then
                drill it under pressure. Not everyone needs this; you might.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <ButtonLink href="/tools/gap-story" variant="secondary" size="sm">Build my story</ButtonLink>
              <Button size="sm" onClick={() => onLaunch({ focusTypes: ["gap"], difficulty: "standard", count: 6, label: "gap_drill" })}>
                Drill it <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom + change role */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 border-t pt-6" style={{ borderColor: "var(--border)" }}>
        <Button variant="secondary" onClick={onCustom}>
          <Sparkles size={16} /> Build a custom session
        </Button>
        <ButtonLink href="/onboarding" variant="ghost" size="sm">Change role or situation</ButtonLink>
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, title, sub }: { icon: typeof MessageSquare; title: string; sub: string }) {
  return (
    <div className="mb-4 mt-10 flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--bg-tint)" }}>
        <Icon size={16} className="text-primary" />
      </span>
      <div>
        <h2 className="font-serif text-lg font-semibold leading-none text-ink">{title}</h2>
        <p className="mt-1 text-xs text-ink-3">{sub}</p>
      </div>
    </div>
  );
}

const QUESTION_TYPES: { value: string; label: string; emoji: string }[] = [
  { value: "warmup", label: "Tell me about yourself", emoji: "👋" },
  { value: "behavioral", label: "Behavioral", emoji: "💬" },
  { value: "situation", label: "Situational", emoji: "🧩" },
  { value: "leadership", label: "Leadership & conflict", emoji: "🤝" },
  { value: "gap", label: "The gap question", emoji: "🕳️" },
  { value: "closer", label: "Questions to ask them", emoji: "🎯" },
];

function SetupCard({
  role,
  company,
  posting,
  setCompany,
  setPosting,
  focusTypes,
  setFocusTypes,
  difficulty,
  setDifficulty,
  count,
  setCount,
  onStart,
  onBack,
}: {
  role: string;
  company: string;
  posting: string;
  setCompany: (v: string) => void;
  setPosting: (v: string) => void;
  focusTypes: string[];
  setFocusTypes: (v: string[]) => void;
  difficulty: string;
  setDifficulty: (v: string) => void;
  count: number;
  setCount: (v: number) => void;
  onStart: () => void;
  onBack?: () => void;
}) {
  const [showContext, setShowContext] = useState(Boolean(company || posting));
  const [showCustom, setShowCustom] = useState(true);
  const toggleType = (t: string) =>
    setFocusTypes(focusTypes.includes(t) ? focusTypes.filter((x) => x !== t) : [...focusTypes, t]);
  return (
    <div className="mx-auto max-w-xl">
      {onBack && (
        <button onClick={onBack} className="btn-ghost mb-3 text-sm">
          <ChevronLeft size={16} /> Back to practice hub
        </button>
      )}
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
            A set of tailored questions for <strong className="text-ink">{role || "your role"}</strong>. About 10
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

        {/* Customize the session (optional) */}
        <div className="mt-4 rounded-xl border bg-bg-sunk/60 p-5" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setShowCustom((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="flex items-center gap-2 font-medium text-ink">
              <Sparkles size={16} className="text-primary" />
              Customize this session
              <span className="text-sm font-normal text-ink-3">
                {focusTypes.length ? `· ${focusTypes.length} type${focusTypes.length === 1 ? "" : "s"}` : "(optional)"}
              </span>
            </span>
            <ChevronDown size={18} className={cn("text-ink-3 transition-transform", showCustom && "rotate-180")} />
          </button>

          {showCustom && (
            <div className="mt-4 space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium text-ink-2">Focus on these question types</p>
                <div className="flex flex-wrap gap-2">
                  {QUESTION_TYPES.map((t) => {
                    const on = focusTypes.includes(t.value);
                    return (
                      <button
                        key={t.value}
                        onClick={() => toggleType(t.value)}
                        className="rounded-full border px-3 py-1.5 text-[0.8rem] font-medium transition-all"
                        style={{
                          borderColor: on ? "var(--primary)" : "var(--border-strong)",
                          background: on ? "var(--primary-soft)" : "var(--surface)",
                          color: on ? "var(--primary-ink)" : "var(--ink-2)",
                        }}
                      >
                        {t.emoji} {t.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-ink-3">Leave blank for a balanced mix.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium text-ink-2">Difficulty</p>
                  <div className="flex gap-1 rounded-full bg-bg-tint p-1">
                    {[
                      ["easy", "Gentle"],
                      ["standard", "Standard"],
                      ["hard", "Tough"],
                    ].map(([v, label]) => (
                      <button
                        key={v}
                        onClick={() => setDifficulty(v)}
                        className={cn(
                          "flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition-colors",
                          difficulty === v ? "bg-white text-ink shadow-xs" : "text-ink-2 hover:text-ink"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-ink-2">How many questions</p>
                  <div className="flex gap-1 rounded-full bg-bg-tint p-1">
                    {[5, 8, 12].map((n) => (
                      <button
                        key={n}
                        onClick={() => setCount(n)}
                        className={cn(
                          "flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition-colors",
                          count === n ? "bg-white text-ink shadow-xs" : "text-ink-2 hover:text-ink"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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
