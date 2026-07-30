import { ArrowRight, Check, CreditCard, ShieldCheck, RefreshCw, Star } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { FlowDiagram } from "@/components/landing/FlowDiagram";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { StickyCTA } from "@/components/landing/StickyCTA";
import { Reveal } from "@/components/ui/Reveal";
import { ScoreRing } from "@/components/ui/Score";
import { ProgressLineChart, MiniBars } from "@/components/charts/Charts";
import { StartFreeButton } from "@/components/ui/StartFreeButton";
import { PricingCards } from "@/components/landing/PricingCards";
import { PLANS, FROM_PER_DAY } from "@/lib/pricing";
import type { Metadata } from "next";

/* Ad landing page. Optimised for cold Meta traffic:
   - No nav bar (single focus, no escape routes)
   - No footer links
   - Message-matched to ads ("practice job interviews", "know your score")
   - Mobile-first (83% of Meta traffic is mobile)
   - Sticky bottom CTA on mobile
   - Sections: Hero → Social proof → Demo → How it works → Data → Pricing → FAQ → Final CTA
   - Everything that doesn't convert is cut */

export const metadata: Metadata = {
  title: "Practice job interviews with AI that scores you | Axon Careers",
  description:
    "Answer real interview questions. Get scored on every answer. Watch your readiness climb. From $0.33 a day.",
};

/* ---- Hero ---- */
const PHOTO_HERO =
  "https://images.unsplash.com/photo-1590650153855-d9e808231d41?auto=format&fit=crop&w=1900&q=80";

function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-8 sm:pt-12">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PHOTO_HERO} alt="" className="h-full w-full object-cover object-[25%_center] [transform:scaleX(-1)]" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(270deg, var(--bg) 0%, var(--bg) 30%, rgba(247,243,233,0.82) 50%, rgba(247,243,233,0.55) 72%, rgba(247,243,233,0.4) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(247,243,233,0.72) 0%, rgba(247,243,233,0.2) 32%, transparent 55%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: "linear-gradient(0deg, var(--bg), transparent)" }} />
      </div>

      <div className="container-wide">
        {/* Logo only — no nav links */}
        <div className="mb-10">
          <Logo />
        </div>

        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            {/* Social proof chip — first thing they see */}
            <Reveal>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} className="fill-amber text-amber" />)}
                <span className="ml-1 text-sm font-medium text-ink-2">Loved by 12,000+ job seekers</span>
              </div>
            </Reveal>

            {/* Headline — message-matched to ads */}
            <Reveal delay={0.06}>
              <h1 className="mt-5 text-balance font-serif text-hero font-semibold text-ink">
                Practice job interviews.
                <br />
                <span style={{ color: "var(--primary-ink)" }}>Get scored.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-6 max-w-prose text-lg leading-relaxed text-ink-2">
                Answer real interview questions out loud or by typing. AI scores every answer and tells you exactly what to fix. Watch your readiness score climb, session after session.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <StartFreeButton size="lg" source="landing_hero" />
                <span className="text-sm text-ink-3">From {FROM_PER_DAY}. Cancel anytime.</span>
              </div>
            </Reveal>
          </div>

          <div className="lg:pl-6">
            <HeroDemo />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---- Problem agitation ---- */
const HARD_QUESTIONS = [
  "Tell me about yourself.",
  "Explain this gap on your resume.",
  "Tell me about a time you failed.",
  "What's your biggest weakness?",
  "Where do you see yourself in five years?",
];

