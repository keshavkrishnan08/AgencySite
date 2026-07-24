import { ArrowRight, Check, CreditCard, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { ProductFeatures } from "@/components/landing/features";
import { FlowDiagram } from "@/components/landing/FlowDiagram";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { StickyCTA } from "@/components/landing/StickyCTA";
import { Reveal } from "@/components/ui/Reveal";
import { ScoreRing } from "@/components/ui/Score";
import { ProgressLineChart, MiniBars } from "@/components/charts/Charts";
import { ButtonLink } from "@/components/ui/Button";
import { StartFreeButton } from "@/components/ui/StartFreeButton";
import { PricingCards } from "@/components/landing/PricingCards";
import { PLANS, FROM_PER_DAY } from "@/lib/pricing";

/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow mb-4 justify-center">{children}</p>;
}

const PHOTO_PREP =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1900&q=78";
const PHOTO_HERO =
  "https://images.unsplash.com/photo-1590650153855-d9e808231d41?auto=format&fit=crop&w=1900&q=80";

/* Full-bleed section background photo behind a heavy ivory scrim, so content
   stays readable while the image sets the mood. `tint` picks the base color so
   it blends with whichever section it sits in (ivory vs sunk). */
function SectionBg({ src, tint = "bg" }: { src: string; tint?: "bg" | "sunk" }) {
  const base = tint === "sunk" ? "246,241,230" : "247,243,233";
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: `rgba(${base},0.88)` }} />
      <div
        className="absolute inset-x-0 top-0 h-32"
        style={{ background: `linear-gradient(180deg, rgb(${base}), transparent)` }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{ background: `linear-gradient(0deg, rgb(${base}), transparent)` }}
      />
    </div>
  );
}


