"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Sparkles, X, Loader2, Building2, ChevronDown,
  Mic, BookOpen, MessageSquare, Layers, Target, Zap, Flame, ChevronLeft,
  Timer, SlidersHorizontal, Users, Gauge, Repeat, Clock, Check,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Inline } from "@/components/ui/RichText";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AnswerScoreCard } from "@/components/practice/AnswerScoreCard";
import { VoiceButton } from "@/components/ui/VoiceButton";
import { InfoTip } from "@/components/ui/Tooltip";
import { apiFollowUp, apiGenerateExample, apiGenerateQuestions, apiScoreAnswer } from "@/lib/client";
import { encodedContext } from "@/lib/context";
import { aggregateDimensions, computeOverall } from "@/lib/scoring";
import {
  getOnboarding, getPredictedSet, getProfile, getSessions, saveSession,
  getRoutines, saveRoutine, deleteRoutine, onStoreChange, getPrefs, type PracticeRoutine,
} from "@/lib/store";
import { average, cn, uid } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { mixpanelIncrement } from "@/lib/mixpanel";
import type { Dimension, DeliveryMetrics, Question, ScoredAnswer, Session, Situation } from "@/lib/types";

type Domain = "interview" | "storytelling" | "public_speaking";

/* Ideal answer-length bands the length-target customization maps to. */
const LENGTH_RANGE: Record<"short" | "medium" | "long", [number, number]> = {
  short: [40, 80],
  medium: [60, 150],
  long: [120, 220],
};

/* The mock-panel roster. In panel mode each question is attributed to one of
   these, rotating — so it feels like a real panel and the results can show how
   each interviewer scored you. */
const PANELISTS = [
  { name: "Dana", role: "Hiring Manager", initials: "DM" },
  { name: "Raj", role: "Team Lead", initials: "RL" },
  { name: "Sofia", role: "Peer interviewer", initials: "SP" },
  { name: "Marcus", role: "Skip-level", initials: "MS" },
];
const panelistFor = (i: number) => PANELISTS[i % PANELISTS.length];

/* Spaced repetition: the questions you scored lowest on across all history,
   deduped, weakest first — so "redo your hardest" drills exactly those. */
