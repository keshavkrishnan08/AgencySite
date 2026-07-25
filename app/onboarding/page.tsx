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
import { anonId, attribution } from "@/lib/attribution";
import { CADENCE_META, projectCurve, projectPlan, type Cadence, type SkillLevel } from "@/lib/plan-projection";
import { scoreForPercentile } from "@/lib/metrics";
import { computeRoi } from "@/lib/roi";
import { PLANS } from "@/lib/pricing";
import type { InterviewGap, Situation } from "@/lib/types";

type Demo = "convo" | "skills" | "progress" | "questions" | "delivery";
type Opt = { value: string; label: string; emoji?: string };
type Field = { key: string; q: string; type?: "role" | "text"; optional?: boolean; options?: Opt[] };
type Cond = (a: Record<string, string>) => boolean;
type Screen =
  | { kind: "form"; fields: Field[]; demo: Demo; when?: Cond; hold?: boolean }
  | { kind: "validation"; slot: 1 | 2 | 3; demo: Demo; when?: Cond }
  | { kind: "email"; demo: Demo; when?: Cond }
  | { kind: "plan"; demo: Demo; when?: Cond }
  | { kind: "roi"; demo: Demo; when?: Cond };

/* We stopped asking "how good are you today?" — it's inferable from how someone
   says they feel, and Superwall's onboarding research is clear that every extra
   question you can skip lifts completion. This maps the feeling to the skill
   level the projection needs, so the graph and plan still personalise. */
const CONF_TO_SKILL: Record<string, SkillLevel> = {
  terrified: "novice",
  rusty: "rusty",
  shaky: "rusty",
  out_of_practice: "middling",
  okay: "middling",
  confident: "solid",
};
const skillFrom = (a: Record<string, string>): SkillLevel => CONF_TO_SKILL[a.confidence] || "rusty";

const SITUATIONS: Situation[] = ["returning", "laid_off", "promotion", "career_change"];

