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
import { track } from "@/lib/analytics";
import { CADENCE_META, projectPlan, type Cadence, type SkillLevel } from "@/lib/plan-projection";
import { computeRoi } from "@/lib/roi";
import { PLANS } from "@/lib/pricing";
import type { InterviewGap, Situation } from "@/lib/types";

type Demo = "convo" | "skills" | "progress" | "questions" | "delivery";
type Opt = { value: string; label: string; emoji?: string };
type Field = { key: string; q: string; type?: "role" | "text"; optional?: boolean; options?: Opt[] };
type Cond = (a: Record<string, string>) => boolean;
type Screen =
  | { kind: "form"; fields: Field[]; demo: Demo; when?: Cond }
  | { kind: "validation"; slot: 1 | 2; demo: Demo; when?: Cond }
  | { kind: "compare"; demo: Demo; when?: Cond }
  | { kind: "plan"; demo: Demo; when?: Cond }
  | { kind: "roi"; demo: Demo; when?: Cond };

const SITUATIONS: Situation[] = ["returning", "laid_off", "promotion", "career_change"];

const SCREENS: Screen[] = [
  // ── One question per screen. A tap advances you, top-app style. Each screen
  //    carries a single decision, so nothing feels like a form. ──
  {
    kind: "form",
    demo: "convo",
    fields: [{
      key: "confidence",
      q: "How are you feeling about interviewing right now?",
      options: [
        { value: "terrified", label: "Honestly terrified", emoji: "😱" },
        { value: "rusty", label: "Pretty rusty", emoji: "😬" },
        { value: "shaky", label: "A little shaky", emoji: "😟" },
        { value: "out_of_practice", label: "Out of practice", emoji: "🕰️" },
        { value: "okay", label: "I do okay", emoji: "🙂" },
        { value: "confident", label: "Fairly confident", emoji: "😎" },
      ],
    }],
  },
  {
    kind: "form",
    demo: "convo",
    fields: [{
      key: "struggle",
      q: "What trips you up the most?",
      options: [
        { value: "nerves", label: "Nerves take over", emoji: "😰" },
        { value: "blank", label: "My mind goes blank", emoji: "🫥" },
        { value: "ramble", label: "I ramble", emoji: "🗣️" },
        { value: "hard_q", label: "The hard questions", emoji: "🧠" },
        { value: "selling", label: "Selling myself", emoji: "🙈" },
        { value: "gap", label: "Explaining my gap", emoji: "🕳️" },
        { value: "filler", label: "Um, like, I just…", emoji: "😬" },
      ],
    }],
  },
  {
    kind: "form",
    demo: "skills",
    fields: [{
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
    }],
  },
  {
    kind: "form",
    demo: "skills",
    fields: [{
      key: "situation",
      q: "What brings you here?",
      options: SITUATIONS.map((s) => ({ value: s, label: SITUATION_META[s].short, emoji: SITUATION_META[s].emoji })),
    }],
  },
  {
    // Career changers only: where they're coming from, to frame the pivot.
    kind: "form",
    demo: "skills",
    when: (a) => a.situation === "career_change",
    fields: [{
      key: "fromField",
      q: "What field are you coming from?",
      options: [
        { value: "education", label: "Education", emoji: "🎓" },
        { value: "healthcare", label: "Healthcare", emoji: "🩺" },
        { value: "corporate", label: "Corporate", emoji: "💼" },
        { value: "service", label: "Service & retail", emoji: "🛍️" },
        { value: "trades", label: "Trades", emoji: "🔧" },
        { value: "military", label: "Military", emoji: "🎖️" },
        { value: "other", label: "Something else", emoji: "✨" },
      ],
    }],
  },
  // ── First validation: name the problem. Single stat, calm. ──
  { kind: "validation", slot: 1, demo: "convo" },
  {
    // Self-rated skill — sets the projection's starting point.
    kind: "form",
    demo: "skills",
    fields: [{
      key: "skill",
      q: "Honestly, how good are you in an interview today?",
      options: [
        { value: "novice", label: "I freeze up", emoji: "🥶" },
        { value: "rusty", label: "Rusty, it's been years", emoji: "🕰️" },
        { value: "middling", label: "Hit or miss", emoji: "🎲" },
        { value: "solid", label: "Pretty solid", emoji: "👍" },
        { value: "strong", label: "Strong, I want an edge", emoji: "🎯" },
      ],
    }],
  },
  {
    kind: "form",
    demo: "questions",
    fields: [{ key: "role", type: "role", q: "What job are you preparing for?" }],
  },
  {
    kind: "form",
    demo: "questions",
    fields: [{
      key: "gap",
      q: "When did you last interview?",
      options: [
        { value: "<1yr", label: "Within the last year", emoji: "🗓️" },
        { value: "1-3yr", label: "1–3 years ago", emoji: "⌛" },
        { value: "3-5yr", label: "3–5 years ago", emoji: "🕰️" },
        { value: "5+yr", label: "5+ years ago", emoji: "🧭" },
      ],
    }],
  },
  {
    // Cadence — the other input to the projection.
    kind: "form",
    demo: "progress",
    fields: [{
      key: "cadence",
      q: "How often can you practice?",
      options: [
        { value: "light", label: "A couple times a week", emoji: "🌱" },
        { value: "steady", label: "Most weekdays", emoji: "📈" },
        { value: "committed", label: "Almost every day", emoji: "🔥" },
        { value: "intense", label: "Twice a day, it's soon", emoji: "⚡" },
      ],
    }],
  },
  {
    kind: "form",
    demo: "progress",
    fields: [{
      key: "timeline",
      q: "When's your next interview?",
      options: [
        { value: "this_week", label: "This week", emoji: "😳" },
        { value: "two_weeks", label: "In a week or two", emoji: "📅" },
        { value: "month", label: "Within a month", emoji: "🗓️" },
        { value: "none", label: "Nothing booked yet", emoji: "🔎" },
      ],
    }],
  },
  {
    // Quality lead question: what the job pays. Feeds the ROI card and makes
    // the lead worth far more than an anonymous email.
    kind: "form",
    demo: "progress",
    fields: [{
      key: "salaryBand",
      q: "What does this role pay, roughly?",
      options: [
        { value: "u40", label: "Under $40k", emoji: "🌱" },
        { value: "40_60", label: "$40–60k", emoji: "💵" },
        { value: "60_90", label: "$60–90k", emoji: "💰" },
        { value: "90_130", label: "$90–130k", emoji: "💎" },
        { value: "130p", label: "$130k+", emoji: "🚀" },
        { value: "unsure", label: "Not sure yet", emoji: "🤷" },
      ],
    }],
  },
  {
    // Quality lead question: the stake. Why this matters to them, in their words.
    kind: "form",
    demo: "progress",
    fields: [{
      key: "stakes",
      q: "What would landing this actually change?",
      options: [
        { value: "income", label: "A real pay rise", emoji: "💰" },
        { value: "stability", label: "Stability again", emoji: "🏠" },
        { value: "out", label: "Getting out of where I am", emoji: "🚪" },
        { value: "restart", label: "Restarting my career", emoji: "🌅" },
        { value: "growth", label: "A bigger role", emoji: "📊" },
      ],
    }],
  },
  // ── Recruiter comparison: why practice beats winging it / a coach. ──
  { kind: "compare", demo: "skills" },
  // ── The plan: top 10% in a week, top 1% in a month. ──
  { kind: "plan", demo: "progress" },
  // ── The payoff: a simple animated return card. ──
  { kind: "roi", demo: "progress" },
];