function weakestQuestions(sessions: Session[], limit: number): { text: string; category: string }[] {
  const seen = new Set<string>();
  const all: { text: string; category: string; score: number }[] = [];
  for (const s of sessions) {
    for (const a of s.answers || []) {
      const text = a.questionText;
      if (!text || seen.has(text)) continue;
      seen.add(text);
      all.push({ text, category: a.category || "behavioral", score: a.scores?.overall ?? 100 });
    }
  }
  return all
    .sort((x, y) => x.score - y.score)
    .slice(0, Math.max(4, Math.min(12, limit)))
    .map(({ text, category }) => ({ text, category }));
}

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
  // Deep customization that shapes the questions themselves.
  const [tone, setTone] = useState("");           // phrasing style
  const [interviewer, setInterviewer] = useState(""); // persona / demeanour
  const [seniority, setSeniority] = useState("");  // entry | mid | senior | exec
  const [stage, setStage] = useState("");          // screen | onsite | final
  const [framework, setFramework] = useState("");  // star | car | free
  const customRef = useRef({
    focusTypes: [] as string[], difficulty: "standard", count: 8, tone: "", interviewer: "",
    seniority: "", stage: "", framework: "",
  });
  useEffect(() => {
    customRef.current = { focusTypes, difficulty, count, tone, interviewer, seniority, stage, framework };
  }, [focusTypes, difficulty, count, tone, interviewer, seniority, stage, framework]);
  // Which practice domain this session is: interview, storytelling, or public
  // speaking. Threaded through a ref so the mount-time start() reads it fresh.
  const [domain, setDomain] = useState<Domain>("interview");
  const domainRef = useRef<Domain>("interview");
  useEffect(() => { domainRef.current = domain; }, [domain]);
  const [interviewGap, setInterviewGap] = useState("");
  // Session UX toggles (not question generation): per-question timer, whether we
  // lead with the mic, and the answer-length the ideal-length coaching aims for.
  const [timed, setTimed] = useState(false);
  const [voiceFirst, setVoiceFirst] = useState(false);
  const [lengthTarget, setLengthTarget] = useState<"short" | "medium" | "long">("medium");
  const lengthRange = LENGTH_RANGE[lengthTarget];
  // Review mode: rerun the questions you scored lowest on (spaced repetition).
  const reviewRef = useRef(false);
  const [isReview, setIsReview] = useState(false);
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

      // Review mode: drill the exact questions this person scored lowest on,
      // weakest first. Falls through to a normal session if there's no history.
      if (reviewRef.current) {
        const weak = weakestQuestions(hist, customRef.current.count || 6);
        if (weak.length) {
          setIsReview(true);
          setQuestions(
            weak.map((w, i) => ({
              number: i + 1,
              text: w.text,
              category: w.category,
              tip: "You scored low on this one before. Nail it this time.",
            }))
          );
          setIndex(0);
          setAnswers([]);
          setScored(null);
          setAnswerText("");
          sessionStart.current = Date.now();
          track("session_started", { mode: "review", role: r, questions: weak.length });
          mixpanelIncrement("sessions_started");
          setPhase("answer");
          return;
        }
      }
      setIsReview(false);

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
        tone: customRef.current.tone,
        interviewer: customRef.current.interviewer,
        seniority: customRef.current.seniority,
        stage: customRef.current.stage,
        framework: customRef.current.framework,
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

    // Seed every session default from the user's saved preferences, so their
    // choices in /preferences actually shape the builder + quick launches.
    const prefs = getPrefs();
    setDomain(prefs.domain as Domain); domainRef.current = prefs.domain as Domain;
    setDifficulty(prefs.difficulty); setCount(prefs.count);
    setTone(prefs.tone); setInterviewer(prefs.interviewer);
    setSeniority(prefs.seniority); setStage(prefs.stage); setFramework(prefs.framework);
    setTimed(prefs.timed); setVoiceFirst(prefs.voice);
    setLengthTarget((prefs.lengthTarget as "short" | "medium" | "long") || "medium");
    customRef.current = {
      focusTypes: [], difficulty: prefs.difficulty, count: prefs.count, tone: prefs.tone,
      interviewer: prefs.interviewer, seniority: prefs.seniority, stage: prefs.stage, framework: prefs.framework,
    };

    // A preset card can fully configure a session by URL (?autostart=1 plus any
    // of domain/types/count/difficulty/tone/interviewer/timed/voice). Apply that
    // config to the refs before start() reads them.
    if (autostart && !predictedId && !focusDim) {
      const types = (params.get("types") || "").split(",").map((x) => x.trim()).filter(Boolean);
      const cCount = Number(params.get("count")) || 8;
      const cDiff = params.get("difficulty") || "standard";
      const cTone = params.get("tone") || "";
      const cIv = params.get("interviewer") || "";
      const cDomain = (params.get("domain") as Domain) || "interview";
      setFocusTypes(types); setDifficulty(cDiff); setCount(cCount);
      setTone(cTone); setInterviewer(cIv); setDomain(cDomain); domainRef.current = cDomain;
      setTimed(params.get("timed") === "1"); setVoiceFirst(params.get("voice") === "1");
      reviewRef.current = params.get("review") === "1";
      customRef.current = {
        focusTypes: types, difficulty: cDiff, count: cCount, tone: cTone, interviewer: cIv,
        seniority: params.get("seniority") || "", stage: params.get("stage") || "", framework: params.get("framework") || "",
      };
    }

    // Deep links (a predicted set, a focus drill, or explicit autostart) drop
    // straight into a session. Otherwise we land on the practice HUB — the
    // precursor — even when the role is known, so people pick a track, a phase,
    // or a focus instead of being thrown into questions.
    if (predictedId || autostart || focusDim) {
      start(r || "Office Manager", s, predictedId || undefined);
    } else if (prefs.autostart) {
      // "Skip the hub" preference: drop straight into a session on the defaults.
      start(r || "Office Manager", s);
    } else {
      setPhase("setup");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Launch a session from any hub choice or preset. Writes the refs
  // synchronously (not just state) so the immediately-following start() reads
  // the right config.
  const launch = useCallback(
    (cfg: LaunchCfg) => {
      const d = cfg.domain || "interview";
      const ft = cfg.focusTypes || [];
      const diff = cfg.difficulty || "standard";
      const c = cfg.count || 8;
      const tn = cfg.tone || "";
      const iv = cfg.interviewer || "";
      setDomain(d); domainRef.current = d;
      setFocusTypes(ft); setDifficulty(diff); setCount(c); setTone(tn); setInterviewer(iv);
      setTimed(Boolean(cfg.timed)); setVoiceFirst(Boolean(cfg.voice));
      customRef.current = {
        focusTypes: ft, difficulty: diff, count: c, tone: tn, interviewer: iv,
        seniority: customRef.current.seniority, stage: customRef.current.stage, framework: customRef.current.framework,
      };
      track("practice:track_start", {
        domain: d, difficulty: diff, count: c, tone: tn, interviewer: iv,
        timed: Boolean(cfg.timed), voice: Boolean(cfg.voice), label: cfg.label || "",
      });
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
        lengthTarget,
      },
      false
    );
    result.delivery = deliveryRef.current ?? undefined;
    result.secondsOnQuestion = questionStart.current
      ? Math.round((Date.now() - questionStart.current) / 1000)
      : undefined;
    if (interviewer === "panel") {
      const p = panelistFor(index);
      result.interviewer = `${p.name} · ${p.role}`;
    }
    setScored(result);
    setSubmitting(false);
    // Track the FULL speech + content profile of this answer, so every metric we
    // capture (delivery + the anxiety tells + all five dimensions) is queryable
    // in Mixpanel, not just the headline score.
    const anx = result.anxiety;
    const dl = result.delivery;
    const sc = result.scores;
    track("practice:scored", {
      index: index + 1,
      overall: sc?.overall ?? 0,
      clarity: sc?.clarity ?? 0,
      relevance: sc?.relevance ?? 0,
      specificity: sc?.specificity ?? 0,
      confidence: sc?.confidence ?? 0,
      conciseness: sc?.conciseness ?? 0,
      words: result.wordCount,
      wpm: dl?.wpm ?? 0,
      durationSec: dl?.durationSec ?? 0,
      pauseCount: dl?.pauseCount ?? 0,
      longestPauseSec: dl?.longestPauseSec ?? 0,
      fillers: anx?.fillerCount ?? 0,
      hedges: anx?.hedgeCount ?? 0,
      apologies: anx?.apologyCount ?? 0,
      underminers: anx?.underminerCount ?? 0,
      tells: anx?.total ?? 0,
      category: current.category,
      source: result.source,
      spoken: Boolean(result.delivery),
    });
    mixpanelIncrement("answers_scored");
    if (dl) mixpanelIncrement("spoken_answers");
    if (anx) mixpanelIncrement("filler_words_total", anx.fillerCount || 0);
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
        context: encodedContext(),
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
      lengthTarget,
    });
    result.delivery = fuDeliveryRef.current ?? undefined;
    if (interviewer === "panel") {
      const p = panelistFor(index);
      result.interviewer = `${p.name} · ${p.role}`;
    }
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
      mode: focusDim ? "focus" : fromPredicted ? "predicted" : isReview ? "review" : "practice",
      overall: computeOverall(dimensions),
      dimensions,
      durationSeconds: Math.round((Date.now() - sessionStart.current) / 1000),
      avgSecondsPerQuestion,
      answers: finalAnswers,
      focusDimension: focusDim,
    };
    saveSession(session);
    // Session-level speech rollup: every delivery + tell metric summarised, so a
    // funnel or profile in Mixpanel can slice on "sessions where fillers dropped".
    const withDelivery = finalAnswers.filter((a) => a.delivery);
    const sumBy = (f: (a: ScoredAnswer) => number) => finalAnswers.reduce((s, a) => s + (f(a) || 0), 0);
    const totalWords = sumBy((a) => a.wordCount);
    const avgWpm = withDelivery.length
      ? Math.round(withDelivery.reduce((s, a) => s + (a.delivery?.wpm || 0), 0) / withDelivery.length)
      : 0;
    const fillers = sumBy((a) => a.anxiety?.fillerCount ?? 0);
    const hedges = sumBy((a) => a.anxiety?.hedgeCount ?? 0);
    const apologies = sumBy((a) => a.anxiety?.apologyCount ?? 0);
    const underminers = sumBy((a) => a.anxiety?.underminerCount ?? 0);
    track("session_complete", {
      overall: session.overall,
      mode: session.mode,
      role,
      questions: finalAnswers.length,
      clarity: dimensions.clarity,
      relevance: dimensions.relevance,
      specificity: dimensions.specificity,
      confidence: dimensions.confidence,
      conciseness: dimensions.conciseness,
      durationSec: session.durationSeconds,
      words: totalWords,
      avgWpm,
      spokenAnswers: withDelivery.length,
      fillers,
      hedges,
      apologies,
      underminers,
      tellsPer100: totalWords ? Math.round(((fillers + hedges + apologies + underminers) / totalWords) * 1000) / 10 : 0,
    });
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
              {phase === "answer" && (
                <QuestionTimer
                  key={index}
                  timed={timed}
                  targetSec={difficulty === "hard" ? 90 : difficulty === "easy" ? 150 : 120}
                />
              )}
            </div>
          ) : (
            <span />
          )}
          <button onClick={endEarly} className="btn-ghost text-sm">
            <X size={16} /> End
          </button>
        </div>
      </div>

      <div className={cn(phase === "setup" ? "container-wide" : "container-content", "pt-10")}>
        {/* role chip */}
        {(phase === "answer" || phase === "score") && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="chip">Preparing for: <strong className="text-ink">{role}</strong></span>
            {company && <span className="chip">at <strong className="text-ink">{company}</strong></span>}
            {focusDim && <span className="chip bg-primary-soft text-primary-ink">Focus: {focusDim}</span>}
            {fromPredicted && (
              <span className="chip bg-gold-soft text-gold-ink">Predicted questions</span>
            )}
            {isReview && <span className="chip bg-gold-soft text-gold-ink">Review · your hardest</span>}
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
            domain={domain}
            setDomain={setDomain}
            focusTypes={focusTypes}
            setFocusTypes={setFocusTypes}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            count={count}
            setCount={setCount}
            tone={tone}
            setTone={setTone}
            interviewer={interviewer}
            setInterviewer={setInterviewer}
            timed={timed}
            setTimed={setTimed}
            voiceFirst={voiceFirst}
            setVoiceFirst={setVoiceFirst}
            lengthTarget={lengthTarget}
            setLengthTarget={setLengthTarget}
            seniority={seniority}
            setSeniority={setSeniority}
            stage={stage}
            setStage={setStage}
            framework={framework}
            setFramework={setFramework}
            onBack={() => setPhase("setup")}
            onSaveRoutine={(name) =>
              saveRoutine({
                id: uid("rt"),
                name,
                createdAt: new Date().toISOString(),
                cfg: { domain, focusTypes, difficulty, count, tone, interviewer, timed, voice: voiceFirst },
              })
            }
            onStart={() => {
              customRef.current = { focusTypes, difficulty, count, tone, interviewer, seniority, stage, framework };
              domainRef.current = domain;
              start(role || "Office Manager", situation);
            }}
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
                {interviewer === "panel" && (() => {
                  const p = panelistFor(index);
                  return (
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-full text-2xs font-bold text-white" style={{ background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))" }}>
                        {p.initials}
                      </span>
                      <span className="text-sm text-ink-2">
                        <strong className="text-ink">{p.name}</strong> · {p.role} asks
                      </span>
                    </div>
                  );
                })()}
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
                {voiceFirst && (
                  <div
                    className="mb-3 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm"
                    style={{ borderColor: "var(--primary)", background: "var(--primary-soft)", color: "var(--primary-ink)" }}
                  >
                    <Mic size={15} /> Voice-first: tap the mic and just talk. We&apos;ll transcribe and score your delivery.
                  </div>
                )}
                <textarea
                  autoFocus={!voiceFirst}
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
                    Ideal: {lengthRange[0]}–{lengthRange[1]} words
                    <InfoTip title="How long should it be?">
                      {lengthRange[0]} to {lengthRange[1]} words is the target you set. Long enough to tell a real story,
                      short enough to stay sharp.
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

