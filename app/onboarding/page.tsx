"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Search, Star, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import {
  OnboardingShowcase,
  ShowcaseQuestions,
  ShowcaseProgress,
  ShowcaseSkills,
  ShowcaseDelivery,
} from "@/components/onboarding/Showcase";
import { ROLES } from "@/lib/roles";
import { SITUATION_META } from "@/lib/utils";
import { setOnboarding, setProfile } from "@/lib/store";
import { track } from "@/lib/analytics";
import type { InterviewGap, Situation } from "@/lib/types";

type Demo = "convo" | "skills" | "progress" | "questions" | "delivery";
type Opt = { value: string; label: string; emoji?: string };
type Field = { key: string; q: string; type?: "role"; options?: Opt[] };
type Screen =
  | { kind: "form"; fields: Field[]; demo: Demo }
  | { kind: "validation"; slot: 1 | 2; demo: Demo };

const SITUATIONS: Situation[] = ["returning", "laid_off", "promotion", "career_change"];

const SCREENS: Screen[] = [
  {
    kind: "form",
    demo: "convo",
    fields: [
      {
        key: "confidence",
        q: "How do you feel about interviewing right now?",
        options: [
          { value: "terrified", label: "Honestly terrified", emoji: "😱" },
          { value: "rusty", label: "Pretty rusty", emoji: "😬" },
          { value: "shaky", label: "A little shaky", emoji: "😟" },
          { value: "out_of_practice", label: "Out of practice", emoji: "🕰️" },
          { value: "okay", label: "I do okay", emoji: "🙂" },
          { value: "confident", label: "Fairly confident", emoji: "😎" },
        ],
      },
      {
        key: "struggle",
        q: "What trips you up the most?",
        options: [
          { value: "nerves", label: "Nerves", emoji: "😰" },
          { value: "blank", label: "My mind blanks", emoji: "🫥" },
          { value: "ramble", label: "I ramble", emoji: "🗣️" },
          { value: "hard_q", label: "Hard questions", emoji: "🧠" },
          { value: "selling", label: "Selling myself", emoji: "🙈" },
          { value: "gap", label: "Explaining my gap", emoji: "🕳️" },
          { value: "salary", label: "Salary talk", emoji: "💸" },
        ],
      },
    ],
  },
  {
    kind: "form",
    demo: "skills",
    fields: [
      {
        key: "industry",
        q: "What field are you in?",
        options: [
          { value: "healthcare", label: "Healthcare", emoji: "🩺" },
          { value: "education", label: "Education", emoji: "🎓" },
          { value: "finance", label: "Finance", emoji: "💼" },
          { value: "tech", label: "Technology", emoji: "💻" },
          { value: "operations", label: "Operations", emoji: "⚙️" },
          { value: "sales", label: "Sales & Marketing", emoji: "📈" },
          { value: "retail", label: "Retail & Service", emoji: "🛍️" },
          { value: "hospitality", label: "Hospitality", emoji: "🍽️" },
          { value: "manufacturing", label: "Manufacturing", emoji: "🏭" },
          { value: "logistics", label: "Logistics", emoji: "🚚" },
          { value: "legal", label: "Legal", emoji: "⚖️" },
          { value: "creative", label: "Creative & Design", emoji: "🎨" },
          { value: "support", label: "Customer Support", emoji: "🎧" },
          { value: "nonprofit", label: "Nonprofit & Gov", emoji: "🏛️" },
          { value: "trades", label: "Skilled trades", emoji: "🔧" },
          { value: "other", label: "Something else", emoji: "✨" },
        ],
      },
      {
        key: "situation",
        q: "What brings you here?",
        options: SITUATIONS.map((s) => ({ value: s, label: SITUATION_META[s].short, emoji: SITUATION_META[s].emoji })),
      },
    ],
  },
  { kind: "validation", slot: 1, demo: "progress" },
  {
    kind: "form",
    demo: "questions",
    fields: [
      { key: "role", type: "role", q: "What job are you preparing for?" },
      {
        key: "gap",
        q: "When did you last interview?",
        options: [
          { value: "<1yr", label: "< 1 year" },
          { value: "1-3yr", label: "1–3 years" },
          { value: "3-5yr", label: "3–5 years" },
          { value: "5+yr", label: "5+ years" },
        ],
      },
    ],
  },
  { kind: "validation", slot: 2, demo: "delivery" },
];

