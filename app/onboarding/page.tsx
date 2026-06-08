"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Search, Star, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { OnboardingShowcase, ShowcaseQuestions, ShowcaseProgress } from "@/components/onboarding/Showcase";
import { ROLES } from "@/lib/roles";
import { SITUATION_META } from "@/lib/utils";
import { setOnboarding, setProfile } from "@/lib/store";
import { track } from "@/lib/analytics";
import type { InterviewGap, Situation } from "@/lib/types";

const SITUATIONS: Situation[] = ["returning", "laid_off", "promotion", "career_change"];
const GAPS: { value: InterviewGap; label: string }[] = [
  { value: "<1yr", label: "Less than 1 year" },
  { value: "1-3yr", label: "1-3 years" },
  { value: "3-5yr", label: "3-5 years" },
  { value: "5+yr", label: "5+ years" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [situation, setSituation] = useState<Situation | null>(null);
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [gap, setGap] = useState<InterviewGap | null>(null);

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const suggestions = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return ROLES.filter((r) => r.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const finish = (selectedGap: InterviewGap) => {
    const finalRole = role.trim() || query.trim() || "Office Manager";
    setOnboarding({ situation, targetRole: finalRole, interviewGap: selectedGap });
    setProfile({ situation, targetRole: finalRole, interviewGap: selectedGap });
    track("onboarding_complete", { situation, role: finalRole, gap: selectedGap });
    router.push("/practice?autostart=1");
  };

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 48 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -48 }),
  };

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      {/* ============ LEFT: the questions ============ */}
      <div className="relative flex min-h-screen flex-col">
        {/* top bar */}
        <div className="flex items-center justify-between px-6 py-6 sm:px-10">
          <Logo />
          <span className="text-sm text-ink-2">
            Have an account?{" "}
            <Link href="/signin?next=/practice" className="font-semibold text-primary-ink hover:underline">
              Sign in
            </Link>
          </span>
        </div>

        {/* progress + picks */}
        <div className="px-6 sm:px-10">
          <div className="mx-auto flex max-w-md items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={false}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: "linear-gradient(90deg, var(--primary), var(--primary-bright))" }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait" custom={dir}>
              {/* STEP 1 */}
              {step === 0 && (
                <motion.div key="s1" custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
                  <span className="text-2xs font-semibold uppercase tracking-[0.18em] text-primary-ink">Step 1 of 3</span>
                  <h1 className="mt-3 font-serif text-3xl font-semibold text-ink sm:text-[2.5rem] sm:leading-[1.1]">
                    What brings you here?
                  </h1>
                  <p className="mt-3 text-ink-2">We tailor every question to your exact situation.</p>
                  <div className="mt-8 grid gap-3">
                    {SITUATIONS.map((s, i) => {
                      const meta = SITUATION_META[s];
                      const active = situation === s;
                      return (
                        <motion.button
                          key={s}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 + i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            setSituation(s);
                            track("onboarding_situation", { situation: s });
                            setTimeout(() => go(1), 220);
                          }}
                          className="group flex items-center gap-4 rounded-xl border-2 bg-surface p-4 text-left shadow-sm transition-shadow hover:shadow-lg"
                          style={{ borderColor: active ? "var(--primary)" : "var(--border)" }}
                        >
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl" style={{ background: active ? "var(--primary-soft)" : "var(--bg-tint)" }}>
                            {meta.emoji}
                          </span>
                          <span className="font-medium text-ink">{meta.label}</span>
                          <span className="ml-auto">
                            {active ? (
                              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-white"><Check size={14} /></span>
                            ) : (
                              <ArrowRight size={18} className="text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
                            )}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* STEP 2 */}
              {step === 1 && (
                <motion.div key="s2" custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
                  <span className="text-2xs font-semibold uppercase tracking-[0.18em] text-primary-ink">Step 2 of 3</span>
                  <h1 className="mt-3 font-serif text-3xl font-semibold text-ink sm:text-[2.5rem] sm:leading-[1.1]">
                    What job are you preparing for?
                  </h1>
                  <p className="mt-3 text-ink-2">Type any role. The AI adapts to anything you enter.</p>
                  <div className="relative mt-8">
                    <div className="relative">
                      <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
                      <input
                        autoFocus
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setRole(e.target.value); }}
                        onKeyDown={(e) => { if (e.key === "Enter" && (role.trim() || query.trim())) go(2); }}
                        placeholder="e.g., Office Manager, Registered Nurse…"
                        className="field !pl-11 !py-4 text-lg"
                      />
                    </div>
                    {suggestions.length > 0 && (
                      <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-lg" style={{ borderColor: "var(--border)" }}>
                        {suggestions.map((s) => (
                          <button key={s} onClick={() => { setRole(s); setQuery(s); setTimeout(() => go(2), 120); }} className="block w-full px-4 py-3 text-left text-ink-2 transition-colors hover:bg-bg-tint hover:text-ink">
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-8 flex items-center gap-3">
                    <Button variant="ghost" onClick={() => go(0)}><ArrowLeft size={16} /> Back</Button>
                    <Button onClick={() => go(2)} disabled={!role.trim() && !query.trim()}>Continue <ArrowRight size={16} /></Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 */}
              {step === 2 && (
                <motion.div key="s3" custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
                  <span className="text-2xs font-semibold uppercase tracking-[0.18em] text-primary-ink">Step 3 of 3</span>
                  <h1 className="mt-3 font-serif text-3xl font-semibold text-ink sm:text-[2.5rem] sm:leading-[1.1]">
                    When did you last interview?
                  </h1>
                  <p className="mt-3 text-ink-2">This calibrates how gently we ease you in.</p>
                  <div className="mt-8 grid gap-3">
                    {GAPS.map((g) => (
                      <button
                        key={g.value}
                        onClick={() => { setGap(g.value); finish(g.value); }}
                        className="rounded-xl border-2 bg-surface px-6 py-4 text-center font-medium text-ink shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
                        style={{ borderColor: gap === g.value ? "var(--primary)" : "var(--border)" }}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-8">
                    <Button variant="ghost" onClick={() => go(1)}><ArrowLeft size={16} /> Back</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ============ RIGHT: conversion panel ============ */}
      <ConversionPanel step={step} role={role || query} />
    </main>
  );
}

/* Proof column with a live, looping demo that changes per step. Sticky,
   full-bleed gradient, glass cards. Hidden on mobile. */
const PANEL_COPY = [
  { h: <>This is what your practice looks like.</>, demo: "convo" },
  { h: <>We build the questions around you.</>, demo: "questions" },
  { h: <>Then watch your score climb.</>, demo: "progress" },
] as const;

function ConversionPanel({ step, role }: { step: number; role: string }) {
  const copy = PANEL_COPY[Math.min(step, 2)];
  return (
    <aside
      className="relative hidden overflow-hidden lg:block"
      style={{ background: "linear-gradient(160deg, #19a9b8 0%, #14808e 50%, #0c5660 120%)" }}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, #ffffff66, transparent)" }} />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, #ffe0a655, transparent)" }} />

      <div className="sticky top-0 flex min-h-screen flex-col justify-center px-12 py-16 text-white xl:px-16">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} className="fill-white text-white" />)}
          <span className="ml-2 text-sm font-medium text-white/85">Loved by 12,000+ job seekers</span>
        </div>

        <div className="mt-6 min-h-[3.5rem]">
          <AnimatePresence mode="wait">
            <motion.h2
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="max-w-md font-serif text-[2.1rem] font-semibold leading-tight"
            >
              {step === 1 && role ? <>We build your <span className="text-amber-soft">{role}</span> questions.</> : copy.h}
            </motion.h2>
          </AnimatePresence>
        </div>

        {/* live demo, swaps per step */}
        <div className="mt-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={copy.demo}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {copy.demo === "convo" && <OnboardingShowcase />}
              {copy.demo === "questions" && <ShowcaseQuestions role={role} />}
              {copy.demo === "progress" && <ShowcaseProgress />}
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