/* Per-question timer. Counts up; in timed mode it shows the target and turns
   amber once you go over, so pace is visible without being a hard cutoff. */
function QuestionTimer({ timed, targetSec }: { timed: boolean; targetSec: number }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const over = timed && sec > targetSec;
  return (
    <span
      className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-2xs font-semibold sm:inline-flex"
      style={{
        background: over ? "var(--amber-soft)" : "var(--bg-tint)",
        color: over ? "var(--amber-ink)" : "var(--ink-2)",
      }}
      title={timed ? `Target ${fmt(targetSec)} per question` : "Time on this question"}
    >
      <Timer size={12} /> {fmt(sec)}{timed ? ` / ${fmt(targetSec)}` : ""}
    </span>
  );
}

/* ============================ Practice Hub ============================
   The precursor. Instead of dropping people straight into questions, this is
   the room they choose from: three practice domains (interview, storytelling,
   public speaking), a four-phase specialization path for the long haul, single-
   skill drills, and — only when it's relevant to them — the gap story. It's a
   deliberate "this is a practice you build over time" surface, not a one-shot. */

type LaunchCfg = {
  domain?: Domain;
  focusTypes?: string[];
  difficulty?: string;
  count?: number;
  tone?: string;
  interviewer?: string;
  timed?: boolean;
  voice?: boolean;
  label?: string;
};

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

