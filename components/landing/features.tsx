"use client";

import { type ReactNode } from "react";
import { ArrowRight, Check, Mic } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { Sparkline } from "@/components/charts/Charts";
import { cn } from "@/lib/utils";

/* Fewer, combined sections. Each one folds related features into a single
   layered visual. Simple copy, no em dashes. */

const TEAL = "linear-gradient(135deg, var(--primary-bright), var(--primary-ink))";

function Mock({ children, dark, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        className="absolute -inset-5 -z-10 rounded-[36px] opacity-60 blur-3xl"
        style={{ background: "radial-gradient(60% 60% at 30% 20%, rgba(25,169,184,0.22), transparent), radial-gradient(50% 50% at 90% 90%, rgba(184,137,59,0.16), transparent)" }}
      />
      <div
        className={cn("rounded-2xl border p-5 shadow-lg", className)}
        style={
          dark
            ? { borderColor: "rgba(255,255,255,0.1)", background: "radial-gradient(120% 90% at 50% -10%, #1b2740, #10141f 70%)" }
            : { borderColor: "var(--border)", background: "var(--surface)" }
        }
      >
        {children}
      </div>
    </div>
  );
}

const Label = ({ children }: { children: ReactNode }) => (
  <span className="text-2xs font-semibold uppercase tracking-wider text-ink-3">{children}</span>
);
const HM = () => (
  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">HM</span>
);
const Bubble = ({ children, you }: { children: ReactNode; you?: boolean }) => (
  <div
    className={cn("max-w-[82%] rounded-2xl px-3.5 py-2 text-sm", you ? "rounded-tr-sm text-white" : "rounded-tl-sm border bg-surface text-ink")}
    style={you ? { background: TEAL } : { borderColor: "var(--border)" }}
  >
    {children}
  </div>
);
const Divider = () => <div className="my-4 hairline" />;

/* ---------------- combined visuals ---------------- */

// Practice + voice + conversational + scoring
const PracticeVisual = () => (
  <Mock>
    <div className="flex items-center justify-between">
      <Label>Question 3 of 8</Label>
      <span className="rounded-full bg-sage-soft px-2.5 py-1 text-xs font-bold text-sage-ink">84 / 100</span>
    </div>
    <p className="mt-2 font-medium text-ink">Tell me about a difficult coworker.</p>
    <div className="mt-3 flex justify-end">
      <Bubble you>
        One teammate pushed back on every change. So I started asking his take before I decided anything. He went from my biggest blocker to my biggest ally. <Mic size={12} className="ml-0.5 inline" />
      </Bubble>
    </div>
    <div className="mt-2.5 flex items-start gap-2">
      <HM />
      <Bubble>Nice. What do you think actually changed for him?</Bubble>
    </div>
    <Divider />
    <div className="flex flex-wrap gap-1.5">
      {[["Clarity", 86], ["Specificity", 74], ["Confidence", 80]].map(([k, v]) => (
        <span key={k as string} className="rounded-full bg-bg-tint px-2.5 py-1 text-xs font-medium text-ink-2">
          {k} <b className="text-sage-ink">{v as number}</b>
        </span>
      ))}
    </div>
  </Mock>
);

// Gap Story Builder + the Anxiety Detector
const AnswersVisual = () => {
  const rows = [
    { t: "The Confident Pivot", sel: true },
    { t: "The Honest & Brief", sel: false },
    { t: "The Growth Story", sel: false },
  ];
  return (
    <Mock>
      <Label>Your gap</Label>
      <div className="mt-2.5 space-y-2">
        {rows.map((r) => (
          <div
            key={r.t}
            className="flex items-center justify-between rounded-xl border-2 px-3 py-2"
            style={{ borderColor: r.sel ? "var(--primary)" : "var(--border)", background: r.sel ? "var(--primary-soft)" : "transparent" }}
          >
            <span className="text-sm font-semibold text-primary-ink">{r.t}</span>
            {r.sel && <Check size={15} className="text-primary" />}
          </div>
        ))}
      </div>
      <Divider />
      <div className="flex items-center justify-between rounded-xl bg-bg-sunk p-3">
        <span className="text-sm text-ink-2">Filler words dropping</span>
        <div className="flex items-center gap-2">
          <span className="font-serif text-base font-semibold text-ink">6</span>
          <span className="text-ink-3">to</span>
          <span className="font-serif text-base font-semibold text-sage-ink">2</span>
          <Sparkline values={[6, 5, 5, 4, 3, 2]} width={52} height={22} color="var(--sage)" />
        </div>
      </div>
    </Mock>
  );
};

// Question Predictor: paste the posting, get the questions, then drill them.
const PredictorVisual = () => {
  const qs = [
    { q: "Tell me about a conflict.", p: 91 },
    { q: "How do you handle pressure?", p: 84 },
    { q: "Why this role, right now?", p: 78 },
  ];
  return (
    <Mock>
      <Label>Job posting</Label>
      <div className="mt-2 rounded-lg bg-bg-sunk p-3">
        <p className="line-clamp-2 text-xs leading-relaxed text-ink-3">
          Office Manager, Mercy Hospital. Fast-paced clinic environment. Must coordinate across
          departments and stay calm under pressure…
        </p>
      </div>
      <Divider />
      <Label>The 5 they&apos;ll likely ask</Label>
      <div className="mt-2 space-y-2.5">
        {qs.map((x) => (
          <div key={x.q}>
            <div className="flex items-center justify-between text-sm">
              <span className="truncate text-ink">{x.q}</span>
              <span className="ml-2 font-mono text-xs font-bold text-sage-ink">{x.p}%</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full" style={{ background: "var(--bg-tint)" }}>
              <div className="h-full rounded-full" style={{ width: `${x.p}%`, background: TEAL }} />
            </div>
          </div>
        ))}
      </div>
      <div
        className="mt-4 rounded-xl px-3.5 py-2.5 text-center text-sm font-semibold text-white"
        style={{ background: TEAL }}
      >
        Practice these 5 questions →
      </div>
    </Mock>
  );
};