/* ---- modular validation: the stat is built from prior selections ---- */
const INDUSTRY = {
  healthcare: { label: "healthcare", apps: 250 },
  education: { label: "education", apps: 300 },
  finance: { label: "finance", apps: 420 },
  tech: { label: "tech", apps: 480 },
  operations: { label: "operations", apps: 340 },
  sales: { label: "sales and marketing", apps: 360 },
  retail: { label: "retail and service", apps: 280 },
  hospitality: { label: "hospitality", apps: 210 },
  manufacturing: { label: "manufacturing", apps: 230 },
  logistics: { label: "logistics", apps: 240 },
  legal: { label: "legal", apps: 300 },
  creative: { label: "creative and design", apps: 520 },
  support: { label: "customer support", apps: 410 },
  nonprofit: { label: "the public and nonprofit sector", apps: 390 },
  trades: { label: "the skilled trades", apps: 180 },
  other: { label: "your field", apps: 340 },
} as const;
const SIT = {
  returning: { harder: 52, line: "After time away, the gap can feel like the whole story. It isn't. How you frame it is everything, and that's exactly what you'll rehearse." },
  laid_off: { harder: 48, line: "A layoff says nothing about your worth. The story you tell about it does, and you can make it land with confidence." },
  promotion: { harder: 38, line: "Stepping up means proving you already operate a level above. We'll get your examples sharp and specific." },
  career_change: { harder: 57, line: "Switching fields means connecting the dots for them. We'll make your story land in one clean line." },
} as const;
const CONF_NOTE: Record<string, string> = {
  terrified: "And being scared is normal. Most people haven't done this in years.",
  rusty: "And feeling rusty is the norm, not the exception.",
  shaky: "A little nervous is completely normal.",
  out_of_practice: "Out of practice just means out of reps, and reps are fixable fast.",
  okay: "",
  confident: "",
};

