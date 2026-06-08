"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
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

// Gap Story + Your Story + Anxiety Detector
const AnswersVisual = () => {
  const rows = [
    { t: "The Confident Pivot", sel: true },
    { t: "The Honest & Brief", sel: false },
    { t: "The Growth Story", sel: false },
  ];
  return (
    <Mock>
      <Label>Your gap, 3 ways</Label>
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

// Company Briefing + Question Predictor
const ResearchVisual = () => {
  const qs = [
    { q: "Tell me about a conflict.", p: 90 },
    { q: "How do you handle pressure?", p: 84 },
  ];
  return (
    <Mock>
      <p className="font-serif text-lg font-semibold text-ink">Mercy Hospital</p>
      <div className="mt-2 space-y-2">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-primary-ink">What they do</p>
          <p className="text-sm text-ink-2">A regional care network. Patients first.</p>
        </div>
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-primary-ink">Ask them</p>
          <p className="text-sm text-ink-2">What does success look like in 90 days?</p>
        </div>
      </div>
      <Divider />
      <Label>Likely questions</Label>
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
    </Mock>
  );
};

// Interview Day (solo, dark). Live mic: a volume meter + scrambling transcript,
// and a corner clock that ticks up to 1:00 then loops back to 0:42.
const FAIL_TRANSCRIPT =
  "I missed a deadline that really mattered. I owned it the next morning, and I changed how I plan every project now.";

// Deterministic bar config (no Math.random) so server and client render the
// same markup. The motion happens after hydration, client-side only.
const VBARS = Array.from({ length: 16 }, (_, i) => {
  const seed = (i * 13) % 7;
  return { peak: 8 + seed * 3, dur: 0.42 + seed * 0.08, delay: (i % 5) * 0.07 };
});

function InterviewDayVisual() {
  const [t, setT] = useState(42);
  const [shown, setShown] = useState("");

  // corner timer: count up, then reset to 0:42 right after it hits 1:00
  useEffect(() => {
    const id = setInterval(() => setT((p) => (p >= 60 ? 42 : p + 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // live transcription: reveal the answer, scramble the leading edge, loop
  useEffect(() => {
    const glyphs = "etaoinshrdlucmfwypvbgkjqxz ";
    let i = 0;
    const id = setInterval(() => {
      i = i > FAIL_TRANSCRIPT.length + 16 ? 0 : i + 1;
      const clear = Math.min(i, FAIL_TRANSCRIPT.length);
      let scr = "";
      if (clear < FAIL_TRANSCRIPT.length) {
        const n = Math.min(4, FAIL_TRANSCRIPT.length - clear);
        for (let k = 0; k < n; k++) scr += glyphs[(i * 3 + k * 7) % glyphs.length];
      }
      setShown(FAIL_TRANSCRIPT.slice(0, clear) + scr);
    }, 55);
    return () => clearInterval(id);
  }, []);

  const mmss = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;

  return (
    <Mock dark>
      <div className="flex items-center justify-between text-xs text-white/55">
        <span>Question 4 of 8</span>
        <span className="rounded-full bg-coral/20 px-2.5 py-1 font-mono font-bold tabular-nums text-coral">
          {mmss}
        </span>
      </div>
      <p className="mt-4 font-serif text-xl font-semibold text-white">Tell me about a time you failed.</p>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 items-end gap-[2.5px]">
            {VBARS.map((b, i) => (
              <motion.span
                key={i}
                className="w-[3px] rounded-full"
                style={{ background: "linear-gradient(to top, var(--primary-bright), #d7fbff)" }}
                initial={{ height: 4 }}
                animate={{ height: [4, b.peak, 6, b.peak * 0.7, 4] }}
                transition={{ duration: b.dur, delay: b.delay, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </span>
          <span className="font-mono text-2xs uppercase tracking-wider text-primary-bright">Listening</span>
        </div>
        <p className="mt-2 min-h-[2.5rem] text-xs leading-relaxed text-white/70">
          {shown}
          <span className="ml-0.5 inline-block animate-pulse text-primary-bright">▌</span>
        </p>
      </div>

      <p className="mt-3 text-xs text-white/45">No scores until the end. No going back.</p>
    </Mock>
  );
}

// Salary + Debrief + Tracker
const AfterVisual = () => (
  <Mock>
    <Label>The pay talk</Label>
    <div className="mt-2.5 flex items-start gap-2">
      <HM />
      <Bubble>We were thinking $65,000 to start. Does that work for you?</Bubble>
    </div>
    <div className="mt-2 flex justify-end">
      <Bubble you>I&apos;m really excited about this. For this role, and what I&apos;m seeing for similar jobs here, I was hoping for $72,000.</Bubble>
    </div>
    <Divider />
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-ink">Mercy Hospital</p>
        <p className="text-xs text-ink-3">Office Manager</p>
      </div>
      <span className="rounded-full bg-sage-soft px-3 py-1 text-sm font-bold text-sage-ink">Offer 🎉</span>
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
    title: "Practice out loud. Get scored.",
    body: "Pick your role. Speak or type your answers. AI scores you on five things, gives one clear fix, and asks follow-ups like a real interviewer.",
    bullets: ["Speak or type, your choice", "Smart follow-up questions", "Scored on 5 things, one fix each"],
    visual: <PracticeVisual />,
    href: "/onboarding",
  },
  {
    eyebrow: "Most popular",
    title: "Your hardest answers, made strong.",
    body: "The gap question. The 'tell me about yourself.' The little words that make you sound unsure. We help you fix all three.",
    bullets: ["3 ready gap answers", "Your 60-second intro", "Catches 'um' and 'I just'"],
    visual: <AnswersVisual />,
    href: "/tools/gap-story",
  },
  {
    eyebrow: "Done for you",
    title: "In-depth research, for your benefit.",
    body: "Give us the company and the job post. We dig up what they do, recent news, and the questions they'll likely ask, so you walk in over-prepared.",
    bullets: ["One-page company brief", "The 5 likely questions", "Smart questions to ask them"],
    visual: <ResearchVisual />,
    href: "/tools/company-research",
  },
  {
    eyebrow: "The night before",
    title: "A real-pressure rehearsal.",
    body: "A timer. No do-overs. No scores until the end. If you hold up here, you're ready for the real thing.",
    bullets: ["60 seconds per answer", "No going back", "See how you held up"],
    visual: <InterviewDayVisual />,
  },
  {
    eyebrow: "After the interview",
    title: "From the offer to the signature.",
    body: "Practice the pay talk so you don't leave money behind. Debrief how the real one went. Track every interview through to the offer.",
    bullets: ["Practice the pay talk", "Debrief the real interview", "Track every interview to the offer"],
    visual: <AfterVisual />,
    href: "/tools/salary",
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
