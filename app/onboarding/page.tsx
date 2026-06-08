"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Search, Star, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { OnboardingShowcase, ShowcaseQuestions, ShowcaseProgress } from "@/components/onboarding/Showcase";
import { ROLES } from "@/lib/roles";
import { SITUATION_META } from "@/lib/utils";
import { setOnboarding, setProfile } from "@/lib/store";
import { track } from "@/lib/analytics";
import type { InterviewGap, Situation } from "@/lib/types";

type Demo = "convo" | "questions" | "progress";
type Opt = { value: string; label: string; emoji?: string };
type Step =
  | { kind: "choice"; key: string; q: string; sub?: string; cols?: 1 | 2; options: Opt[]; demo: Demo }
  | { kind: "role"; q: string; sub?: string; demo: Demo }
  | { kind: "validation"; eyebrow: string; value: number; suffix: string; headline: string; body: string; source: string; demo: Demo };

const SITUATIONS: Situation[] = ["returning", "laid_off", "promotion", "career_change"];

const STEPS: Step[] = [
  {
    kind: "choice",
    key: "confidence",
    q: "How do you feel about interviewing right now?",
    sub: "Be honest. There's no wrong answer here.",
    options: [
      { value: "rusty", label: "Pretty rusty", emoji: "😬" },
      { value: "shaky", label: "A little shaky", emoji: "😟" },
      { value: "okay", label: "I do okay", emoji: "🙂" },
      { value: "confident", label: "Fairly confident", emoji: "😎" },
    ],
    demo: "convo",
  },
  {
    kind: "choice",
    key: "struggle",
    q: "What trips you up the most?",
    sub: "We'll focus your practice here first.",
    options: [
      { value: "nerves", label: "Nerves take over", emoji: "😰" },
      { value: "ramble", label: "I ramble", emoji: "🗣️" },
      { value: "hard_q", label: "The hard questions", emoji: "🧠" },
      { value: "selling", label: "Talking myself up", emoji: "🙈" },
    ],
    demo: "convo",
  },
  {
    kind: "choice",
    key: "industry",
    q: "What field are you in?",
    sub: "So your questions sound like your industry.",
    cols: 2,
    options: [
      { value: "healthcare", label: "Healthcare", emoji: "🩺" },
      { value: "education", label: "Education", emoji: "🎓" },
      { value: "finance", label: "Finance", emoji: "💼" },
      { value: "tech", label: "Technology", emoji: "💻" },
      { value: "operations", label: "Operations", emoji: "⚙️" },
      { value: "sales", label: "Sales & Marketing", emoji: "📈" },
      { value: "retail", label: "Retail & Service", emoji: "🛍️" },
      { value: "nonprofit", label: "Nonprofit & Gov", emoji: "🏛️" },
      { value: "trades", label: "Skilled trades", emoji: "🔧" },
      { value: "other", label: "Something else", emoji: "✨" },
    ],
    demo: "convo",
  },
  {
    kind: "validation",
    eyebrow: "You're not imagining it",
    value: 45,
    suffix: "%",
    headline: "Getting hired is about 45% harder than two years ago.",
    body: "More applicants per role, longer searches, and tougher screens. It's the market that changed, not you. Practice is the one part you fully control.",
    source: "Based on 2025 labor market hiring data",
    demo: "progress",
  },
  {
    kind: "choice",
    key: "situation",
    q: "What brings you here?",
    sub: "We tailor every question to your situation.",
    options: SITUATIONS.map((s) => ({ value: s, label: SITUATION_META[s].label, emoji: SITUATION_META[s].emoji })),
    demo: "convo",
  },
  {
    kind: "role",
    q: "What job are you preparing for?",
    sub: "Type any role. The AI adapts to anything you enter.",
    demo: "questions",
  },
  {
    kind: "choice",
    key: "gap",
    q: "When did you last interview?",
    sub: "This calibrates how gently we ease you in.",
    options: [
      { value: "<1yr", label: "Less than a year ago" },
      { value: "1-3yr", label: "1 to 3 years ago" },
      { value: "3-5yr", label: "3 to 5 years ago" },
      { value: "5+yr", label: "More than 5 years" },
    ],
    demo: "questions",
  },
  {
    kind: "validation",
    eyebrow: "Why practice wins",
    value: 340,
    suffix: " per job",
    headline: "The average opening now draws 340 applicants.",
    body: "Only about 2% ever get an interview. The people who practice walk in calm and specific. That is how you land in that 2%.",
    source: "Industry hiring benchmarks, 2025",
    demo: "progress",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");

  const total = STEPS.length;
  const current = STEPS[step];

  const go = (next: number) => {
    if (next >= total) return finish();
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const choose = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    if (key === "situation") track("onboarding_situation", { situation: value });
    setTimeout(() => go(step + 1), 220);
  };

  const suggestions = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return ROLES.filter((r) => r.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const finish = () => {
    const situation = (answers.situation as Situation) || null;
    const gap = (answers.gap as InterviewGap) || "1-3yr";
    const finalRole = role.trim() || query.trim() || "Office Manager";
    setOnboarding({ situation, targetRole: finalRole, interviewGap: gap });
    setProfile({ situation, targetRole: finalRole, interviewGap: gap });
    track("onboarding_complete", { situation, role: finalRole, gap, ...answers });
    router.push("/practice?autostart=1");
  };

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 44 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -44 }),
  };

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      {/* ============ LEFT ============ */}
      <div className="relative flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-6 py-6 sm:px-10">
          <Logo />
          <span className="text-sm text-ink-2">
            Have an account?{" "}
            <Link href="/signin?next=/practice" className="font-semibold text-primary-ink hover:underline">Sign in</Link>
          </span>
        </div>

        {/* progress */}
        <div className="px-6 sm:px-10">
          <div className="mx-auto flex max-w-md items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={false}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: "linear-gradient(90deg, var(--primary), var(--primary-bright))" }}
                />
              </div>
            ))}
          </div>
          <p className="mx-auto mt-2 max-w-md text-center text-2xs font-medium uppercase tracking-wider text-ink-3">
            Step {step + 1} of {total}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                {current.kind === "choice" && (
                  <>
                    <h1 className="font-serif text-3xl font-semibold text-ink sm:text-[2.4rem] sm:leading-[1.1]">{current.q}</h1>
                    {current.sub && <p className="mt-3 text-ink-2">{current.sub}</p>}
                    <div className={`mt-8 grid gap-3 ${current.cols === 2 ? "grid-cols-2" : ""}`}>
                      {current.options.map((o, i) => {
                        const active = answers[current.key] === o.value;
                        return (
                          <motion.button
                            key={o.value}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.04 + i * 0.05, duration: 0.35 }}
                            whileHover={{ y: -3 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => choose(current.key, o.value)}
                            className="group flex items-center gap-3 rounded-xl border-2 bg-surface p-4 text-left shadow-sm transition-shadow hover:shadow-lg"
                            style={{ borderColor: active ? "var(--primary)" : "var(--border)" }}
                          >
                            {o.emoji && (
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl" style={{ background: active ? "var(--primary-soft)" : "var(--bg-tint)" }}>
                                {o.emoji}
                              </span>
                            )}
                            <span className="font-medium text-ink">{o.label}</span>
                            <span className="ml-auto">
                              {active ? (
                                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-white"><Check size={14} /></span>
                              ) : (
                                <ArrowRight size={16} className="text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
                              )}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </>
                )}

                {current.kind === "role" && (
                  <>
                    <h1 className="font-serif text-3xl font-semibold text-ink sm:text-[2.4rem] sm:leading-[1.1]">{current.q}</h1>
                    {current.sub && <p className="mt-3 text-ink-2">{current.sub}</p>}
                    <div className="relative mt-8">
                      <div className="relative">
                        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
                        <input
                          autoFocus
                          value={query}
                          onChange={(e) => { setQuery(e.target.value); setRole(e.target.value); }}
                          onKeyDown={(e) => { if (e.key === "Enter" && (role.trim() || query.trim())) go(step + 1); }}
                          placeholder="e.g., Office Manager, Registered Nurse…"
                          className="field !pl-11 !py-4 text-lg"
                        />
                      </div>
                      {suggestions.length > 0 && (
                        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-lg" style={{ borderColor: "var(--border)" }}>
                          {suggestions.map((s) => (
                            <button key={s} onClick={() => { setRole(s); setQuery(s); setTimeout(() => go(step + 1), 120); }} className="block w-full px-4 py-3 text-left text-ink-2 transition-colors hover:bg-bg-tint hover:text-ink">
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-8 flex items-center gap-3">
                      <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0}><ArrowLeft size={16} /> Back</Button>
                      <Button onClick={() => go(step + 1)} disabled={!role.trim() && !query.trim()}>Continue <ArrowRight size={16} /></Button>
                    </div>
                  </>
                )}

                {current.kind === "validation" && (
                  <div className="text-center sm:text-left">
                    <span className="eyebrow">{current.eyebrow}</span>
                    <div className="mt-5 font-serif text-7xl font-semibold leading-none text-primary-ink">
                      <AnimatedNumber value={current.value} duration={1300} startOnView={false} />
                      <span className="text-4xl">{current.suffix}</span>
                    </div>
                    <h1 className="mt-5 text-balance font-serif text-2xl font-semibold text-ink sm:text-3xl">{current.headline}</h1>
                    <p className="mt-3 text-ink-2">{current.body}</p>
                    <p className="mt-4 text-xs text-ink-3">{current.source}</p>
                    <div className="mt-8 flex items-center justify-center gap-3 sm:justify-start">
                      <Button variant="ghost" onClick={() => go(step - 1)}><ArrowLeft size={16} /> Back</Button>
                      <Button onClick={() => go(step + 1)}>
                        {step + 1 >= total ? "Start practicing" : "Continue"} <ArrowRight size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ============ RIGHT ============ */}
      <ConversionPanel demo={current.demo} role={role || query} />
    </main>
  );
}

const PANEL_HEAD: Record<Demo, React.ReactNode> = {
  convo: <>This is what your practice looks like.</>,
  questions: <>We build your questions around you.</>,
  progress: <>Then watch your readiness climb.</>,
};

function ConversionPanel({ demo, role }: { demo: Demo; role: string }) {
  return (
    <aside className="relative hidden overflow-hidden lg:block" style={{ background: "linear-gradient(160deg, #19a9b8 0%, #14808e 50%, #0c5660 120%)" }}>
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, #ffffff66, transparent)" }} />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, #ffe0a655, transparent)" }} />
      <div className="sticky top-0 flex min-h-screen flex-col justify-center px-12 py-16 text-white xl:px-16">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} className="fill-white text-white" />)}
          <span className="ml-2 text-sm font-medium text-white/85">Loved by 12,000+ job seekers</span>
        </div>
        <div className="mt-6 min-h-[3.5rem]">
          <AnimatePresence mode="wait">
            <motion.h2 key={demo} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }} className="max-w-md font-serif text-[2.1rem] font-semibold leading-tight">
              {demo === "questions" && role ? <>We build your <span className="text-amber-soft">{role}</span> questions.</> : PANEL_HEAD[demo]}
            </motion.h2>
          </AnimatePresence>
        </div>
        <div className="mt-10">
          <AnimatePresence mode="wait">
            <motion.div key={demo} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
              {demo === "convo" && <OnboardingShowcase />}
              {demo === "questions" && <ShowcaseQuestions role={role} />}
              {demo === "progress" && <ShowcaseProgress />}
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="mt-12 flex items-center gap-2 text-sm text-white/75">
          <ShieldCheck size={16} /> Private by design. No card to start.
        </p>
      </div>
    </aside>
  );
}
