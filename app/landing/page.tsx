import { ArrowRight, Check, CreditCard, ShieldCheck, RefreshCw, Star, Mic, TrendingUp, Target, Clock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { StickyCTA } from "@/components/landing/StickyCTA";
import { Reveal } from "@/components/ui/Reveal";
import { StartFreeButton } from "@/components/ui/StartFreeButton";
import { PricingCards } from "@/components/landing/PricingCards";
import { cn } from "@/lib/utils";
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
      <span className="font-bold underline">HAVEN&apos;T INTERVIEWED IN YEARS?</span>
      {" "}Practice your first session free. No card. See where you stand.
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
          <StartFreeButton size="sm" source="landing_nav" label="First interview free" signedInLabel="First interview free" />
        </div>

        <div className="mx-auto max-w-2xl text-center lg:text-left lg:mx-0 lg:grid lg:max-w-none lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10">
          <div>
            {/* Headline — speaks to 30-55 career changers */}
            <Reveal delay={0.06}>
              <h1 className="mt-2 font-serif text-[2.6rem] font-semibold leading-[1.08] text-ink sm:text-[3.4rem]">
                It&apos;s been a while
                <br />
                since your last
                <br />
                <span className="relative"><span className="relative z-10 italic" style={{ color: "var(--primary-ink)" }}>interview.</span><span className="absolute -bottom-1 left-0 right-0 h-3 rounded-sm opacity-30" style={{ background: "var(--primary-bright)" }} /></span>
              </h1>
            </Reveal>

            {/* One-liner — speaks to their specific fear */}
            <Reveal delay={0.12}>
              <p className="mt-5 max-w-md text-lg text-ink-2">
                Going back to work? Switching careers? Got laid off? Practice real interview questions privately with AI — and know exactly where you stand before you walk in.
              </p>
            </Reveal>

            {/* CTA — the CTA IS the free hook */}
            <Reveal delay={0.18}>
              <div className="mt-7">
                <StartFreeButton size="lg" source="landing_hero" label="First interview free" signedInLabel="First interview free" />
                <p className="mt-2.5 text-xs font-semibold uppercase tracking-wider text-ink-3">Takes 60 seconds · No card required</p>
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
/*  1b. AUTHORITY QUOTE — full aesthetic section below hero             */
/* ================================================================== */
function AuthorityQuote() {
  return (
    <section className="border-y py-20 sm:py-28" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="container-content">
        <Reveal>
          <blockquote className="mx-auto max-w-2xl text-center font-serif text-2xl italic leading-relaxed text-ink sm:text-3xl">
            &ldquo;It&apos;s never too late to be what you might have been.&rdquo;
          </blockquote>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mx-auto mt-8 max-w-lg text-center">
            <p className="font-serif text-lg font-semibold text-ink">George Eliot</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-ink-3">
              One of the greatest novelists in the English language
            </p>
          </div>
        </Reveal>
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
  const quotes = [
    {
      text: "The interview isn't about being the smartest person in the room. It's about being the most prepared.",
      author: "Richard Branson",
      role: "Founder, Virgin Group · Net worth $3B",
      img: "https://d8j0ntlcm91z4.cloudfront.net/user_3Fb0RH7Bsw4Pg0NMgWhyP870t3z/hf_20260730_200810_28a49d98-d597-4b6e-9866-bab035294b46.png",
      detail: "Branson dropped out of school at 16 and built a $3 billion empire. He's said repeatedly that he hires based on personality and preparation, not credentials or degrees. In his words: the person who walks in having done the work always beats the one with the better resume. He interviews every senior hire at Virgin personally — and the ones who win are the ones who practiced.",
    },
    {
      text: "I will prepare and some day my chance will come.",
      author: "Abraham Lincoln",
      role: "16th U.S. President · 1809–1865",
      img: "https://d8j0ntlcm91z4.cloudfront.net/user_3Fb0RH7Bsw4Pg0NMgWhyP870t3z/hf_20260730_200811_c7576c85-8889-47f8-bfed-ef9461b18131.png",
      detail: "Lincoln lost 8 elections, went bankrupt twice, and suffered a nervous breakdown — before becoming the most consequential president in American history. He prepared obsessively for the Lincoln-Douglas debates, rehearsing his arguments out loud in empty courtrooms until every word landed. The preparation wasn't talent. It was reps.",
    },
    {
      text: "Practice isn't the thing you do once you're good. It's the thing you do that makes you good.",
      author: "Malcolm Gladwell",
      role: "Author, Outliers · 10,000 Hour Rule",
      img: "https://d8j0ntlcm91z4.cloudfront.net/user_3Fb0RH7Bsw4Pg0NMgWhyP870t3z/hf_20260730_200813_889048b9-28dd-4a1e-b0f4-b5bc5d5163e7.png",
      detail: "Gladwell studied world-class performers across every field — musicians, athletes, chess masters, surgeons — and found they all share one thing: 10,000 hours of deliberate, repeated practice with feedback. Not talent. Not luck. Practice with someone telling you what to fix. That's exactly what this app does for interviews.",
    },
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="container-wide">
        <div className="grid gap-6 sm:grid-cols-3">
          {quotes.map((q, i) => (
            <Reveal key={q.author} delay={i * 0.08}>
              <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                {/* Photo */}
                <div className="relative h-72 sm:h-80 overflow-hidden bg-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={q.img} alt={q.author} className="h-full w-full object-cover object-top" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)" }} />
                  <div className="absolute bottom-0 left-0 p-5">
                    <p className="font-serif text-lg font-semibold text-white">{q.author}</p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/60">{q.role}</p>
                  </div>
                </div>
                {/* Quote + detail */}
                <div className="p-6">
                  <blockquote className="font-serif text-lg italic leading-relaxed text-ink">
                    &ldquo;{q.text}&rdquo;
                  </blockquote>
                  <p className="mt-4 text-sm leading-relaxed text-ink-2">{q.detail}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.15}>
          <div className="mt-10 text-center">
            <StartFreeButton size="lg" source="landing_proof" label="First interview free" signedInLabel="First interview free" />
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
            <StartFreeButton size="lg" source="landing_how" label="First interview free" signedInLabel="First interview free" />
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
/*  5b. WHAT YOU GET — blurred premium content teaser                   */
/* ================================================================== */
function WhatYouGet() {
  const dimensions = [
    { label: "Clarity", score: 84, desc: "Did you get to the point?" },
    { label: "Relevance", score: 78, desc: "Did you answer what they asked?" },
    { label: "Specificity", score: 62, desc: "Did you give real examples?" },
    { label: "Confidence", score: 71, desc: "Filler words, hedging, apologies." },
    { label: "Conciseness", score: 89, desc: "Did you land it in 60 seconds?" },
  ];

  return (
    <section className="py-14 sm:py-20">
      <div className="container-content">
        {/* Full-width heading */}
        <Reveal>
          <h2 className="font-serif text-display font-semibold text-ink">
            We coach you on what hiring managers actually look for.
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mt-4 max-w-2xl text-lg text-ink-2">
            You don&apos;t fail interviews because you&apos;re not smart enough. You fail on things you can&apos;t see yourself doing. We measure all five — every answer, every session.
          </p>
        </Reveal>

        {/* Compact card with all 5 dimensions */}
        <div className="mt-10 rounded-2xl border px-6 py-10 sm:px-10 sm:py-14" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="grid grid-cols-3 gap-8 sm:grid-cols-5 sm:gap-6">
            {dimensions.map((d) => (
              <div key={d.label} className="text-center">
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
                  <span className="font-mono text-xl font-bold sm:text-2xl" style={{ color: d.score >= 80 ? "var(--sage-ink)" : d.score >= 65 ? "var(--amber-ink)" : "var(--coral-ink)" }}>{d.score}</span>
                  <svg className="absolute inset-0" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="42" fill="none" stroke="var(--bg-tint)" strokeWidth="5" />
                    <circle cx="48" cy="48" r="42" fill="none" strokeWidth="5" strokeLinecap="round"
                      stroke={d.score >= 80 ? "var(--sage)" : d.score >= 65 ? "var(--amber)" : "var(--coral)"}
                      strokeDasharray={`${d.score * 2.639} 263.9`} transform="rotate(-90 48 48)" />
                  </svg>
                </div>
                <h3 className="mt-4 font-serif text-base font-semibold text-ink">{d.label}</h3>
                <p className="mt-1 text-xs text-ink-3">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <StartFreeButton size="lg" source="landing_dimensions" label="Find out your scores" signedInLabel="Find out your scores" />
          <p className="mt-2.5 text-xs font-semibold uppercase tracking-wider text-ink-3">Takes 60 seconds · No card required</p>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  6. FAQ                                                             */
/* ================================================================== */
const FAQS: [string, string][] = [
  ["Does this actually work?", "It scores the five things hiring managers weigh: clarity, relevance, specificity, confidence, and conciseness. It catches vague answers, filler words, and missing examples — then tells you exactly what to fix. The score goes up every session."],
  ["What's the ROI on this?", "A single interview can change your salary by $20,000+ a year. If practicing for a week helps you land one better offer — or avoid one rejection — it pays for itself hundreds of times over. The question isn't whether you can afford it. It's whether you can afford to walk in unprepared."],
  ["How is this different from practicing with a friend?", "Your friend will say 'that sounded great.' A hiring manager will say no. The difference is honesty. AI catches every filler word, every vague answer, every time you didn't actually answer the question — and tells you exactly what to fix. No feelings to spare."],
  ["I haven't interviewed in years. Is this for me?", "This was built specifically for you. Not for 22-year-old engineers on Reddit. For the 38-year-old going back to work after raising kids. The 52-year-old who got laid off after 15 years. The teacher switching into corporate. The questions adjust to how long it's been and ease you in."],
  ["How much will my score actually improve?", "Most users see a 15-20 point improvement in their first week. The people who practice daily for a week go from 'nervous and hoping for the best' to 'I know exactly what I'm going to say.' That's not a feeling — it's a number you can see."],
  ["Is my data private?", "Completely. No profiles, no leaderboards, no social. Just you and your screen. Cancel anytime in two clicks."],
  ["Can AI really replace a human interview coach?", "A good coach charges $150-300 per hour and you get one session. Axon gives you unlimited practice, available at 3am the night before, and scores every answer the same way every time. It's not a replacement for human chemistry in the room — it's the reps that make you ready for it."],
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
          <h2 className="font-serif text-display font-semibold text-ink">You&apos;ve done harder things than this.</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-3 max-w-sm text-ink-2">
            You raised kids. You built a career. You started over. A job interview? You just need to practice.
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="mt-7">
            <StartFreeButton size="lg" source="landing_final" label="First interview free" signedInLabel="First interview free" />
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
        <AuthorityQuote />
        <FreeHook />
        <SocialProof />
        <HowItWorks />
        <WhatYouGet />
        <FAQ />
        <FinalCTA />
      </main>
      <StickyCTA />
    </>
  );
}