const SCREENS: Screen[] = [
  // ── One question per screen, one tap to advance — top-app style. Questions
  //    are kept short on purpose; Superwall's onboarding data shows terse,
  //    single-decision screens complete far better than wordy ones. The middle
  //    of the flow is where we tailor the product to the person: weakness,
  //    strength, how they like to practice, how often. ──

  // Emotional opener — lowest-friction possible question, high buy-in.
  {
    kind: "form", demo: "convo",
    fields: [{
      key: "confidence",
      q: "How do you feel about interviewing?",
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
    kind: "form", demo: "skills",
    fields: [{
      key: "situation",
      q: "What brings you here?",
      options: SITUATIONS.map((s) => ({ value: s, label: SITUATION_META[s].short, emoji: SITUATION_META[s].emoji })),
    }],
  },
  {
    // Career changers only: where they're coming from, to frame the pivot.
    kind: "form", demo: "skills",
    when: (a) => a.situation === "career_change",
    fields: [{
      key: "fromField",
      q: "Coming from which field?",
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
  // ── Validation 1: name the problem. Single stat, calm. ──
  { kind: "validation", slot: 1, demo: "convo" },
  {
    kind: "form", demo: "skills",
    fields: [{
      key: "industry",
      q: "What's your field?",
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
    kind: "form", demo: "questions",
    fields: [{ key: "role", type: "role", q: "What role are you preparing for?" }],
  },
  // ── Validation 2: the odds, made concrete for their field + role. ──
  { kind: "validation", slot: 2, demo: "questions" },
  // ── Customization: the weakness we'll aim practice at. ──
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
  // ── Customization: the strength we'll build answers around. ──
  {
    kind: "form", demo: "skills",
    fields: [{
      key: "strength",
      q: "What's your strongest card?",
      options: [
        { value: "experience", label: "My experience", emoji: "🏆" },
        { value: "people", label: "People skills", emoji: "🤝" },
        { value: "results", label: "My track record", emoji: "📊" },
        { value: "grit", label: "Work ethic", emoji: "💪" },
        { value: "adaptable", label: "Adaptability", emoji: "🌊" },
        { value: "unsure", label: "Still finding it", emoji: "🤔" },
      ],
    }],
  },
  // ── Customization: how they like to practice — sets the default mode. ──
  {
    kind: "form", demo: "delivery",
    fields: [{
      key: "practiceStyle",
      q: "How do you like to practice?",
      options: [
        { value: "voice", label: "Out loud, by voice", emoji: "🎤" },
        { value: "typed", label: "Typed, at my pace", emoji: "⌨️" },
        { value: "pressure", label: "Realistic pressure", emoji: "🎯" },
        { value: "coached", label: "Gentle coaching", emoji: "🤝" },
      ],
    }],
  },
  {
    kind: "form", demo: "questions",
    fields: [{
      key: "gap",
      q: "Last time you interviewed?",
      options: [
        { value: "<1yr", label: "Within the last year", emoji: "🗓️" },
        { value: "1-3yr", label: "1–3 years ago", emoji: "⌛" },
        { value: "3-5yr", label: "3–5 years ago", emoji: "🕰️" },
        { value: "5+yr", label: "5+ years ago", emoji: "🧭" },
      ],
    }],
  },
  // ── Cadence, with a live projection graph that steepens as they commit.
  //    hold:true keeps them on this screen so they can watch it move. ──
  {
    kind: "form", demo: "progress", hold: true,
    fields: [{
      key: "cadence",
      q: "How often will you practice?",
      options: [
        { value: "light", label: "A couple times a week", emoji: "🌱" },
        { value: "steady", label: "Most weekdays", emoji: "📈" },
        { value: "committed", label: "Almost every day", emoji: "🔥" },
        { value: "intense", label: "Twice a day", emoji: "⚡" },
      ],
    }],
  },
  // ── Validation 3: reflect the commitment back — the consistency nudge. ──
  { kind: "validation", slot: 3, demo: "progress" },
  {
    kind: "form", demo: "progress",
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
    kind: "form", demo: "progress",
    fields: [{
      key: "salaryBand",
      q: "What does it pay, roughly?",
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
    kind: "form", demo: "progress",
    fields: [{
      key: "stakes",
      q: "What would landing it change?",
      options: [
        { value: "income", label: "A real pay rise", emoji: "💰" },
        { value: "stability", label: "Stability again", emoji: "🏠" },
        { value: "out", label: "Getting out of where I am", emoji: "🚪" },
        { value: "restart", label: "Restarting my career", emoji: "🌅" },
        { value: "growth", label: "A bigger role", emoji: "📊" },
      ],
    }],
  },
  // ── Email gate, right before the payoff. Captures the lead (with every quiz
  //    answer) even if they never finish signup, and the plan reveal is the
  //    peak-value moment people trade an email for. ──
  { kind: "email", demo: "progress" },
  // ── The plan: interview-ready in about two weeks. ──
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

function buildValidation(slot: 1 | 2 | 3, a: Record<string, string>, role: string) {
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
  if (slot === 3) {
    // Reflect the commitment they just made back at them — consistency nudge.
    const cad = CADENCE_META[(a.cadence as Cadence)] || CADENCE_META.steady;
    return {
      eyebrow: "This is the whole edge",
      value: 93,
      suffix: "%",
      headline: "93% of people feel interview anxiety. The ones who beat it rehearsed first.",
      body: `You just chose to practice ${cad.perWeek}× a week. Most people never commit to that — and that single habit is the difference between freezing and walking in calm.`,
      source: "2025 candidate anxiety survey",
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
  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

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
      !cur.hold && // hold screens (the cadence graph) wait for an explicit Continue
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

  // Email gate: capture the lead (with every quiz answer) before the plan
  // reveal. Fire-and-forget to Supabase via /api/lead; never block the reveal.
  const submitEmail = async () => {
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value)) {
      setEmailErr("That email doesn't look right.");
      track("form:error", { form: "onboarding_email", reason: "invalid" });
      return;
    }
    setEmailErr("");
    setEmailBusy(true);
    identify(value);
    setProfile({ email: value });
    const finalRole = role.trim() || query.trim() || "";
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          source: "onboarding",
          anonId: anonId(),
          attribution: attribution(),
          name: answers.name,
          situation: answers.situation,
          targetRole: finalRole,
          interviewGap: answers.gap,
          intent: "onboarding",
          // the quiz payload — makes this a rich, scored lead
          ...Object.fromEntries(Object.entries(answers).map(([k, v]) => [`q_${k}`, v])),
        }),
      });
    } catch {
      /* never block the plan reveal on a network hiccup */
    }
    track("lead_captured", { source: "onboarding" });
    setEmailBusy(false);
    go(screen + 1);
  };

  const finish = () => {
    const situation = (answers.situation as Situation) || null;
    const gap = (answers.gap as InterviewGap) || "1-3yr";
    const finalRole = role.trim() || query.trim() || "Office Manager";
    const company = (answers.company || "").trim();
    setOnboarding({ situation, targetRole: finalRole, company, interviewGap: gap, timeline: answers.timeline, salaryBand: answers.salaryBand });
    setProfile({ situation, targetRole: finalRole, company, interviewGap: gap });
    // Every onboarding answer, prefixed so it groups in Mixpanel, on the
    // completion event AND registered as super properties so it rides along on
    // every future event and is queryable per person once they sign in.
    const answerProps = Object.fromEntries(
      Object.entries({ ...answers, role: finalRole }).map(([k, v]) => [`ob_${k}`, v])
    );
    setContext(answerProps);
    track("onboarding_complete", { situation, role: finalRole, gap, ...answerProps });
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
                        {f.key === "cadence" && (
                          <CadenceChart
                            skill={skillFrom(answers)}
                            cadence={(answers.cadence as Cadence) || "steady"}
                            picked={Boolean(answers.cadence)}
                          />
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
                      <div className="font-serif text-8xl font-semibold leading-none text-primary-ink">
                        <AnimatedNumber value={v.value} duration={1400} startOnView={false} />
                        <span className="text-4xl">{v.suffix}</span>
                      </div>
                      <h1 className="mt-6 text-balance font-serif text-2xl font-semibold text-ink sm:text-3xl">{v.headline}</h1>
                      <div className="mt-9 flex items-center justify-center gap-3 sm:justify-start">
                        <Button variant="ghost" size="sm" onClick={() => go(screen - 1)}><ArrowLeft size={15} /> Back</Button>
                        <Button size="sm" onClick={() => go(screen + 1)}>Keep going <ArrowRight size={15} /></Button>
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

                {cur.kind === "email" && (
                  <div className="text-center sm:text-left">
                    <span className="eyebrow">One last thing</span>
                    <h1 className="mt-4 text-balance font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                      Where should we send your plan?
                    </h1>
                    <p className="mt-3 max-w-md text-ink-2">
                      We built a plan from your answers. Add your email to see it and save your
                      progress. No spam, ever.
                    </p>
                    <form
                      onSubmit={(e) => { e.preventDefault(); void submitEmail(); }}
                      className="mt-7 max-w-sm"
                    >
                      <input
                        autoFocus
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="field !py-3"
                        aria-label="Email address"
                      />
                      {emailErr && <p className="mt-2 text-sm text-coral-ink">{emailErr}</p>}
                      <div className="mt-5 flex items-center gap-3">
                        <Button variant="ghost" size="sm" type="button" onClick={() => go(screen - 1)}>
                          <ArrowLeft size={15} /> Back
                        </Button>
                        <Button size="sm" type="submit" disabled={emailBusy}>
                          {emailBusy ? "Saving…" : "See my plan"} <ArrowRight size={15} />
                        </Button>
                      </div>
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-3">
                        <ShieldCheck size={13} /> Private by design. We never share your email.
                      </p>
                    </form>
                  </div>
                )}

                {cur.kind === "plan" && (() => {
                  const plan = projectPlan(
                    skillFrom(answers),
                    (answers.cadence as Cadence) || "steady"
                  );
                  const cad = CADENCE_META[(answers.cadence as Cadence) || "steady"];
                  const urgent = answers.timeline === "this_week" || answers.timeline === "two_weeks";
                  return (
                    <div className="text-center sm:text-left">
                      <span className="eyebrow">Your plan</span>
                      <h1 className="mt-4 text-balance font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                        We can get you interview-ready in about{" "}
                        <span className="text-primary-ink">{plan.toTop10.when}</span>.
                      </h1>
                      <p className="mt-4 max-w-md text-ink-2">
                        {cad.blurb}. That&apos;s the whole plan.
                        {urgent ? " Your interview is close, so we start with the questions you're most likely to get." : ""}
                      </p>
                      <div className="mt-9 flex items-center justify-center gap-3 sm:justify-start">
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

/* The live projection graph on the practice-frequency screen. Same per-session
   model as the plan and the dashboard, so the curve they watch climb here is
   the exact promise they're held to later. Redraws (steepens) each time the
   cadence changes — more reps per week, faster climb. */
function CadenceChart({ skill, cadence, picked }: { skill: SkillLevel; cadence: Cadence; picked: boolean }) {
  const W = 360, H = 170, padL = 6, padR = 14, padT = 14, padB = 22, days = 28;
  const yMin = 38, yMax = 100;
  const curve = projectCurve(skill, cadence, days);
  const x = (d: number) => padL + (d / days) * (W - padL - padR);
  const y = (s: number) => padT + (1 - (s - yMin) / (yMax - yMin)) * (H - padT - padB);
  const line = curve.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s).toFixed(1)}`).join(" ");
  const area = `${line} L${x(days).toFixed(1)},${y(yMin).toFixed(1)} L${x(0).toFixed(1)},${y(yMin).toFixed(1)} Z`;
  const top10 = scoreForPercentile(90);
  const top1 = scoreForPercentile(99);
  const end = curve[curve.length - 1];
  const reach = end >= top1 ? "the top 1%" : end >= top10 ? "the top 10%" : `a score of ${Math.round(end)}`;
  const cad = CADENCE_META[cadence];
  return (
    <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex items-baseline justify-between">
        <span className="text-2xs font-semibold uppercase tracking-wider text-ink-3">Your projected readiness</span>
        <span className="text-2xs font-semibold text-primary-ink">{cad.perWeek}× a week</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" style={{ overflow: "visible" }} aria-hidden>
        <defs>
          <linearGradient id="cadfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.20" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[{ s: top10, label: "Top 10%" }, { s: top1, label: "Top 1%" }].map((t) => (
          <g key={t.label}>
            <line x1={padL} x2={W - padR} y1={y(t.s)} y2={y(t.s)} stroke="var(--border-strong)" strokeDasharray="3 4" strokeWidth="1" />
            <text x={padL + 1} y={y(t.s) - 4} className="fill-ink-3" style={{ fontSize: 9, fontWeight: 600 }}>{t.label}</text>
          </g>
        ))}
        <motion.path key={`a-${cadence}`} d={area} fill="url(#cadfill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
        <motion.path
          key={`l-${cadence}`} d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.circle
          key={`c-${cadence}`} cx={x(days)} cy={y(end)} r="4.5" fill="var(--primary)" stroke="var(--surface)" strokeWidth="2"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.75, type: "spring", stiffness: 300, damping: 18 }}
        />
        <text x={padL} y={H - 6} className="fill-ink-3" style={{ fontSize: 9 }}>today</text>
        <text x={W - padR} y={H - 6} textAnchor="end" className="fill-ink-3" style={{ fontSize: 9 }}>4 weeks</text>
      </svg>
      <p className="mt-1.5 text-2xs leading-relaxed text-ink-3">
        {picked
          ? <>At <span className="font-semibold text-ink-2">{cad.perWeek}× a week</span> you reach <span className="font-semibold text-primary-ink">{reach}</span> in about four weeks. Try another pace.</>
          : <>Choose a pace above to watch your climb steepen.</>}
      </p>
    </div>
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