function ProblemSection() {
  return (
    <section className="border-y py-16 sm:py-20" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="container-content">
        <Reveal>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">
            These five questions<br />break most people.
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mx-auto mt-4 max-w-prose text-center text-lg text-ink-2">
            93% of people have felt interview anxiety. 41% say their biggest fear is freezing on a hard question. You&apos;ll rehearse every one until the answer comes naturally.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {HARD_QUESTIONS.map((q, i) => (
            <Reveal key={q} delay={i * 0.04}>
              <div className="flex h-full items-center gap-3.5 rounded-xl border p-4 transition-shadow hover:shadow-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-soft font-mono text-xs font-bold text-amber-ink">{i + 1}</span>
                <p className="font-medium text-ink">&ldquo;{q}&rdquo;</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <div className="mt-8 text-center">
            <StartFreeButton size="lg" source="landing_problem" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---- Demo (the actual product) ---- */
function DemoSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container-wide mb-10 text-center">
        <Reveal>
          <p className="eyebrow mb-4 justify-center">See it work</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="text-balance font-serif text-display font-semibold text-ink">Instant feedback.</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-4 max-w-prose text-lg text-ink-2">
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

/* ---- How it works ---- */
function HowItWorks() {
  return (
    <section className="border-y py-16 sm:py-20" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="container-wide mb-10 text-center">
        <Reveal>
          <p className="eyebrow mb-4 justify-center">How it works</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="font-serif text-display font-semibold text-ink">Three steps.</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-4 max-w-prose text-lg text-ink-2">Five minutes a session. Here is the whole journey.</p>
        </Reveal>
      </div>
      <FlowDiagram />
    </section>
  );
}

/* ---- Data / social proof ---- */
const CLIMB = [
  { label: "S1", score: 48 }, { label: "S2", score: 55 }, { label: "S4", score: 64 },
  { label: "S6", score: 71 }, { label: "S8", score: 76 }, { label: "S10", score: 79 },
];
const FILLER = [
  { label: "Wk 1", value: 6.2 }, { label: "Wk 2", value: 4.4 },
  { label: "Wk 3", value: 3.1 }, { label: "Wk 4", value: 2.1 },
];

function DataSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container-wide">
        <Reveal>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">It works.</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <Reveal>
            <div className="card-elevated h-full p-7">
              <h3 className="font-serif text-lg font-semibold text-ink">Scores climb fast</h3>
              <p className="mt-1 text-sm text-ink-2">Average score over your first 10 sessions.</p>
              <div className="mt-4"><ProgressLineChart data={CLIMB} height={200} showReady={false} /></div>
            </div>
          </Reveal>
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
          <Reveal delay={0.16}>
            <div className="card-elevated h-full p-7">
              <h3 className="font-serif text-lg font-semibold text-ink">Filler words drop</h3>
              <p className="mt-1 text-sm text-ink-2">Average &ldquo;um&rdquo; per answer, over 4 weeks.</p>
              <div className="mt-4"><MiniBars data={FILLER} height={200} /></div>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <div className="mt-8 text-center">
            <StartFreeButton size="lg" source="landing_data" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---- Pricing ---- */
function Pricing() {
  return (
    <section className="border-y py-16 sm:py-20" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="container-wide">
        <Reveal>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">Less than a coffee a day.</h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mx-auto mt-4 max-w-prose text-center text-lg text-ink-2">
            Pick 3 months — that&apos;s about how long a job search runs. Go yearly for the lowest rate, or monthly to land fast.
          </p>
        </Reveal>
        <PricingCards />
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

/* ---- FAQ (trimmed to top objections) ---- */
const FAQS: [string, string][] = [
  ["Can AI really tell if my answer is good?", "Yes, at the things that actually sink interviews. It scores the five a hiring manager weighs: clarity, relevance, specificity, confidence, and conciseness. It catches vagueness, rambling, hedging, and missing results, and explains exactly why, quoting your own words."],
  ["I haven't interviewed in years. Will this work for me?", "That's exactly who it's built for. Questions adjust to how long it's been and ease you in. Returning-to-work, recently-laid-off, and career-changers are the core users here, not 22-year-old engineers."],
  ["Is my practice private?", "Completely private. No profiles, no leaderboards, no posts. It's just you and your screen. Cancelling is two clicks from settings, anytime."],
  ["How does billing work?", "Pick a plan, create an account, and everything unlocks immediately. Cancel anytime in two clicks. No contracts, no surprises."],
  ["Does practicing here actually help in the real room?", "It builds the muscle that holds up under pressure: leading with your point, backing it with specifics, and cutting the filler. You can speak your answers out loud, and the interviewer follows up on what you actually said, the way a real one does."],
];

function FAQ() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container-content">
        <Reveal>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">Questions?</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <FAQAccordion items={FAQS} />
        </Reveal>
      </div>
    </section>
  );
}

/* ---- Final CTA ---- */
function FinalCTA() {
  return (
    <section className="border-t py-20 sm:py-28" style={{ borderColor: "var(--border)" }}>
      <div className="container-content text-center">
        <Reveal>
          <h2 className="text-balance font-serif text-display font-semibold text-ink">Walk in ready.</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-4 max-w-md text-lg text-ink-2">
            Your next interview could change your salary by $20,000+ a year. Five minutes of practice a day is all it takes.
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="mt-8">
            <StartFreeButton size="lg" source="landing_final" label="Start practicing" signedInLabel="Start practicing" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================== PAGE ============================== */
export default function LandingPage() {
  return (
    <>
      {/* No SiteNav — no escape routes. No SiteFooter — single focus. */}
      <main>
        <Hero />
        <ProblemSection />
        <DemoSection />
        <HowItWorks />
        <DataSection />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <StickyCTA />
    </>
  );
}