// Ready-made sessions: one tap into a fully-configured session. Each is just a
// LaunchCfg, so adding a new preset card is a one-line change.
const PRESETS: { title: string; desc: string; badge: string; cfg: LaunchCfg }[] = [
  { title: "2-minute warm-up", desc: "Four easy questions to shake off the nerves.", badge: "Warm-up", cfg: { count: 4, difficulty: "easy", focusTypes: ["warmup", "behavioral"], tone: "conversational", label: "preset_warmup" } },
  { title: "Rapid-fire round", desc: "Ten punchy questions, on the clock.", badge: "Timed", cfg: { count: 10, tone: "rapid_fire", timed: true, label: "preset_rapid" } },
  { title: "Full mock panel", desc: "Twelve questions, a tough panel, timed. The real thing.", badge: "Hard", cfg: { count: 12, difficulty: "hard", interviewer: "panel", timed: true, label: "preset_panel" } },
  { title: "The skeptic", desc: "A probing interviewer who wants proof for every claim.", badge: "Pressure", cfg: { difficulty: "hard", interviewer: "skeptical", label: "preset_skeptic" } },
  { title: "Behavioral deep-dive", desc: "Eight 'tell me about a time' questions, STAR all the way.", badge: "Behavioral", cfg: { focusTypes: ["behavioral"], count: 8, label: "preset_behavioral" } },
  { title: "Curveballs", desc: "Scenario questions you can't rehearse — think on your feet.", badge: "Scenario", cfg: { tone: "scenario", difficulty: "hard", label: "preset_curveball" } },
];

