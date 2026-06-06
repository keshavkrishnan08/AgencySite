"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Lock, Search } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { ROLES } from "@/lib/roles";
import { SITUATION_META } from "@/lib/utils";
import { setOnboarding, setProfile } from "@/lib/store";
import type { InterviewGap, Situation } from "@/lib/types";

const SITUATIONS: Situation[] = ["returning", "laid_off", "promotion", "career_change"];
const GAPS: { value: InterviewGap; label: string }[] = [
  { value: "<1yr", label: "Less than 1 year" },
  { value: "1-3yr", label: "1–3 years" },
  { value: "3-5yr", label: "3–5 years" },
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
    router.push("/practice?autostart=1");
  };

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 48 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -48 }),
  };

  return (
    <main className="relative flex min-h-screen flex-col">
      {/* top bar */}
      <div className="container-wide flex items-center justify-between py-6">
        <Logo />
        <span className="chip">
          <Lock size={13} /> No account needed
        </span>
      </div>

      {/* progress */}
      <div className="container-content">
        <div className="mx-auto flex max-w-xs items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 flex-1 overflow-hidden rounded-full"
              style={{ background: "var(--bg-tint)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: i <= step ? "100%" : "0%",
                  background: "linear-gradient(90deg, var(--primary), var(--primary-bright))",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="container-content flex flex-1 items-center justify-center py-10">
        <div className="w-full">
          <AnimatePresence mode="wait" custom={dir}>
            {/* STEP 1 */}
            {step === 0 && (
              <motion.div
                key="s1"
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1 className="text-center font-serif text-3xl font-semibold text-ink sm:text-4xl">
                  What brings you to PrepPath?
                </h1>
                <p className="mt-3 text-center text-ink-2">
                  We&apos;ll tailor every question to your exact situation.
                </p>
                <div className="mt-9 grid gap-3.5 sm:grid-cols-2">
                  {SITUATIONS.map((s) => {
                    const meta = SITUATION_META[s];
                    const active = situation === s;
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          setSituation(s);
                          setTimeout(() => go(1), 180);
                        }}
                        className="group flex items-center gap-4 rounded-xl border-2 bg-surface p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                        style={{ borderColor: active ? "var(--primary)" : "var(--border)" }}
                      >
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-bg-tint text-2xl transition-colors group-hover:bg-primary-soft">
                          {meta.emoji}
                        </span>
                        <span className="font-medium text-ink">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 2 */}
            {step === 1 && (
              <motion.div
                key="s2"
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1 className="text-center font-serif text-3xl font-semibold text-ink sm:text-4xl">
                  What job are you preparing for?
                </h1>
                <p className="mt-3 text-center text-ink-2">
                  Type any role — our AI adapts to anything you enter.
                </p>
                <div className="relative mx-auto mt-9 max-w-md">
                  <div className="relative">
                    <Search
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3"
                    />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setRole(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (role.trim() || query.trim())) go(2);
                      }}
                      placeholder="e.g., Office Manager, Registered Nurse…"
                      className="field !pl-11 !py-4 text-lg"
                    />
                  </div>
                  {suggestions.length > 0 && (
                    <div
                      className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-lg"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setRole(s);
                            setQuery(s);
                            setTimeout(() => go(2), 120);
                          }}
                          className="block w-full px-4 py-3 text-left text-ink-2 transition-colors hover:bg-bg-tint hover:text-ink"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-center text-sm text-ink-3">
                    Don&apos;t see your role? Just type it — our AI adapts to any position.
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-center gap-3">
                  <Button variant="ghost" onClick={() => go(0)}>
                    <ArrowLeft size={16} /> Back
                  </Button>
                  <Button onClick={() => go(2)} disabled={!role.trim() && !query.trim()}>
                    Continue <ArrowRight size={16} />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 */}
            {step === 2 && (
              <motion.div
                key="s3"
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1 className="text-center font-serif text-3xl font-semibold text-ink sm:text-4xl">
                  When did you last interview?
                </h1>
                <p className="mt-3 text-center text-ink-2">
                  This helps us calibrate how much to ease you in.
                </p>
                <div className="mx-auto mt-9 grid max-w-md gap-3">
                  {GAPS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => {
                        setGap(g.value);
                        finish(g.value);
                      }}
                      className="rounded-full border-2 bg-surface px-6 py-4 text-center font-medium text-ink shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
                      style={{ borderColor: gap === g.value ? "var(--primary)" : "var(--border)" }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex items-center justify-center">
                  <Button variant="ghost" onClick={() => go(1)}>
                    <ArrowLeft size={16} /> Back
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
