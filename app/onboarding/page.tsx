"use client";

import { useEffect, useMemo, useState } from "react";
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
import { identify, setContext, track } from "@/lib/analytics";
import type { InterviewGap, Situation } from "@/lib/types";

/* Short by design. Web apps don't run long quiz onboardings — that's a mobile
   growth tactic. Three customization questions (what job, why now, what to aim
   at), one validation page, then account creation. Signup comes AFTER so people
   invest three answers and see something built for them before we ask. */

type Demo = "convo" | "skills" | "progress" | "questions" | "delivery";
type Opt = { value: string; label: string; emoji?: string };
type Field = { key: string; q: string; type?: "role"; options?: Opt[] };
type Screen =
  | { kind: "form"; fields: Field[]; demo: Demo }
  | { kind: "validation"; demo: Demo };

const SITUATIONS: Situation[] = ["returning", "laid_off", "promotion", "career_change"];

const SCREENS: Screen[] = [
  // 1) What job — the anchor. Everything personalizes off this.
  {
    kind: "form", demo: "questions",
    fields: [{ key: "role", type: "role", q: "What role are you preparing for?" }],
  },
  // 2) Why now — sets the tone and the kinds of questions we ask.
  {
    kind: "form", demo: "skills",
    fields: [{
      key: "situation",
      q: "What brings you here?",
      options: SITUATIONS.map((s) => ({ value: s, label: SITUATION_META[s].short, emoji: SITUATION_META[s].emoji })),
    }],
  },
  // 3) What to aim the practice at — the customization they feel.
  {
    kind: "form", demo: "skills",
    fields: [{
      key: "weakness",
      q: "Where do you lose the most points?",
      options: [
        { value: "nerves", label: "Nerves take over", emoji: "😰" },
        { value: "blank", label: "Mind goes blank", emoji: "🫥" },
        { value: "ramble", label: "I ramble", emoji: "🗣️" },
        { value: "hard_q", label: "The hard questions", emoji: "🧠" },
        { value: "selling", label: "Selling myself", emoji: "🙈" },
        { value: "gap", label: "Explaining my gap", emoji: "🕳️" },
        { value: "filler", label: "Filler words", emoji: "😬" },
      ],
    }],
  },
  // The one validation page: reflect the setup back, then create the account.
  { kind: "validation", demo: "progress" },
];

const WEAKNESS_LINE: Record<string, string> = {
  nerves: "calming the nerves so your prep actually shows up",
  blank: "keeping your mind from going blank under pressure",
  ramble: "tightening your answers so every one lands the point",
  hard_q: "handling the hard questions without freezing",
  selling: "selling yourself without it feeling awkward",
  gap: "framing your gap so it reads as a strength",
  filler: "cutting the filler so you sound sure",
};

function buildValidation(a: Record<string, string>, role: string) {
  const r = (role || "").trim();
  const weak = WEAKNESS_LINE[a.weakness];
  return {
    value: 93,
    suffix: "%",
    headline: "93% of people feel interview anxiety. The ones who beat it rehearsed first.",
    body: `Your practice is tuned to ${r || "your interview"}${weak ? `, aimed at ${weak}` : ""}. Create your account and run your first session.`,
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [screen, setScreen] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [roleFocused, setRoleFocused] = useState(false);

  const total = SCREENS.length;
  const cur = SCREENS[Math.min(screen, total - 1)];

  useEffect(() => {
    if (!cur) return;
    track("onboarding:step_view", { step: screen + 1, total, kind: cur.kind });
  }, [screen, total, cur]);

  const go = (next: number) => {
    if (next >= total) return finish();
    setDir(next > screen ? 1 : -1);
    setScreen(Math.max(0, next));
  };

  // Chip-select screens auto-advance on tap; the role screen (typed) uses Continue.
  const selectOption = (key: string, value: string) => {
    const na = { ...answers, [key]: value };
    setAnswers(na);
    track("onboarding:answer", { key, value, step: screen + 1 });
    if (key === "situation") track("onboarding_situation", { situation: value });
    window.setTimeout(() => go(screen + 1), 380);
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
    const gap = "1-3yr" as InterviewGap;
    const finalRole = role.trim() || query.trim() || "Office Manager";
    setOnboarding({ situation, targetRole: finalRole, company: "", interviewGap: gap });
    setProfile({ situation, targetRole: finalRole, company: "", interviewGap: gap });
    const answerProps = Object.fromEntries(
      Object.entries({ ...answers, role: finalRole }).map(([k, v]) => [`ob_${k}`, v])
    );
    setContext(answerProps);
    track("onboarding_complete", { situation, role: finalRole, ...answerProps });
    // Flow: three questions -> validation -> create account -> payment -> app.
    router.push("/signin?mode=signup&next=%2Fupgrade");
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
            <Link href="/signin?next=/dashboard" className="font-semibold text-primary-ink hover:underline">Sign in</Link>
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
                                onChange={(e) => { setQuery(e.target.value); setRole(e.target.value); setRoleFocused(true); }}
                                onFocus={() => setRoleFocused(true)}
                                onBlur={() => window.setTimeout(() => setRoleFocused(false), 150)}
                                placeholder="e.g., Office Manager, Registered Nurse…"
                                className="field !pl-10 !py-3"
                              />
                            </div>
                            {roleFocused && suggestions.length > 0 && (
                              <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-lg" style={{ borderColor: "var(--border)" }}>
                                {suggestions.map((s) => (
                                  <button key={s} onClick={() => { setRole(s); setQuery(s); setRoleFocused(false); }} className="block w-full px-4 py-2.5 text-left text-sm text-ink-2 transition-colors hover:bg-bg-tint hover:text-ink">{s}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {f.options!.map((o) => {
                              const on = answers[f.key] === o.value;
                              return (
                                <button
                                  key={o.value}
                                  onClick={() => selectOption(f.key, o.value)}
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
                  const v = buildValidation(answers, role || query);
                  return (
                    <div className="text-center sm:text-left">
                      <div className="font-serif text-8xl font-semibold leading-none text-primary-ink">
                        <AnimatedNumber value={v.value} duration={1400} startOnView={false} />
                        <span className="text-4xl">{v.suffix}</span>
                      </div>
                      <h1 className="mt-6 text-balance font-serif text-2xl font-semibold text-ink sm:text-3xl">{v.headline}</h1>
                      <p className="mt-4 max-w-md text-ink-2">{v.body}</p>
                      <div className="mt-9 flex items-center justify-center gap-3 sm:justify-start">
                        <Button variant="ghost" size="sm" onClick={() => go(screen - 1)}><ArrowLeft size={15} /> Back</Button>
                        <Button size="sm" onClick={() => go(screen + 1)}>Create my account <ArrowRight size={15} /></Button>
                      </div>
                      <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-3">
                        <ShieldCheck size={13} /> Private by design. Cancel anytime.
                      </p>
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
        <p className="mt-12 flex items-center gap-2 text-sm text-white/75"><ShieldCheck size={16} /> Private by design. Cancel anytime.</p>
      </div>
    </aside>
  );
}
