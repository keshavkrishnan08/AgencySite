import { ArrowRight, Check, CreditCard, ShieldCheck, RefreshCw, Star, Mic, TrendingUp, Target, Clock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { StickyCTA } from "@/components/landing/StickyCTA";
import { Reveal } from "@/components/ui/Reveal";
import { StartFreeButton } from "@/components/ui/StartFreeButton";
import { PricingCards } from "@/components/landing/PricingCards";
import type { Metadata } from "next";

/* Landing page modeled on Brett Malinowski's Monad structure:
   0. Urgency banner
   1. Authority quote + headline + CTA (the CTA IS the free hook)
   2. Free hook demo (product working)
   3. Social proof (stats, not testimonials)
   4. How it works (3 steps)
   5. Pricing (simple, anchored)
   6. FAQ (kill objections)
   7. Final CTA */

export const metadata: Metadata = {
  title: "Walk into your next interview ready | Axon Careers",
  description: "Practice real interview questions. Get scored. Know exactly what to fix. Start free.",
};

/* ================================================================== */
/*  0. URGENCY BANNER                                                  */
/* ================================================================== */
function Banner() {
  return (
    <div className="w-full px-4 py-2.5 text-center text-xs font-semibold tracking-wider sm:text-sm" style={{ background: "linear-gradient(90deg, #0c5660, #14808e)", color: "white" }}>
      <span className="font-bold underline">PRACTICE YOUR FIRST SESSION FREE.</span>
      {" "}No card. AI scores every answer. See where you stand in 5 minutes.
    </div>
  );
}

/* ================================================================== */
/*  1. HERO — authority quote + outcome headline + CTA                 */
/* ================================================================== */
function Hero() {
  return (
    <section className="relative overflow-hidden pb-10 pt-6 sm:pb-14 sm:pt-8">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://images.unsplash.com/photo-1590650153855-d9e808231d41?auto=format&fit=crop&w=1900&q=80" alt="" className="h-full w-full object-cover object-[25%_center] [transform:scaleX(-1)]" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(270deg, var(--bg) 0%, var(--bg) 30%, rgba(247,243,233,0.85) 50%, rgba(247,243,233,0.6) 72%, rgba(247,243,233,0.45) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(247,243,233,0.75) 0%, rgba(247,243,233,0.2) 32%, transparent 55%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: "linear-gradient(0deg, var(--bg), transparent)" }} />
      </div>

      <div className="container-wide">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <StartFreeButton size="sm" source="landing_nav" label="Start free →" />
        </div>

        <div className="mx-auto max-w-2xl text-center lg:text-left lg:mx-0 lg:grid lg:max-w-none lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10">
          <div>
            {/* Authority quote — instant credibility */}
            <Reveal>
              <blockquote className="font-serif text-lg italic text-ink-2 sm:text-xl">
                &ldquo;By failing to prepare, you are preparing to fail.&rdquo;
              </blockquote>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-ink-3">Benjamin Franklin</p>
            </Reveal>

            {/* Headline — the outcome, not the feature */}
            <Reveal delay={0.06}>
              <h1 className="mt-7 font-serif text-[2.6rem] font-semibold leading-[1.08] text-ink sm:text-[3.4rem]">
                Know your interview
                <br />
                score <span className="relative"><span className="relative z-10 italic" style={{ color: "var(--primary-ink)" }}>before</span><span className="absolute -bottom-1 left-0 right-0 h-3 rounded-sm opacity-30" style={{ background: "var(--primary-bright)" }} /></span> you
                <br />
                walk in.
              </h1>
            </Reveal>

            {/* One-liner */}
            <Reveal delay={0.12}>
              <p className="mt-5 max-w-md text-lg text-ink-2">
                AI asks you real interview questions, scores every answer, and tells you exactly what to fix. The blueprint for walking in ready.
              </p>
            </Reveal>

            {/* CTA — the CTA IS the free hook */}
            <Reveal delay={0.18}>
              <div className="mt-7">
                <StartFreeButton size="lg" source="landing_hero" label="Get My Free Practice Session →" />
                <p className="mt-2.5 text-xs font-semibold uppercase tracking-wider text-ink-3">Takes 5 minutes · No card required</p>
              </div>
            </Reveal>
          </div>

          {/* Product preview */}
          <Reveal delay={0.1}>
            <div className="mt-10 lg:mt-0 lg:pl-4">
              <HeroDemo />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  2. FREE HOOK — product working live                                */
/* ================================================================== */
function FreeHook() {
  return (
    <section className="border-y py-12 sm:py-16" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="container-wide mb-8 text-center">
        <Reveal>
          <p className="eyebrow mb-3 justify-center">See it work</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="font-serif text-display font-semibold text-ink">Type an answer. Get scored instantly.</h2>
        </Reveal>
      </div>
      <div className="container-wide">
        <Reveal delay={0.1}>
          <ProductDemo />
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  3. SOCIAL PROOF — stats that prove it works                        */
/* ================================================================== */
function SocialProof() {
  const stats = [
    { stat: "68 → 84", label: "Average score jump in one week" },
    { stat: "93%", label: "Feel more confident after 5 sessions" },
    { stat: "3x", label: "Faster to an offer with practice" },
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="container-content">
        <Reveal>
          <h2 className="text-center font-serif text-display font-semibold text-ink">It works. Here&apos;s the data.</h2>
        </Reveal>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="text-center">
                <p className="font-serif text-5xl font-semibold" style={{ color: "var(--primary-ink)" }}>{s.stat}</p>
                <p className="mt-2 text-sm text-ink-2">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.15}>
          <div className="mt-10 text-center">
            <StartFreeButton size="lg" source="landing_proof" label="Get My Free Practice Session →" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  4. HOW IT WORKS — 3 steps                                         */
/* ================================================================== */
function HowItWorks() {
  const steps = [
    { num: "01", icon: Target, title: "Tell us your role", desc: "Product manager, nurse, teacher — we tailor every question to the job you're going for." },
    { num: "02", icon: Mic, title: "Answer real questions", desc: "Speak or type. AI scores clarity, relevance, specificity, confidence, and conciseness." },
    { num: "03", icon: TrendingUp, title: "Watch your score climb", desc: "Your readiness number goes up every session. You'll know exactly when you're ready." },
  ];

  return (
    <section className="border-y py-12 sm:py-16" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="container-content">
        <Reveal>
          <p className="eyebrow mb-3 justify-center text-center">How it works</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="text-center font-serif text-display font-semibold text-ink">Your Role. Your Questions. Your Score.</h2>
        </Reveal>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div className="flex flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, var(--primary-bright), var(--primary-ink))" }}>
                  {s.num}
                </span>
                <h3 className="mt-4 font-serif text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 max-w-xs text-sm text-ink-2">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.15}>
          <div className="mt-10 text-center">
            <StartFreeButton size="lg" source="landing_how" label="Start free →" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  5. PRICING                                                         */
/* ================================================================== */
function Pricing() {
  return (
    <section className="py-12 sm:py-16">
      <div className="container-wide">
        <Reveal>
          <p className="eyebrow mb-3 justify-center text-center">Pricing</p>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">Full access.</h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mx-auto mt-2 max-w-md text-center text-ink-2">
            Everything Axon offers, from your first reading on.
          </p>
        </Reveal>
        <PricingCards />
        <Reveal delay={0.1}>
          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-sm text-ink-2">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-sage" /> Private & secure</span>
            <span className="inline-flex items-center gap-1.5"><CreditCard size={15} className="text-sage" /> Stripe checkout</span>
            <span className="inline-flex items-center gap-1.5"><RefreshCw size={15} className="text-sage" /> Cancel in two clicks</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  6. FAQ                                                             */
/* ================================================================== */
const FAQS: [string, string][] = [
  ["Does this actually work?", "It scores the five things hiring managers weigh: clarity, relevance, specificity, confidence, and conciseness. It catches vague answers, filler words, and missing examples — then tells you exactly what to fix. The score goes up every session."],
  ["I haven't interviewed in years.", "That's who this is for. Career changers, parents going back to work, people who got laid off. Not 22-year-old engineers."],
  ["Is my data private?", "Completely. No profiles, no leaderboards, no social. Just you and your screen. Cancel anytime in two clicks."],
  ["How fast is my reading?", "Your first practice session takes about 5 minutes. You get scored instantly after each answer. Most people see a real improvement after 3-5 sessions."],
  ["Can I cancel anytime?", "Yes. Two clicks from settings. No contracts, no phone calls, no retention tricks."],
];

function FAQ() {
  return (
    <section className="border-t py-12 sm:py-16" style={{ borderColor: "var(--border)" }}>
      <div className="container-content">
        <Reveal>
          <p className="eyebrow mb-3 justify-center text-center">Questions</p>
          <h2 className="text-center font-serif text-display font-semibold text-ink">Asked and answered.</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <FAQAccordion items={FAQS} />
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  7. FINAL CTA                                                       */
/* ================================================================== */
function FinalCTA() {
  return (
    <section className="py-16 sm:py-20" style={{ background: "var(--bg-sunk)" }}>
      <div className="container-content text-center">
        <Reveal>
          <h2 className="font-serif text-display font-semibold text-ink">Stop guessing if you&apos;re ready.</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-3 max-w-sm text-ink-2">
            Your next interview is coming. The window to prepare before you walk in is right now.
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="mt-7">
            <StartFreeButton size="lg" source="landing_final" label="Get My Free Practice Session →" signedInLabel="Start free" />
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
      <Banner />
      <main>
        <Hero />
        <FreeHook />
        <SocialProof />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <StickyCTA />
    </>
  );
}