// Surgical single-skill drills — narrower than presets, aimed at one weakness.
const DRILLS: { title: string; desc: string; cfg: LaunchCfg }[] = [
  { title: "Filler-word killer", desc: "Speak your answers; every um and hedge gets flagged.", cfg: { count: 5, voice: true, tone: "conversational", label: "drill_filler" } },
  { title: "Cut it to 60 seconds", desc: "Tight, timed answers — no rambling.", cfg: { count: 6, timed: true, label: "drill_60s" } },
  { title: "Tell me about yourself", desc: "Drill the opener until it's automatic.", cfg: { count: 4, focusTypes: ["warmup"], label: "drill_tmay" } },
  { title: "The weakness question", desc: "Turn your weakness into a strong, honest answer.", cfg: { count: 4, focusTypes: ["behavioral"], tone: "formal", label: "drill_weakness" } },
  { title: "Questions to ask them", desc: "Close strong with sharp questions of your own.", cfg: { count: 4, focusTypes: ["closer"], label: "drill_closer" } },
  { title: "Impromptu speaking", desc: "Random topics, 60 seconds each, on your feet.", cfg: { domain: "public_speaking", count: 6, timed: true, label: "drill_impromptu" } },
];

function routineSummary(r: PracticeRoutine): string {
  const c = r.cfg;
  const noun = c.domain === "storytelling" ? "stories" : c.domain === "public_speaking" ? "drills" : "Qs";
  const parts = [`${c.count || 8} ${noun}`];
  if (c.difficulty && c.difficulty !== "standard") parts.push(c.difficulty);
  if (c.timed) parts.push("timed");
  if (c.voice) parts.push("voice");
  return parts.join(" · ");
}

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

  const [routines, setRoutines] = useState<PracticeRoutine[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  useEffect(() => {
    const sync = () => {
      setRoutines(getRoutines());
      setSessionCount(getSessions().length);
    };
    sync();
    return onStoreChange(sync);
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl">
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

      {/* Redo your hardest — spaced repetition of the questions you scored lowest on */}
      {sessionCount > 0 && (
        <Link
          href="/practice?autostart=1&review=1&count=6"
          onClick={() => track("practice:review_start", {})}
          className="group mt-4 flex w-full items-center gap-4 rounded-2xl border-2 border-dashed p-5 transition-all hover:-translate-y-0.5 hover:shadow-sm"
          style={{ borderColor: "var(--gold)", background: "var(--gold-soft)" }}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
            <Repeat size={20} />
          </span>
          <span className="flex-1">
            <span className="block font-serif text-base font-semibold text-ink">Redo your hardest questions</span>
            <span className="block text-sm text-ink-2">The six you scored lowest on, weakest first. Beat your old self.</span>
          </span>
          <ArrowRight size={18} className="text-gold-ink transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {/* Your saved routines */}
      {routines.length > 0 && (
        <>
          <SectionLabel icon={Repeat} title="Your routines" sub="Saved session setups. One tap to run again." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {routines.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl border p-4 transition-all hover:shadow-sm"
                style={{ borderColor: "var(--border)" }}
              >
                <button
                  onClick={() => onLaunch({ ...r.cfg, domain: r.cfg.domain as Domain })}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate font-medium text-ink">{r.name}</span>
                  <span className="block text-xs text-ink-3">{routineSummary(r)}</span>
                </button>
                <button
                  onClick={() => deleteRoutine(r.id)}
                  title="Delete routine"
                  className="shrink-0 text-ink-3 transition-colors hover:text-coral-ink"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

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

      {/* Ready-made presets */}
      <SectionLabel icon={Zap} title="Ready-made sessions" sub="One tap into a fully-configured session." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRESETS.map((p) => (
          <button
            key={p.title}
            onClick={() => onLaunch(p.cfg)}
            className="group flex flex-col rounded-2xl border bg-surface p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider text-primary-ink">
              {p.badge}
            </span>
            <span className="mt-2.5 font-serif text-base font-semibold text-ink">{p.title}</span>
            <span className="mt-1 flex-1 text-sm leading-relaxed text-ink-2">{p.desc}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-ink">
              Start <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
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

      {/* Targeted drills — surgical single-skill reps. */}
      <SectionLabel icon={Target} title="Targeted drills" sub="Short, surgical reps aimed at one habit." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DRILLS.map((d) => (
          <button
            key={d.title}
            onClick={() => onLaunch(d.cfg)}
            className="group flex flex-col rounded-2xl border bg-surface p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="font-serif text-base font-semibold text-ink">{d.title}</span>
            <span className="mt-1 flex-1 text-sm leading-relaxed text-ink-2">{d.desc}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-ink">
              Start <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
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

      {/* Custom + browse + change role */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 border-t pt-6" style={{ borderColor: "var(--border)" }}>
        <Button variant="secondary" onClick={onCustom}>
          <SlidersHorizontal size={16} /> Build a custom session
        </Button>
        <ButtonLink href="/practice/library" variant="secondary">
          <BookOpen size={16} /> Browse the question bank
        </ButtonLink>
        <ButtonLink href="/onboarding" variant="ghost" size="sm">Change role</ButtonLink>
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
  { value: "technical", label: "Role knowledge", emoji: "🛠️" },
  { value: "values", label: "Values & culture", emoji: "🌱" },
  { value: "gap", label: "The gap question", emoji: "🕳️" },
  { value: "salary", label: "Salary & negotiation", emoji: "💰" },
  { value: "closer", label: "Questions to ask them", emoji: "🎯" },
];

/* ---- Session Builder option banks ---- */
const TONES = [
  { value: "", label: "Balanced", emoji: "⚖️" },
  { value: "conversational", label: "Conversational", emoji: "💬" },
  { value: "formal", label: "Formal", emoji: "🎩" },
  { value: "rapid_fire", label: "Rapid-fire", emoji: "⚡" },
  { value: "scenario", label: "Scenario", emoji: "🧭" },
];
const INTERVIEWERS = [
  { value: "", label: "Default", emoji: "🙂" },
  { value: "friendly", label: "Friendly", emoji: "😊" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "skeptical", label: "Skeptical", emoji: "🤨" },
  { value: "panel", label: "Panel", emoji: "👥" },
];
const DOMAINS_OPT = [
  { value: "interview", label: "Interview", emoji: "💬" },
  { value: "storytelling", label: "Storytelling", emoji: "📖" },
  { value: "public_speaking", label: "Public speaking", emoji: "🎤" },
];
const COUNTS = [4, 6, 8, 10, 12];
const SENIORITY_OPT = [
  { value: "", label: "Any level" }, { value: "entry", label: "Entry" }, { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" }, { value: "exec", label: "Executive" },
];
const STAGE_OPT = [
  { value: "", label: "Any stage" }, { value: "screen", label: "Phone screen" },
  { value: "onsite", label: "Onsite" }, { value: "final", label: "Final round" },
];
const FRAMEWORK_OPT = [
  { value: "", label: "Free-form" }, { value: "star", label: "STAR" }, { value: "car", label: "CAR" },
];

function OptionChips({
  options,
  isOn,
  onPick,
}: {
  options: { value: string; label: string; emoji?: string }[];
  isOn: (v: string) => boolean;
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = isOn(o.value);
        return (
          <button
            key={o.value || "none"}
            onClick={() => onPick(o.value)}
            className="rounded-full border px-3 py-1.5 text-[0.8rem] font-medium transition-all"
            style={{
              borderColor: on ? "var(--primary)" : "var(--border-strong)",
              background: on ? "var(--primary-soft)" : "var(--surface)",
              color: on ? "var(--primary-ink)" : "var(--ink-2)",
            }}
          >
            {o.emoji ? `${o.emoji} ` : ""}{o.label}
          </button>
        );
      })}
    </div>
  );
}

function BuilderSection({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof MessageSquare;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={15} className="text-primary" />
        <span className="text-sm font-semibold text-ink">{title}</span>
        {hint && <span className="text-xs font-normal text-ink-3">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onClick, icon: Icon, label }: { on: boolean; onClick: () => void; icon: typeof Mic; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all"
      style={{
        borderColor: on ? "var(--primary)" : "var(--border-strong)",
        background: on ? "var(--primary-soft)" : "var(--surface)",
        color: on ? "var(--primary-ink)" : "var(--ink-2)",
      }}
    >
      <Icon size={15} /> {label}
      <span className="ml-1 grid h-4 w-4 place-items-center rounded-full" style={{ background: on ? "var(--primary)" : "var(--border-strong)" }}>
        {on && <Check size={11} className="text-white" />}
      </span>
    </button>
  );
}

/* The deep session builder. Every knob that shapes a session: domain, question
   types, count, difficulty, phrasing, interviewer persona, timing and voice —
   plus optional job context. Defaults are sensible so it's fast, but nothing is
   hidden from someone who wants to tune it. */
function SetupCard({
  role,
  company,
  posting,
  setCompany,
  setPosting,
  domain,
  setDomain,
  focusTypes,
  setFocusTypes,
  difficulty,
  setDifficulty,
  count,
  setCount,
  tone,
  setTone,
  interviewer,
  setInterviewer,
  timed,
  setTimed,
  voiceFirst,
  setVoiceFirst,
  lengthTarget,
  setLengthTarget,
  seniority,
  setSeniority,
  stage,
  setStage,
  framework,
  setFramework,
  onStart,
  onBack,
  onSaveRoutine,
}: {
  role: string;
  company: string;
  posting: string;
  setCompany: (v: string) => void;
  setPosting: (v: string) => void;
  domain: Domain;
  setDomain: (v: Domain) => void;
  focusTypes: string[];
  setFocusTypes: (v: string[]) => void;
  difficulty: string;
  setDifficulty: (v: string) => void;
  count: number;
  setCount: (v: number) => void;
  tone: string;
  setTone: (v: string) => void;
  interviewer: string;
  setInterviewer: (v: string) => void;
  timed: boolean;
  setTimed: (v: boolean) => void;
  voiceFirst: boolean;
  setVoiceFirst: (v: boolean) => void;
  lengthTarget: "short" | "medium" | "long";
  setLengthTarget: (v: "short" | "medium" | "long") => void;
  seniority: string;
  setSeniority: (v: string) => void;
  stage: string;
  setStage: (v: string) => void;
  framework: string;
  setFramework: (v: string) => void;
  onStart: () => void;
  onBack?: () => void;
  onSaveRoutine: (name: string) => void;
}) {
  const [saved, setSaved] = useState(false);
  const toggleType = (t: string) =>
    setFocusTypes(focusTypes.includes(t) ? focusTypes.filter((x) => x !== t) : [...focusTypes, t]);
  const domainLabel = DOMAINS_OPT.find((d) => d.value === domain)?.label || "Interview";
  const handleSave = () => {
    const name = window.prompt("Name this routine", `${domainLabel} · ${count} ${domain === "interview" ? "Qs" : "drills"}`);
    if (name && name.trim()) {
      onSaveRoutine(name.trim());
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    }
  };
  const summary =
    `${count} ${domain === "interview" ? "Qs" : "drills"} · ${domainLabel}` +
    `${difficulty !== "standard" ? ` · ${difficulty}` : ""}${timed ? " · timed" : ""}${voiceFirst ? " · voice" : ""}`;

  return (
    <div className="mx-auto max-w-2xl">
      {onBack && (
        <button onClick={onBack} className="btn-ghost mb-3 text-sm">
          <ChevronLeft size={16} /> Back to practice hub
        </button>
      )}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-7 sm:p-9">
        <div className="text-center">
          <span
            className="mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm"
            style={{ background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))" }}
          >
            <SlidersHorizontal size={22} />
          </span>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-ink sm:text-3xl">Build your session</h1>
          <p className="mt-2 text-ink-2">
            Tune every knob for <strong className="text-ink">{role || "your role"}</strong>, or keep the defaults and go.
          </p>
        </div>

        <div className="mt-7 space-y-6">
          <BuilderSection icon={Layers} title="Focus">
            <OptionChips options={DOMAINS_OPT} isOn={(v) => domain === v} onPick={(v) => setDomain(v as Domain)} />
          </BuilderSection>

          {domain === "interview" && (
            <BuilderSection icon={MessageSquare} title="Question types" hint="leave blank for a balanced mix">
              <OptionChips
                options={QUESTION_TYPES.map(({ value, label, emoji }) => ({ value, label, emoji }))}
                isOn={(v) => focusTypes.includes(v)}
                onPick={toggleType}
              />
            </BuilderSection>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <BuilderSection icon={Repeat} title="How many">
              <div className="flex gap-1 rounded-full bg-bg-tint p-1">
                {COUNTS.map((n) => (
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
            </BuilderSection>
            <BuilderSection icon={Gauge} title="Difficulty">
              <div className="flex gap-1 rounded-full bg-bg-tint p-1">
                {[["easy", "Gentle"], ["standard", "Standard"], ["hard", "Tough"]].map(([v, label]) => (
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
            </BuilderSection>
          </div>

          <BuilderSection icon={Clock} title="Answer length" hint="what the coaching aims for">
            <div className="flex gap-1 rounded-full bg-bg-tint p-1 sm:max-w-xs">
              {(["short", "medium", "long"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setLengthTarget(v)}
                  className={cn(
                    "flex-1 rounded-full px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                    lengthTarget === v ? "bg-white text-ink shadow-xs" : "text-ink-2 hover:text-ink"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </BuilderSection>

          <BuilderSection icon={MessageSquare} title="Phrasing" hint="how the questions read">
            <OptionChips options={TONES} isOn={(v) => tone === v} onPick={setTone} />
          </BuilderSection>

          <BuilderSection icon={Users} title="Interviewer" hint="who's asking">
            <OptionChips options={INTERVIEWERS} isOn={(v) => interviewer === v} onPick={setInterviewer} />
          </BuilderSection>

          <BuilderSection icon={Gauge} title="Seniority" hint="how deep and strategic the questions go">
            <OptionChips options={SENIORITY_OPT} isOn={(v) => seniority === v} onPick={setSeniority} />
          </BuilderSection>

          <BuilderSection icon={Layers} title="Interview stage" hint="which round to simulate">
            <OptionChips options={STAGE_OPT} isOn={(v) => stage === v} onPick={setStage} />
          </BuilderSection>

          <BuilderSection icon={MessageSquare} title="Answer framework" hint="what the coaching tips push toward">
            <OptionChips options={FRAMEWORK_OPT} isOn={(v) => framework === v} onPick={setFramework} />
          </BuilderSection>

          <BuilderSection icon={Timer} title="Session options">
            <div className="flex flex-wrap gap-2">
              <Toggle on={timed} onClick={() => setTimed(!timed)} icon={Clock} label="Timed" />
              <Toggle on={voiceFirst} onClick={() => setVoiceFirst(!voiceFirst)} icon={Mic} label="Voice-first" />
            </div>
          </BuilderSection>

          {/* Job context — embedded, no dropdown */}
          <BuilderSection icon={Building2} title="Tailor to a specific job" hint="optional — company + posting">
            <div className="space-y-3">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company (e.g., Mercy Hospital)"
                className="field"
              />
              <textarea
                value={posting}
                onChange={(e) => setPosting(e.target.value)}
                placeholder="Paste the job posting for questions a real hiring manager for THIS job would ask."
                className="field min-h-[110px] resize-y text-sm leading-relaxed"
              />
            </div>
          </BuilderSection>
        </div>

        <Button onClick={onStart} size="lg" className="mt-7 w-full">
          Start · {summary} <ArrowRight size={18} />
        </Button>
        <div className="mt-3 flex items-center justify-center gap-4">
          <button onClick={handleSave} className="btn-ghost text-sm">
            {saved ? <><Check size={15} /> Saved</> : "Save as routine"}
          </button>
          <ButtonLink href="/onboarding" variant="ghost" size="sm">
            Change role
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
