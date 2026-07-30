import { ArrowRight, Check, CreditCard, ShieldCheck, RefreshCw, Star, Mic, TrendingUp, Target } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { StickyCTA } from "@/components/landing/StickyCTA";
import { Reveal } from "@/components/ui/Reveal";
import { StartFreeButton } from "@/components/ui/StartFreeButton";
import { PricingCards } from "@/components/landing/PricingCards";
import type { Metadata } from "next";

/* Brett playbook landing page structure:
   1. Hero — outcome headline + social proof + CTA + product preview
   2. Free hook — the product working (ProductDemo)
   3. How it works — 3 steps, scannable
   4. Social proof — testimonial-style results
   5. Pricing — anchored against cost of not acting
   6. FAQ — kill top 4 objections
   7. Final CTA

   Rules:
   - No nav (zero escape routes)
   - Single CTA everywhere ("Start free")
   - Mobile-first (83% of Meta traffic)
   - Sticky bottom CTA on mobile
   - Every section either builds desire or kills an objection */

export const metadata: Metadata = {
  title: "Walk into your next interview ready | Axon Careers",
  description: "Practice real interview questions. Get scored. Know exactly what to fix. Start free.",
};

/* ================================================================== */
/*  1. HERO                                                            */
/* ================================================================== */
function Hero() {
  return (
    <section className="relative overflow-hidden pb-12 pt-6 sm:pb-16 sm:pt-10">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1590650153855-d9e808231d41?auto=format&fit=crop&w=1900&q=80"
          alt="" className="h-full w-full object-cover object-[25%_center] [transform:scaleX(-1)]"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(270deg, var(--bg) 0%, var(--bg) 30%, rgba(247,243,233,0.85) 50%, rgba(247,243,233,0.6) 72%, rgba(247,243,233,0.45) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(247,243,233,0.75) 0%, rgba(247,243,233,0.2) 32%, transparent 55%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: "linear-gradient(0deg, var(--bg), transparent)" }} />
      </div>

      <div className="container-wide">
        <div className="mb-8"><Logo /></div>

        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            {/* Social proof — first line */}
            <Reveal>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} className="fill-amber text-amber" />)}
                <span className="ml-1 text-sm font-medium text-ink-2">12,000+ job seekers</span>
              </div>
            </Reveal>

            {/* Headline — the outcome they want */}
            <Reveal delay={0.06}>
              <h1 className="mt-4 font-serif text-[2.8rem] font-semibold leading-[1.1] text-ink sm:text-[3.5rem]">
                Know your interview
                <br />
                score <span className="italic" style={{ color: "var(--primary-ink)" }}>before</span> you
                <br />
                walk in.
              </h1>
            </Reveal>

            {/* One line — what it does */}
            <Reveal delay={0.12}>
              <p className="mt-5 max-w-md text-lg text-ink-2">
                AI asks you real interview questions, scores every answer, and tells you exactly what to fix. Five minutes.
              </p>
            </Reveal>

            {/* CTA */}
            <Reveal delay={0.18}>
              <div className="mt-7">
                <StartFreeButton size="lg" source="landing_hero" label="Start free — no card required" />
              </div>
            </Reveal>
          </div>

          {/* Product preview — the score card */}
          <Reveal delay={0.1}>
            <div className="lg:pl-4">
              <HeroDemo />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  2. FREE HOOK — the product actually working                        */
/* ================================================================== */
function FreeHook() {
  return (
    <section className="border-y py-12 sm:py-16" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="container-wide mb-8 text-center">
        <Reveal>
          <p className="eyebrow mb-3 justify-center">Try it right now</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="font-serif text-display font-semibold text-ink">See your score in 30 seconds.</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-3 max-w-md text-ink-2">
            Type an answer below. Watch the AI score it instantly.
          </p>
        </Reveal>
      </div>
      <div className="container-wide">
        <Reveal delay={0.12}>
          <ProductDemo />
        </Reveal>
      </div>
      <Reveal delay={0.1}>
        <div className="mt-8 text-center">
          <StartFreeButton size="lg" source="landing_hook" label="Start free" />
        </div>
      </Reveal>
    </section>
  );
}

