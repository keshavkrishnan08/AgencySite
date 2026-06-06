"use client";

import type { ReactNode } from "react";
import { ArrowRight, Check, Mic } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { ScoreNumber, DimensionBars } from "@/components/ui/Score";
import { ProgressLineChart, Sparkline } from "@/components/charts/Charts";
import { cn } from "@/lib/utils";

/* A full section per key feature — alternating text / visual, simple copy. */

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

/* ---------------- visuals ---------------- */

const ScoringVisual = () => (
  <Mock>
    <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
      <Label>Session score</Label>
      <span className="rounded-full bg-sage-soft px-2.5 py-1 text-xs font-semibold text-sage-ink">+14 this week</span>
    </div>
    <div className="flex items-end gap-2 pt-4">
      <ScoreNumber value={84} className="text-5xl" />
      <span className="mb-1.5 text-sm text-ink-3">/ 100</span>
    </div>
    <div className="mt-4">
      <DimensionBars dimensions={{ clarity: 86, relevance: 90, specificity: 74, confidence: 80, conciseness: 88 }} />
    </div>
  </Mock>
);

const ConversationVisual = () => (
  <Mock>
    <Label>Question 3 of 8</Label>
    <p className="mt-1 font-medium text-ink">Tell me about a tough teammate.</p>
    <div className="mt-4 flex justify-end">
      <Bubble you>
        When two people left at once, I cross-trained the team in a week… <Mic size={12} className="ml-0.5 inline" />
      </Bubble>
    </div>
    <div className="mt-3 flex items-start gap-2">
      <HM />
      <Bubble>How did they react?</Bubble>
    </div>
  </Mock>
);

const GapVisual = () => {
  const rows = [
    { t: "The Confident Pivot", l: "I took two years for my kids — a choice I'd make again.", sel: true },
    { t: "The Honest & Brief", l: "I stepped away, that chapter's done, and I'm ready now." },
    { t: "The Growth Story", l: "The time taught me to stay organized under real pressure." },
  ];
  return (
    <Mock>
      <Label>Your gap, 3 ways</Label>
      <div className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <div key={r.t} className="rounded-xl border-2 p-3" style={{ borderColor: r.sel ? "var(--primary)" : "var(--border)", background: r.sel ? "var(--primary-soft)" : "transparent" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-primary-ink">{r.t}</span>
              {r.sel && <Check size={15} className="text-primary" />}
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-ink-3">&ldquo;{r.l}&rdquo;</p>
          </div>
        ))}
      </div>
    </Mock>
  );
};

const AnxietyVisual = () => {
  const Pill = ({ children }: { children: ReactNode }) => (
    <span className="rounded-md bg-amber-soft px-1.5 py-0.5 font-medium text-amber-ink">{children}</span>
  );
  return (
    <Mock>
      <Label>What interviewers hear</Label>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        <Pill>Um</Pill>, <Pill>I guess</Pill> I <Pill>just</Pill> handled it, <Pill>you know</Pill>?
      </p>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-bg-sunk p-3.5">
        <span className="text-sm text-ink-2">Filler words</span>
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg font-semibold text-ink">6</span>
          <span className="text-ink-3">→</span>
          <span className="font-serif text-lg font-semibold text-sage-ink">2</span>
          <Sparkline values={[6, 5, 5, 4, 3, 2]} width={56} height={24} color="var(--sage)" />
        </div>
      </div>
    </Mock>
  );
};

const PredictorVisual = () => {
  const qs = [
    { q: "Tell me about a conflict…", p: 90 },
    { q: "How do you handle pressure?", p: 84 },
    { q: "Why do you want this role?", p: 78 },
  ];
  return (
    <Mock>
      <Label>Most likely questions</Label>
      <div className="mt-3 space-y-3">
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
    </Mock>
  );
};

const CompanyVisual = () => {
  const rows = [
    ["What they do", "A regional care network. Patients first."],
    ["Recent news", "Opened a new clinic last quarter."],
    ["Ask them", "What does success look like in 90 days?"],
  ];
  return (
    <Mock>
      <p className="font-serif text-lg font-semibold text-ink">Mercy Hospital</p>
      <div className="mt-3 space-y-3">
        {rows.map(([h, l]) => (
          <div key={h}>
            <p className="text-2xs font-semibold uppercase tracking-wider text-primary-ink">{h}</p>
            <p className="text-sm text-ink-2">{l}</p>
          </div>
        ))}
      </div>
    </Mock>
  );
};

const InterviewDayVisual = () => (
  <Mock dark>
    <div className="flex items-center justify-between text-xs text-white/55">
      <span>Question 4 of 8</span>
      <span className="rounded-full bg-coral/20 px-2.5 py-1 font-mono font-bold text-coral">0:42</span>
    </div>
    <p className="mt-4 font-serif text-xl font-semibold text-white">Tell me about a time you failed.</p>
    <div className="mt-4 h-20 rounded-lg border border-white/10 bg-white/5" />
    <p className="mt-3 text-xs text-white/45">No scores until the end. No going back.</p>
  </Mock>
);