function buildValidation(slot: 1 | 2, a: Record<string, string>, role: string) {
  const ind = INDUSTRY[(a.industry as keyof typeof INDUSTRY)] || INDUSTRY.other;
  if (slot === 1) {
    const sit = SIT[(a.situation as keyof typeof SIT)] || SIT.returning;
    const note = CONF_NOTE[a.confidence] || "";
    return {
      eyebrow: "You're not imagining it",
      value: sit.harder,
      suffix: "%",
      headline: `Getting hired is about ${sit.harder}% harder than two years ago.`,
      body: `${sit.line}${note ? ` ${note}` : ""}`,
      source: `Based on 2025 ${ind.label} hiring data`,
    };
  }
  const gapLine =
    a.gap === "5+yr" ? "After 5+ years away, the people who rehearse first are the ones who stand out."
    : a.gap === "3-5yr" ? "After a few years out, a little rehearsal puts you right back in the room."
    : a.gap === "<1yr" ? "Even recent interviewers freeze. Rehearsal is what keeps you sharp."
    : "The candidates who rehearse are the ones who get the call.";
  return {
    eyebrow: "Why practice wins",
    value: ind.apps,
    suffix: " per job",
    headline: `In ${ind.label}, the average opening draws about ${ind.apps} applicants.`,
    body: `Only about 2% get an interview${role ? ` for a role like ${role}` : ""}. ${gapLine} Practice is how you get into that 2%.`,
    source: "Industry hiring benchmarks, 2025",
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [screen, setScreen] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");

  const total = SCREENS.length;
  const cur = SCREENS[screen];

  const go = (next: number) => {
    if (next >= total) return finish();
    setDir(next > screen ? 1 : -1);
    setScreen(Math.max(0, next));
  };

  const pick = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    if (key === "situation") track("onboarding_situation", { situation: value });
  };

  const suggestions = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return ROLES.filter((r) => r.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const screenReady = (s: Screen) => {
    if (s.kind !== "form") return true;
    return s.fields.every((f) => (f.type === "role" ? Boolean(role.trim() || query.trim()) : Boolean(answers[f.key])));
  };

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
    enter: (d: number) => ({ opacity: 0, x: d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -40 }),
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

        <div className="px-6 sm:px-10">
          <div className="mx-auto flex max-w-md items-center gap-1.5">
            {SCREENS.map((_, i) => (
              <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
                <motion.div className="h-full rounded-full" initial={false} animate={{ width: i <= screen ? "100%" : "0%" }} transition={{ duration: 0.45 }} style={{ background: "linear-gradient(90deg, var(--primary), var(--primary-bright))" }} />
              </div>
            ))}
          </div>
          <p className="mx-auto mt-2 max-w-md text-center text-2xs font-medium uppercase tracking-wider text-ink-3">Step {screen + 1} of {total}</p>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={screen} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                {cur.kind === "form" && (
                  <div className="space-y-8">
                    {cur.fields.map((f) => (
                      <div key={f.key}>
                        <h2 className="font-serif text-xl font-semibold text-ink sm:text-2xl">{f.q}</h2>
                        {f.type === "role" ? (
                          <div className="relative mt-4">
                            <div className="relative">
                              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                              <input
                                autoFocus
                                value={query}
                                onChange={(e) => { setQuery(e.target.value); setRole(e.target.value); }}
                                placeholder="e.g., Office Manager, Registered Nurse…"
                                className="field !pl-10 !py-3"
                              />
                            </div>
                            {suggestions.length > 0 && (
                              <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-lg" style={{ borderColor: "var(--border)" }}>
                                {suggestions.map((s) => (
                                  <button key={s} onClick={() => { setRole(s); setQuery(s); }} className="block w-full px-4 py-2.5 text-left text-sm text-ink-2 transition-colors hover:bg-bg-tint hover:text-ink">{s}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {f.options!.map((o) => {
                              const active = answers[f.key] === o.value;
                              return (
                                <button
                                  key={o.value}
                                  onClick={() => pick(f.key, o.value)}
                                  className="rounded-full border px-4 py-2 text-sm font-medium transition-all"
                                  style={{
                                    borderColor: active ? "var(--primary)" : "var(--border-strong)",
                                    background: active ? "var(--primary-soft)" : "var(--surface)",
                                    color: active ? "var(--primary-ink)" : "var(--ink-2)",
                                  }}
                                >
                                  {o.emoji ? `${o.emoji} ` : ""}{o.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-3 pt-1">
                      {screen > 0 && <Button variant="ghost" size="sm" onClick={() => go(screen - 1)}><ArrowLeft size={15} /> Back</Button>}
                      <Button size="sm" onClick={() => go(screen + 1)} disabled={!screenReady(cur)}>Continue <ArrowRight size={15} /></Button>
                    </div>
                  </div>
                )}

                {cur.kind === "validation" && (() => {
                  const v = buildValidation(cur.slot, answers, role || query);
                  return (
                    <div className="text-center sm:text-left">
                      <span className="eyebrow">{v.eyebrow}</span>
                      <div className="mt-5 font-serif text-7xl font-semibold leading-none text-primary-ink">
                        <AnimatedNumber value={v.value} duration={1400} startOnView={false} />
                        <span className="text-4xl">{v.suffix}</span>
                      </div>
                      <h1 className="mt-5 text-balance font-serif text-2xl font-semibold text-ink sm:text-3xl">{v.headline}</h1>
                      <p className="mt-3 text-ink-2">{v.body}</p>
                      <p className="mt-4 text-xs text-ink-3">{v.source}</p>
                      <div className="mt-8 flex items-center justify-center gap-3 sm:justify-start">
                        <Button variant="ghost" size="sm" onClick={() => go(screen - 1)}><ArrowLeft size={15} /> Back</Button>
                        <Button size="sm" onClick={() => go(screen + 1)}>{screen + 1 >= total ? "Start practicing" : "Keep going"} <ArrowRight size={15} /></Button>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ============ RIGHT ============ */}
      <ConversionPanel demo={cur.demo} role={role || query} />
    </main>
  );
}

const PANEL_HEAD: Record<Demo, React.ReactNode> = {
  convo: <>This is what your practice looks like.</>,
  skills: <>Scored on five real dimensions.</>,
  progress: <>Watch your readiness climb.</>,
  questions: <>We build your questions around you.</>,
  delivery: <>We coach how you sound, too.</>,
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
              {demo === "skills" && <ShowcaseSkills />}
              {demo === "progress" && <ShowcaseProgress />}
              {demo === "questions" && <ShowcaseQuestions role={role} />}
              {demo === "delivery" && <ShowcaseDelivery />}
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="mt-12 flex items-center gap-2 text-sm text-white/75"><ShieldCheck size={16} /> Private by design. No card to start.</p>
      </div>
    </aside>
  );
}