/* ================================================================== */
/*  3. HOW IT WORKS — 3 steps, scannable                               */
/* ================================================================== */
function HowItWorks() {
  const steps = [
    { icon: Target, title: "1. Pick your role", desc: "Tell us what job you're going for. We tailor every question to it." },
    { icon: Mic, title: "2. Answer out loud", desc: "Speak or type. The AI scores clarity, relevance, specificity, confidence, and conciseness." },
    { icon: TrendingUp, title: "3. Watch your score climb", desc: "Practice daily. See your readiness number go up session after session." },
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="container-content">
        <Reveal>
          <h2 className="text-center font-serif text-display font-semibold text-ink">Three steps. Five minutes.</h2>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--primary-soft)" }}>
                  <s.icon size={22} className="text-primary-ink" />
                </div>
                <h3 className="mt-4 font-serif text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-2">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  4. SOCIAL PROOF — results, not testimonials                        */
/* ================================================================== */
function SocialProof() {
  const results = [
    { stat: "68 → 84", label: "Average score jump in the first week" },
    { stat: "93%", label: "Feel more confident after 5 sessions" },
    { stat: "3x", label: "People who practice out loud get offers faster" },
  ];

  return (
    <section className="border-y py-12 sm:py-16" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="container-content">
        <div className="grid gap-6 sm:grid-cols-3">
          {results.map((r, i) => (
            <Reveal key={r.label} delay={i * 0.08}>
              <div className="text-center">
                <p className="font-serif text-4xl font-semibold" style={{ color: "var(--primary-ink)" }}>{r.stat}</p>
                <p className="mt-2 text-sm text-ink-2">{r.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  5. PRICING — anchored against cost of NOT acting                   */
/* ================================================================== */
function Pricing() {
  return (
    <section className="py-12 sm:py-16">
      <div className="container-wide">
        <Reveal>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">
            One better answer could be worth the job.
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mx-auto mt-3 max-w-md text-center text-ink-2">
            A 30-minute interview can change your salary by $20,000+ a year.
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
/*  6. FAQ — kill the top 4 objections                                 */
/* ================================================================== */
const FAQS: [string, string][] = [
  ["Can AI really score my interview answers?", "Yes. It scores the five things hiring managers actually weigh: clarity, relevance, specificity, confidence, and conciseness. It catches vague answers, filler words, and missing examples — and tells you exactly what to fix."],
  ["I haven't interviewed in years.", "That's who this is for. Questions adjust to your experience level. Career changers, parents returning to work, and people who got laid off are the core users — not 22-year-old engineers."],
  ["Is it private?", "Completely. No profiles, no leaderboards, no social. Just you and your screen. Cancel anytime in two clicks."],
  ["Does it actually help in the real interview?", "It builds the muscle that holds up under pressure: leading with your point, backing it with numbers, and cutting the filler words you don't hear yourself say. You practice out loud, and it follows up like a real interviewer would."],
];

function FAQ() {
  return (
    <section className="border-t py-12 sm:py-16" style={{ borderColor: "var(--border)" }}>
      <div className="container-content">
        <Reveal>
          <h2 className="text-center font-serif text-display font-semibold text-ink">Questions?</h2>
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
    <section className="py-16 sm:py-20">
      <div className="container-content text-center">
        <Reveal>
          <h2 className="font-serif text-display font-semibold text-ink">Walk in ready.</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-3 max-w-sm text-ink-2">
            Five minutes a day. That's the difference between nervous and ready.
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="mt-7">
            <StartFreeButton size="lg" source="landing_final" label="Start free — no card required" signedInLabel="Start free" />
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
      <main>
        <Hero />
        <FreeHook />
        <HowItWorks />
        <SocialProof />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <StickyCTA />
    </>
  );
}