const SalaryVisual = () => (
  <Mock>
    <Label>The money talk</Label>
    <div className="mt-3 flex items-start gap-2">
      <HM />
      <Bubble>$65,000 — can you do that?</Bubble>
    </div>
    <div className="mt-2.5 flex justify-end">
      <Bubble you>$72,000, based on market rate.</Bubble>
    </div>
    <div className="mt-3 flex gap-2">
      <span className="rounded-full bg-bg-tint px-2.5 py-1 text-xs font-medium text-ink-2">Confidence <b className="text-sage-ink">82</b></span>
      <span className="rounded-full bg-bg-tint px-2.5 py-1 text-xs font-medium text-ink-2">Composure <b className="text-sage-ink">78</b></span>
    </div>
  </Mock>
);

const ProgressVisual = () => (
  <Mock>
    <div className="flex items-center justify-between">
      <Label>Your progress</Label>
      <span className="rounded-full bg-sage-soft px-2.5 py-1 text-xs font-semibold text-sage-ink">Offer 🎉</span>
    </div>
    <div className="mt-2">
      <ProgressLineChart
        data={[
          { label: "W1", score: 48 },
          { label: "W2", score: 58 },
          { label: "W3", score: 66 },
          { label: "W4", score: 72 },
          { label: "W5", score: 79 },
          { label: "W6", score: 84 },
        ]}
        height={150}
        showReady={false}
      />
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

const FEATURES: Feat[] = [
  {
    eyebrow: "The core",
    title: "Answer real questions. Get a real score.",
    body: "Pick your role. Answer 8 questions. Get scored on five things, with one clear fix each time.",
    bullets: ["Scored on 5 things", "One simple fix per answer", "About 10 minutes"],
    visual: <ScoringVisual />,
    href: "/onboarding",
  },
  {
    eyebrow: "Speak, don't just type",
    title: "Say it out loud. It asks follow-ups.",
    body: "Talk like a real interview. PrepPath listens and writes it down. Then it asks a follow-up — just like a real interviewer would.",
    bullets: ["Speak or type", "Smart follow-up questions", "Great for calming nerves"],
    visual: <ConversationVisual />,
  },
  {
    eyebrow: "Most popular",
    title: "Turn your résumé gap into a strong answer.",
    body: "Took time off? Got laid off? We write three ways to explain it in 30 seconds. Pick the one that sounds like you.",
    bullets: ["3 ready answers", "Sounds like you, not a script", "Practice till it's smooth"],
    visual: <GapVisual />,
    href: "/tools/gap-story",
  },
  {
    eyebrow: "Sound more sure",
    title: "Catch the words that make you sound nervous.",
    body: "&ldquo;Um.&rdquo; &ldquo;I guess.&rdquo; &ldquo;I just.&rdquo; You don't hear them. Interviewers do. We show you, and help you drop them.",
    bullets: ["Spots filler and hedging", "Tracks it over time", "Most people cut it 60% in 2 weeks"],
    visual: <AnxietyVisual />,
  },
  {
    eyebrow: "Know what's coming",
    title: "See the questions before you walk in.",
    body: "Paste the job post. We guess the 5 questions they're most likely to ask, and what a strong answer needs.",
    bullets: ["Top 5 likely questions", "Why they ask each one", "What to include"],
    visual: <PredictorVisual />,
    href: "/tools/question-predictor",
  },
  {
    eyebrow: "Do your homework fast",
    title: "Walk in knowing the company.",
    body: "Type a company name. Get a one-page brief: what they do, recent news, and smart questions to ask them.",
    bullets: ["What they do, in plain words", "Recent news to mention", "3 questions to ask"],
    visual: <CompanyVisual />,
    href: "/tools/company-research",
  },
  {
    eyebrow: "The night before",
    title: "A real-pressure dress rehearsal.",
    body: "A timer. No do-overs. No scores till the end. If you hold up here, you're ready for the real thing.",
    bullets: ["60 seconds per answer", "No going back", "See how you held up"],
    visual: <InterviewDayVisual />,
  },
  {
    eyebrow: "Get paid what you're worth",
    title: "Practice the money talk.",
    body: "They ask your number. Most people freeze and lose thousands. Practice here until your voice stays steady.",
    bullets: ["Real back-and-forth", "It pushes back", "Scored on confidence"],
    visual: <SalaryVisual />,
    href: "/tools/salary",
  },
  {
    eyebrow: "Watch it work",
    title: "See your score climb. Track real offers.",
    body: "Every session moves the line. Your dashboard shows it. Then track your real interviews — because offers are the point.",
    bullets: ["Charts that go up", "Daily streaks", "Track interviews to offers"],
    visual: <ProgressVisual />,
    href: "/dashboard",
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
          <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-2" dangerouslySetInnerHTML={{ __html: f.body }} />
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
              Try it free <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
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
            One app. Everything that wins the interview.
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