/* ---- modular validation: the stat is built from prior selections ---- */
// Realistic, non-round base figures; jittered per user below so two people in
// the same field don't see the identical number.
const INDUSTRY = {
  healthcare: { label: "healthcare", apps: 214 },
  education: { label: "education", apps: 268 },
  finance: { label: "finance", apps: 372 },
  tech: { label: "tech", apps: 451 },
  operations: { label: "operations", apps: 297 },
  sales: { label: "sales and marketing", apps: 318 },
  retail: { label: "retail and service", apps: 243 },
  hospitality: { label: "hospitality", apps: 187 },
  manufacturing: { label: "manufacturing", apps: 206 },
  logistics: { label: "logistics", apps: 221 },
  legal: { label: "legal", apps: 284 },
  creative: { label: "creative and design", apps: 489 },
  support: { label: "customer support", apps: 356 },
  nonprofit: { label: "the public and nonprofit sector", apps: 341 },
  trades: { label: "the skilled trades", apps: 162 },
  other: { label: "your field", apps: 263 },
} as const;

/* Deterministic small offset from a seed, so numbers vary per user but stay
   stable across renders (SSR-safe; no Math.random). */
function seededOffset(seed: string, spread: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % (spread * 2 + 1)) - spread;
}
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
  const seed = `${a.situation || ""}|${a.industry || ""}|${a.confidence || ""}|${(role || "").toLowerCase()}`;
  if (slot === 1) {
    const sit = SIT[(a.situation as keyof typeof SIT)] || SIT.returning;
    const note = CONF_NOTE[a.confidence] || "";
    const harder = sit.harder + seededOffset(seed + "h", 4); // ±4
    return {
      eyebrow: "You're not imagining it",
      value: harder,
      suffix: "%",
      headline: `Getting hired is about ${harder}% harder than two years ago.`,
      body: `${sit.line}${note ? ` ${note}` : ""}`,
      source: `Based on 2025 ${ind.label} hiring data`,
    };
  }
  const apps = ind.apps + seededOffset(seed + "a", 19); // ±19
  const gapLine =
    a.gap === "5+yr" ? "After 5+ years away, the people who rehearse first are the ones who stand out."
    : a.gap === "3-5yr" ? "After a few years out, a little rehearsal puts you right back in the room."
    : a.gap === "<1yr" ? "Even recent interviewers freeze. Rehearsal is what keeps you sharp."
    : "The candidates who rehearse are the ones who get the call.";
  return {
    eyebrow: "Why practice wins",
    value: apps,
    suffix: " per job",
    headline: `In ${ind.label}, the average opening now draws ${apps} applicants.`,
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
  const [roleFocused, setRoleFocused] = useState(false);

  // Active screens depend on the answers, so the total step count is dynamic
  // (e.g. career changers and less-confident users get an extra tailored step).
  const active = useMemo(() => SCREENS.filter((s) => !s.when || s.when(answers)), [answers]);
  const total = active.length;
  const cur = active[Math.min(screen, total - 1)];

  // Every step view, so the drop-off point in this flow is measurable per
  // screen rather than only "started" vs "completed".
  useEffect(() => {
    if (!cur) return;
    track("onboarding:step_view", { step: screen + 1, total, kind: cur.kind });
  }, [screen, total, cur]);

  const go = (next: number) => {
    if (next >= total) return finish();
    setDir(next > screen ? 1 : -1);
    setScreen(Math.max(0, next));
  };

  const pick = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    track("onboarding:answer", { key, value, step: screen + 1 });
    if (key === "situation") track("onboarding_situation", { situation: value });
  };

  // A screen auto-advances once every field is a chip-select (no typing) and
  // all are answered — so a tap moves you forward, no hunting for "Continue".
  // Fewer taps + less perceived length lifts completion.
  const selectOption = (key: string, value: string) => {
    const na = { ...answers, [key]: value };
    setAnswers(na);
    track("onboarding:answer", { key, value, step: screen + 1 });
    if (key === "situation") track("onboarding_situation", { situation: value });
    if (
      cur.kind === "form" &&
      cur.fields.every((f) => f.options && !f.optional) &&
      cur.fields.every((f) => Boolean(na[f.key]))
    ) {
      window.setTimeout(() => go(screen + 1), 380);
    }
  };

  const suggestions = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return ROLES.filter((r) => r.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const screenReady = (s: Screen) => {
    if (s.kind !== "form") return true;
    return s.fields.every((f) =>
      f.optional ? true : f.type === "role" ? Boolean(role.trim() || query.trim()) : Boolean(answers[f.key])
    );
  };

  const finish = () => {
    const situation = (answers.situation as Situation) || null;
    const gap = (answers.gap as InterviewGap) || "1-3yr";
    const finalRole = role.trim() || query.trim() || "Office Manager";
    const company = (answers.company || "").trim();
    setOnboarding({ situation, targetRole: finalRole, company, interviewGap: gap });
    setProfile({ situation, targetRole: finalRole, company, interviewGap: gap });
    track("onboarding_complete", { situation, role: finalRole, gap, ...answers });
    // Flow: onboarding questions -> create account -> payment -> app.
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
            {active.map((_, i) => (
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
                                // Delay so a click on a suggestion still registers before the list hides.
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
                        ) : f.type === "text" ? (
                          <input
                            value={answers[f.key] || ""}
                            onChange={(e) => pick(f.key, e.target.value)}
                            placeholder="e.g., Mercy Hospital"
                            className="field mt-4 !py-3"
                          />
                        ) : (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {f.options!.map((o) => {
                              const active = answers[f.key] === o.value;
                              return (
                                <button
                                  key={o.value}
                                  onClick={() => selectOption(f.key, o.value)}
                                  className="rounded-full border px-3 py-1.5 text-[0.8rem] font-medium transition-all"
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
                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex items-center gap-3">
                        {screen > 0 && <Button variant="ghost" size="sm" onClick={() => go(screen - 1)}><ArrowLeft size={15} /> Back</Button>}
                        <Button size="sm" onClick={() => go(screen + 1)} disabled={!screenReady(cur)}>Continue <ArrowRight size={15} /></Button>
                      </div>
                      {!screenReady(cur) && cur.fields.length > 1 && (
                        <p className="text-xs text-ink-3">Answer each question to continue.</p>
                      )}
                    </div>
                  </div>
                )}

                {cur.kind === "validation" && (() => {
                  const v = buildValidation(cur.slot, answers, role || query);
                  return (
                    <div className="text-center sm:text-left">
                      <span className="eyebrow">{v.eyebrow}</span>
                      <div className="mt-6 font-serif text-8xl font-semibold leading-none text-primary-ink">
                        <AnimatedNumber value={v.value} duration={1400} startOnView={false} />
                        <span className="text-4xl">{v.suffix}</span>
                      </div>
                      <h1 className="mt-6 text-balance font-serif text-2xl font-semibold text-ink sm:text-3xl">{v.headline}</h1>
                      <p className="mt-3 max-w-md text-ink-2">{v.body}</p>
                      <div className="mt-9 flex items-center justify-center gap-3 sm:justify-start">
                        <Button variant="ghost" size="sm" onClick={() => go(screen - 1)}><ArrowLeft size={15} /> Back</Button>
                        <Button size="sm" onClick={() => go(screen + 1)}>Keep going <ArrowRight size={15} /></Button>
                      </div>
                    </div>
                  );
                })()}

                {cur.kind === "compare" && (() => {
                  const rows: { label: string; other: string; us: string }[] = [
                    { label: "Cost", other: "$150–300 / hour", us: "$0.33 a day" },
                    { label: "Available", other: "Business hours", us: "3 a.m., the night before" },
                    { label: "Feedback", other: "A vague gut feel", us: "Scored on 5 dimensions" },
                    { label: "Judgment", other: "You feel watched", us: "Completely private" },
                    { label: "Reps", other: "One session", us: "Unlimited, until it's easy" },
                  ];
                  return (
                    <div>
                      <span className="eyebrow">Why not just wing it</span>
                      <h1 className="mt-4 text-balance font-serif text-2xl font-semibold leading-tight text-ink sm:text-3xl">
                        A recruiter friend can&apos;t sit with you at 3 a.m.
                      </h1>
                      <p className="mt-3 max-w-md text-ink-2">
                        A coach costs hundreds an hour and judges you in the room. This is the same
                        rehearsal, private, and yours as many times as it takes.
                      </p>
                      <div className="mt-6 overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)" }}>
                        <div className="grid grid-cols-[1fr_1fr_1fr] border-b text-2xs font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border)" }}>
                          <span className="p-3 text-ink-3" />
                          <span className="p-3 text-center text-ink-3">Coach / recruiter</span>
                          <span className="p-3 text-center text-white" style={{ background: "linear-gradient(135deg, var(--primary-bright), var(--primary-ink))" }}>Axon</span>
                        </div>
                        {rows.map((r, i) => (
                          <div key={r.label} className="grid grid-cols-[1fr_1fr_1fr] items-center text-sm" style={{ background: i % 2 ? "var(--surface-2)" : "transparent" }}>
                            <span className="p-3 font-medium text-ink">{r.label}</span>
                            <span className="p-3 text-center text-ink-3">{r.other}</span>
                            <span className="p-3 text-center font-medium text-primary-ink">{r.us}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => go(screen - 1)}><ArrowLeft size={15} /> Back</Button>
                        <Button size="sm" onClick={() => go(screen + 1)}>See my plan <ArrowRight size={15} /></Button>
                      </div>
                    </div>
                  );
                })()}


                {cur.kind === "roi" && (() => {
                  // A single, clean number: the job's yearly pay divided by the
                  // plan price. Salary from what THEY told us, falling back to
                  // the field median. Framed as an estimate, not a promise.
                  const SAL: Record<string, number> = { u40: 32000, "40_60": 50000, "60_90": 75000, "90_130": 110000, "130p": 160000 };
                  const salary = SAL[answers.salaryBand] ?? computeRoi(answers.industry, "quarterly").salary;
                  const planPrice = PLANS.quarterly.amountCents / 100;
                  const multiple = Math.round(salary / planPrice / 50) * 50; // clean to nearest 50
                  return (
                    <div className="text-center sm:text-left">
                      <span className="eyebrow">The math</span>
                      <div className="mt-6 font-serif text-8xl font-semibold leading-none text-primary-ink">
                        <AnimatedNumber value={multiple} duration={1500} startOnView={false} />×
                      </div>
                      <h1 className="mt-6 text-balance font-serif text-2xl font-semibold leading-tight text-ink sm:text-3xl">
                        We estimate every dollar comes back about {multiple.toLocaleString()}×.
                      </h1>
                      <p className="mt-3 max-w-md text-ink-2">
                        This role pays around ${salary.toLocaleString()} a year. The plan is ${planPrice.toFixed(2)}.
                        Walking in a little readier — landing even a week sooner — dwarfs that.
                      </p>
                      <p className="mt-4 max-w-md text-xs leading-relaxed text-ink-3">
                        Based on the pay you told us, as a reference point, not a forecast of your offer.
                        The cost is exact; the return depends on you.
                      </p>
                      <div className="mt-9 flex items-center justify-center gap-3 sm:justify-start">
                        <Button variant="ghost" size="sm" onClick={() => go(screen - 1)}><ArrowLeft size={15} /> Back</Button>
                        <Button size="sm" onClick={() => go(screen + 1)}>Start free <ArrowRight size={15} /></Button>
                      </div>
                    </div>
                  );
                })()}

                {cur.kind === "plan" && (() => {
                  const plan = projectPlan(
                    (answers.skill as SkillLevel) || "rusty",
                    (answers.cadence as Cadence) || "steady"
                  );
                  const cad = CADENCE_META[(answers.cadence as Cadence) || "steady"];
                  const urgent = answers.timeline === "this_week" || answers.timeline === "two_weeks";
                  return (
                    <div>
                      <span className="eyebrow">Your plan</span>
                      <h1 className="mt-4 text-balance font-serif text-2xl font-semibold leading-tight text-ink sm:text-3xl">
                        Top 10% in <span className="text-primary-ink">{plan.toTop10.when}</span>.
                        <br />
                        Top 1% in <span className="text-primary-ink">{plan.toTop1.when}</span>.
                      </h1>
                      <p className="mt-3 text-ink-2">
                        {cad.blurb} gets you there — {plan.toTop1.sessions} short sessions, about{" "}
                        {plan.minutesTotal} minutes total.
                        {urgent ? " Your interview is close, so we front-load the questions you're most likely to get." : ""}
                      </p>

                      {/* the two milestones */}
                      <div className="mt-6 grid grid-cols-2 gap-3">
                        {[plan.toTop10, plan.toTop1].map((m) => (
                          <div key={m.topPercent} className="rounded-2xl border-2 p-4 text-center" style={{ borderColor: m.topPercent === 1 ? "var(--primary)" : "var(--border)", background: m.topPercent === 1 ? "var(--primary-soft)" : "var(--surface)" }}>
                            <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">Top {m.topPercent}%</p>
                            <p className="mt-1 font-serif text-3xl font-semibold text-primary-ink">{m.when}</p>
                            <p className="mt-0.5 text-2xs text-ink-3">~{m.sessions} sessions</p>
                          </div>
                        ))}
                      </div>

                      {/* start -> target, on the same scale the dashboard uses */}
                      <div className="mt-6 rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">Starting around</p>
                            <p className="font-serif text-3xl font-semibold text-ink">{plan.startScore}</p>
                            <p className="text-xs text-ink-3">top {plan.startTopPercent}%</p>
                          </div>
                          <div className="mb-2 flex-1">
                            <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
                              <motion.div
                                className="h-full rounded-full"
                                initial={{ width: `${plan.startScore}%` }}
                                animate={{ width: `${plan.targetScore}%` }}
                                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                                style={{ background: "linear-gradient(90deg, var(--primary), var(--primary-bright))" }}
                              />
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xs font-semibold uppercase tracking-wider text-primary-ink">Target</p>
                            <p className="font-serif text-3xl font-semibold text-primary-ink">{plan.targetScore}</p>
                            <p className="text-xs text-ink-3">top {plan.targetTopPercent}%</p>
                          </div>
                        </div>
                      </div>


                      <p className="mt-4 text-xs leading-relaxed text-ink-3">
                        Projected from your own answers, on the same five-dimension scale your
                        dashboard scores you against. It updates every session, and it&apos;s an
                        estimate, not a promise.
                      </p>

                      <div className="mt-7 flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => go(screen - 1)}><ArrowLeft size={15} /> Back</Button>
                        <Button size="sm" onClick={() => go(screen + 1)}>Start free <ArrowRight size={15} /></Button>
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
        <p className="mt-12 flex items-center gap-2 text-sm text-white/75"><ShieldCheck size={16} /> Private by design. Cancel anytime.</p>
      </div>
    </aside>
  );
}