// The metrics page: percentile, pace, and the date you'd reach the top 1%.
const MetricsVisual = () => (
  <Mock>
    <div className="flex items-center justify-between">
      <div>
        <Label>Readiness</Label>
        <p className="font-serif text-4xl font-semibold text-ink">78</p>
        <p className="text-xs text-ink-2">Top 21% of candidates</p>
      </div>
      <div className="text-right">
        <Label>To top 1%</Label>
        <p className="font-serif text-2xl font-semibold text-gold-ink">18 days</p>
        <p className="text-xs text-ink-3">at 2.4 pts a session</p>
      </div>
    </div>
    <div className="mt-3">
      <Sparkline values={[44, 51, 55, 62, 66, 71, 74, 78]} width={320} height={54} />
    </div>
    <Divider />
    <div className="grid grid-cols-3 gap-2 text-center">
      {[
        ["Streak", "9", "days"],
        ["Pace", "+2.4", "per session"],
        ["Fillers", "-64%", "since day 1"],
      ].map(([k, v, s]) => (
        <div key={k} className="rounded-xl bg-bg-sunk px-2 py-2.5">
          <p className="text-2xs uppercase tracking-wider text-ink-3">{k}</p>
          <p className="font-mono text-base font-semibold text-ink">{v}</p>
          <p className="text-2xs text-ink-3">{s}</p>
        </div>
      ))}
    </div>
  </Mock>
);

/* ---------------- data ---------------- */

interface Feat {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  visual: ReactNode;
  href?: string;
}

/* Three things, deliberately. One you do, one that shows you're getting better,
   and two small builders that feed the first. Anything else was noise. */
const FEATURES: Feat[] = [
  {
    eyebrow: "The main thing",
    title: "Practice out loud. Get scored.",
    body: "Pick your role. Speak or type your answers. AI scores you on five things, gives one clear fix, and asks a real follow-up like an interviewer who was actually listening.",
    bullets: ["Speak or type, your choice", "A follow-up on what you just said", "Scored on 5 things, one fix each"],
    visual: <PracticeVisual />,
    href: "/onboarding",
  },
  {
    eyebrow: "Why people stay",
    title: "Know exactly where you stand.",
    body: "Not a vague feeling. A readiness score, the percentile it puts you in, how fast you're improving, and a projected date for reaching a top 1% interview at your current pace.",
    bullets: [
      "Your percentile against real candidates",
      "Estimated time to a top 1% interview",
      "Streaks, milestones, and per-skill trends",
    ],
    visual: <MetricsVisual />,
    href: "/dashboard",
  },
  {
    eyebrow: "Before you practice",
    title: "See the questions before they ask them.",
    body: "Paste the job posting. We read the role, the seniority, and their exact language, then predict the five questions most likely to come up. One tap drills all five, scored.",
    bullets: ["The 5 questions, ranked by likelihood", "Why they ask each one", "Practice them in one tap"],
    visual: <PredictorVisual />,
    href: "/tools/question-predictor",
  },
  {
    eyebrow: "The question people freeze on",
    title: "Your gap, made into a strength.",
    body: "Layoff, kids, health, a career change. Three confident 30-second versions of the answer, and the Anxiety Detector catching the little words that leak doubt.",
    bullets: ["3 ready gap answers", "30 seconds, sounds like you", "Catches 'um' and 'I just'"],
    visual: <AnswersVisual />,
    href: "/tools/gap-story",
  },
];

function FeatureRow({ f, i }: { f: Feat; i: number }) {
  const reverse = i % 2 === 1;
  return (
    <Reveal>
      <div className="container-wide grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16">
        <div className={cn(reverse && "lg:order-2")}>
          <p className="eyebrow">{f.eyebrow}</p>
          <h3 className="mt-3 text-balance font-serif text-3xl font-semibold text-ink sm:text-[2.5rem] sm:leading-[1.1]">
            {f.title}
          </h3>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-2">{f.body}</p>
          <ul className="mt-6 space-y-3">
            {f.bullets.map((b) => (
              <li key={b} className="flex items-center gap-3 font-medium text-ink">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sage-soft">
                  <Check size={14} className="text-sage-ink" />
                </span>
                {b}
              </li>
            ))}
          </ul>
          {f.href && (
            <ButtonLink href={f.href} variant="secondary" size="sm" className="group mt-7">
              Try it <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </ButtonLink>
          )}
        </div>
        <div className={cn(reverse && "lg:order-1")}>{f.visual}</div>
      </div>
    </Reveal>
  );
}

export function ProductFeatures() {
  return (
    <section id="features" className="scroll-mt-20 py-10">
      <div className="container-wide text-center">
        <Reveal>
          <p className="eyebrow justify-center">Everything you need</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance font-serif text-display font-semibold text-ink">
            One app.
          </h2>
        </Reveal>
      </div>
      <div className="mt-4 divide-y" style={{ borderColor: "var(--border)" }}>
        {FEATURES.map((f, i) => (
          <FeatureRow key={f.title} f={f} i={i} />
        ))}
      </div>
    </section>
  );
}