/* ============================== HERO ============================== */
function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-14 sm:pt-20">
      {/* Full-bleed hero photograph: a mid-career professional, ready. The scrim
          keeps it firmly in the ivory palette and holds text contrast — the
          image reads through on the right, the copy stays legible on the left. */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        {/* Mirrored so she sits on the LEFT, clear of the demo card on the right.
            The scrim now reads heaviest at the top-left (behind the headline)
            and clears toward her lower body, so text stays legible. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PHOTO_HERO}
          alt=""
          className="h-full w-full object-cover object-[25%_center] [transform:scaleX(-1)]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(270deg, var(--bg) 0%, var(--bg) 30%, rgba(247,243,233,0.82) 50%, rgba(247,243,233,0.55) 72%, rgba(247,243,233,0.4) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(247,243,233,0.72) 0%, rgba(247,243,233,0.2) 32%, transparent 55%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-40"
          style={{ background: "linear-gradient(0deg, var(--bg), transparent)" }}
        />
      </div>
      <div className="container-wide grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Reveal>
            <span className="chip border bg-white/70 text-primary-ink shadow-xs" style={{ borderColor: "var(--border)" }}>
              <Sparkles size={14} /> Land the job. Five minutes a day.
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="mt-6 text-balance font-serif text-hero font-semibold text-ink">
              You&apos;re more ready
              <br />
              than you{" "}
              <span className="relative italic" style={{ color: "var(--primary-ink)" }}>
                think.
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  height="12"
                  viewBox="0 0 200 12"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path
                    d="M2 8C40 3 120 3 198 7"
                    stroke="var(--amber)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-7 max-w-prose text-lg leading-relaxed text-ink-2">
              The interview isn&apos;t the hard part. Not knowing if you&apos;re ready is.
              So practice in private with AI, just five minutes a day. See where you stand,
              and walk in sure. You&apos;ve already done it once.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
<StartFreeButton size="lg" source="hero" />
              <span className="text-sm text-ink-3">From {FROM_PER_DAY}. Cancel anytime.</span>
            </div>
          </Reveal>
        </div>

        <div className="lg:pl-6">
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}


/* ===================== PRODUCT DEMO ===================== */
function DemoSection() {
  return (
    <section className="border-y py-20 sm:py-24" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="container-wide mb-12 text-center">
        <Reveal>
          <Eyebrow>See it work</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">
            Instant feedback.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-prose text-center text-lg text-ink-2">
            This is the actual app. Speak or type your answer, and get a score with one clear fix in seconds.
          </p>
        </Reveal>
      </div>
      <div className="container-wide">
        <Reveal delay={0.12}>
          <ProductDemo />
        </Reveal>
      </div>
    </section>
  );
}

/* ===================== THE HARD FIVE ===================== */
/* Just the questions. The long pain/fix treatment for each made this section
   taller than the rest of the page combined, and people scrolled past it. The
   questions alone land the point faster. */
const HARD_QUESTIONS = [
  "Tell me about yourself.",
  "Explain this gap on your résumé.",
  "Tell me about a time you failed.",
  "What's your biggest weakness?",
  "Where do you see yourself in five years?",
];

function FiveQuestions() {
  return (
    <section className="py-28 sm:py-40">
      <div className="container-content">
        <Reveal>
          <Eyebrow>The hard five</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">
            Prepare for the ones
            <br />
            that break people.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-prose text-center text-lg text-ink-2">
            93% of people have felt interview anxiety. 41% say their biggest fear is freezing on a hard
            question. These are the five that cause it, and you&apos;ll rehearse every one.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-3 sm:grid-cols-2">
          {HARD_QUESTIONS.map((q, i) => (
            <Reveal key={q} delay={i * 0.04}>
              <div
                className="flex h-full items-center gap-3.5 rounded-xl border p-4 transition-shadow hover:shadow-sm"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-soft font-mono text-xs font-bold text-amber-ink">
                  {i + 1}
                </span>
                <p className="font-medium text-ink">&ldquo;{q}&rdquo;</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-10 text-center">
<StartFreeButton size="lg" source="hard_five" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ===================== HOW IT WORKS (flow diagram) ===================== */
function HowItWorks() {
  return (
    <section id="how" className="relative scroll-mt-20 overflow-hidden border-y py-24 sm:py-28" style={{ borderColor: "var(--border)" }}>
      <SectionBg src={PHOTO_PREP} tint="sunk" />
      <div className="container-wide mb-14 text-center">
        <Reveal>
          <Eyebrow>How it works</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mx-auto max-w-2xl text-balance font-serif text-display font-semibold text-ink">
            Three steps.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-4 max-w-prose text-lg text-ink-2">
            Ten minutes a session. Here is the whole journey.
          </p>
        </Reveal>
      </div>
      <FlowDiagram />
    </section>
  );
}

/* ===================== DATA (graphs, not numbers) ===================== */
const CLIMB = [
  { label: "S1", score: 48 },
  { label: "S2", score: 55 },
  { label: "S4", score: 64 },
  { label: "S6", score: 71 },
  { label: "S8", score: 76 },
  { label: "S10", score: 79 },
];
const FILLER = [
  { label: "Wk 1", value: 6.2 },
  { label: "Wk 2", value: 4.4 },
  { label: "Wk 3", value: 3.1 },
  { label: "Wk 4", value: 2.1 },
];

function Numbers() {
  return (
    <section id="proof" className="scroll-mt-20 border-y py-24 sm:py-32" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="container-wide">
        <Reveal>
          <Eyebrow>The data</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">
            It works.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {/* score climb */}
          <Reveal>
            <div className="card-elevated h-full p-7">
              <h3 className="font-serif text-lg font-semibold text-ink">Scores climb fast</h3>
              <p className="mt-1 text-sm text-ink-2">Average score over your first 10 sessions.</p>
              <div className="mt-4">
                <ProgressLineChart data={CLIMB} height={200} showReady={false} />
              </div>
            </div>
          </Reveal>

          {/* confidence ring */}
          <Reveal delay={0.08}>
            <div className="card-elevated flex h-full flex-col p-7">
              <h3 className="font-serif text-lg font-semibold text-ink">Confidence goes up</h3>
              <p className="mt-1 text-sm text-ink-2">Feel more sure after just 5 sessions.</p>
              <div className="flex flex-1 items-center justify-center py-2">
                <ScoreRing value={93} size={180} stroke={14} ringColor="var(--sage)" trackColor="var(--bg-tint)">
                  <div className="text-center">
                    <div className="font-serif text-4xl font-semibold text-sage-ink">93%</div>
                    <div className="mt-1 text-2xs uppercase tracking-wider text-ink-3">feel more sure</div>
                  </div>
                </ScoreRing>
              </div>
            </div>
          </Reveal>

          {/* filler words drop */}
          <Reveal delay={0.16}>
            <div className="card-elevated h-full p-7">
              <h3 className="font-serif text-lg font-semibold text-ink">Filler words drop</h3>
              <p className="mt-1 text-sm text-ink-2">Average &ldquo;um&rdquo; per answer, over 4 weeks.</p>
              <div className="mt-4">
                <MiniBars data={FILLER} height={200} />
              </div>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <p className="mt-8 text-center text-xs text-ink-3">
            Based on internal testing data. Results vary by individual.
          </p>
        </Reveal>
      </div>
    </section>
  );
}


/* ===================== COMPARISON ===================== */
const ROWS: [string, string, string][] = [
  ["Cost", "$150-300 / hour", "$0.33 a day"],
  ["Availability", "Business hours only", "Anytime"],
  ["Privacy", "Face to face", "Completely private"],
  ["Feedback", "Varies by coach", "Scored on 5 dimensions"],
  ["Progress tracking", "They might remember last time", "Percentile, pace and projections"],
  ["Practice sessions", "1 / week at $200", "Unlimited"],
  ["Knowing when you're ready", "A gut feeling", "A number, and a date"],
];

function Comparison() {
  return (
    <section className="border-y py-24 sm:py-32" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="container-content">
        <Reveal>
          <Eyebrow>What you&apos;re really paying for</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">
            Beats a coach.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card-elevated mt-14 overflow-hidden p-0">
            <div className="grid grid-cols-[1.2fr_1fr_1fr] border-b" style={{ borderColor: "var(--border)" }}>
              <div className="p-5" />
              <div className="p-5 text-center text-sm font-semibold text-ink-2">Career coach</div>
              <div
                className="p-5 text-center text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, var(--primary-bright), var(--primary-ink))" }}
              >
                Axon Careers
              </div>
            </div>
            {ROWS.map((r, i) => (
              <div
                key={r[0]}
                className="grid grid-cols-[1.2fr_1fr_1fr] items-center text-sm"
                style={{ background: i % 2 ? "var(--surface-2)" : "transparent" }}
              >
                <div className="p-5 font-semibold text-ink">{r[0]}</div>
                <div className="p-5 text-center text-ink-3">{r[1]}</div>
                <div className="p-5 text-center font-medium text-primary-ink">{r[2]}</div>
              </div>
            ))}
            <div
              className="grid grid-cols-[1.2fr_1fr_1fr] items-center border-t text-sm"
              style={{ borderColor: "var(--border)", background: "var(--primary-soft)" }}
            >
              <div className="p-5 font-bold text-ink">Total for a 3-month search</div>
              <div className="p-5 text-center font-semibold text-ink-2">$1,800-3,600</div>
              <div className="p-5 text-center font-serif text-xl font-bold text-primary-ink">{PLANS.quarterly.price}</div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-8 text-center text-lg text-ink-2">
            One better answer in your interview could be worth the job itself.
          </p>
        </Reveal>
      </div>
    </section>
  );
}


/* ===================== PRICING ===================== */
const PREMIUM_FEATURES = [
  "Unlimited scored mock interviews",
  "All five dimensions, scored on every answer",
  "A real follow-up question after each answer",
  "The Anxiety Detector on every session",
  "Your full metrics: percentile, pace, projections",
  "Estimated time to a top 1% interview",
  "Streaks, milestones and personal records",
  "Question Predictor for any job posting",
  "Practice the predicted questions, scored",
  "Gap Story Builder with unlimited revisions",
  "Example 'great answers' for every question",
  "Speak your answers, with delivery metrics",
];

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-y py-24 sm:py-32" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="container-wide">
        <Reveal>
          <Eyebrow>Simple pricing</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">
            Pick your plan.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-5 max-w-prose text-center text-lg text-ink-2">
            Most people pick 3 months, because that&apos;s about how long a search runs. Go yearly for the
            lowest rate, or monthly if you expect to land fast.
          </p>
        </Reveal>

        <PricingCards />

        {/* Everything included, on every plan */}
        <Reveal delay={0.1}>
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border p-7" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="text-center text-sm font-semibold text-ink">Everything included, on every plan</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-2">
                  <Check size={17} className="mt-0.5 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-sm text-ink-2">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-sage" /> Private & secure</span>
            <span className="inline-flex items-center gap-1.5"><CreditCard size={15} className="text-sage" /> Secure checkout via Stripe</span>
            <span className="inline-flex items-center gap-1.5"><RefreshCw size={15} className="text-sage" /> Cancel in two clicks</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ===================== FINAL CTA ===================== */
function FinalCTA() {
  return (
    <section className="py-32 sm:py-44">
      <div className="container-content text-center">
        <Reveal>
          <h2 className="text-balance font-serif text-display font-semibold text-ink">
            Walk in ready.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-7 max-w-prose text-lg leading-loose text-ink-2">
            Not one you settled for because the interview scared you. The job where you walk in Monday and think:{" "}
            <em className="text-ink">I earned this.</em> Axon Careers won&apos;t get it for you. You will. We just
            help you stop fearing the conversation in the way.
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="mt-10 flex flex-col items-center gap-3">
<StartFreeButton size="lg" source="final_cta" />
            <span className="text-sm text-ink-3">
              From {FROM_PER_DAY}. Cancel anytime. You&apos;ve already spent more time thinking about it than it takes to try.
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ===================== FAQ ===================== */
const FAQS: [string, string][] = [
  [
    "Can AI really tell if my answer is good?",
    "Yes, at the things that actually sink interviews. It scores the five a hiring manager weighs: clarity, relevance, specificity, confidence, and conciseness. It catches vagueness, rambling, hedging, and missing results, and explains exactly why, quoting your own words. It's not a substitute for human chemistry in the room, but it's a sharp, honest read on the substance of what you said.",
  ],
  [
    "Is the scoring consistent, or does it change every time?",
    "Consistent. The rubric and settings are fixed, so the same answer gets the same score every session. Retake a question and the number only moves when your answer actually changes, which is how you can see real progress instead of noise.",
  ],
  [
    "What if it mishears me when I speak?",
    "It grades what you said, not how the transcript looks. Missing punctuation, capitalization, and homophones like 'their' and 'there' are ignored. You're never penalized for a speech-to-text slip, only for things a listener would actually notice.",
  ],
  [
    "Is this just generic interview advice?",
    "No. Every question and every fix is tailored to your exact role, company, situation, and the gap on your résumé. A generic, could-be-anyone answer is treated as a miss, because in a real interview it is one.",
  ],
  [
    "Does practicing here actually help in the real room?",
    "It builds the muscle that holds up under pressure: leading with your point, backing it with specifics, and cutting the filler and 'I just' that leak confidence. You can speak your answers out loud, and the interviewer follows up on what you actually said, the way a real one does.",
  ],
  [
    "I haven't interviewed in years. Will this work for me?",
    "That's exactly who it's built for. Questions adjust to how long it's been and ease you in. Returning-to-work, recently-laid-off, and career-changers are the core users here, not 22-year-old engineers.",
  ],
  [
    "How does billing work?",
    "Answer a few quick questions, create an account, and pick a plan: $18.97 a month, or $49.97 for three months, which works out to $16.66 a month. We picked three months because that's roughly how long a job search runs. You're charged right away, everything unlocks immediately, and you can cancel anytime in two clicks.",
  ],
  [
    "What do the metrics actually tell me?",
    "Where you stand and how fast you're moving. Your readiness score, the percentile it puts you in, your points-per-session pace, and a projected date for reaching a top 1% interview based on that pace. Plus streaks, per-skill trends, and the Anxiety Detector tracking your filler words down over time. It's the part people come back for.",
  ],
  [
    "Is my practice private, and can I cancel easily?",
    "Completely private: no profiles, no leaderboards, no posts, no emailing your contacts. It's just you and your screen. And cancelling is two clicks from settings, anytime.",
  ],
];

function FAQ() {
  return (
    <section className="border-t py-24 sm:py-28" style={{ borderColor: "var(--border)" }}>
      <div className="container-content">
        <Reveal>
          <Eyebrow>Questions, answered</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">
            Got questions?
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <FAQAccordion items={FAQS} />
        </Reveal>
      </div>
    </section>
  );
}

/* ============================== PAGE ============================== */
export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <DemoSection />
        <HowItWorks />
        <ProductFeatures />
        <FiveQuestions />
        <Numbers />
        <Comparison />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <SiteFooter />
      <StickyCTA />
    </>
  );
}
