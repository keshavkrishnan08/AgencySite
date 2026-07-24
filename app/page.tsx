import { ArrowRight, Check, CreditCard, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { Avatar } from "@/components/ui/Avatar";
import { ProductFeatures } from "@/components/landing/features";
import { FlowDiagram } from "@/components/landing/FlowDiagram";
import { TestimonialCarousel } from "@/components/landing/testimonials";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { StickyCTA } from "@/components/landing/StickyCTA";
import { Reveal } from "@/components/ui/Reveal";
import { ScoreRing } from "@/components/ui/Score";
import { ProgressLineChart, MiniBars } from "@/components/charts/Charts";
import { AvatarRow } from "@/components/ui/AvatarRow";
import { ButtonLink } from "@/components/ui/Button";
import { StartFreeButton } from "@/components/ui/StartFreeButton";
import { PLANS, priceParts } from "@/lib/pricing";
import { perDayLabel } from "@/lib/roi";

/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow mb-4 justify-center">{children}</p>;
}

/* Two real photographs, hotlinked from Unsplash (same approach the testimonial
   avatars already use). Chosen for the actual audience: mid-career, warm
   natural light, no glossy 22-year-olds in a white startup office. Plain <img>
   rather than next/image because remote domains would need
   images.remotePatterns in next.config, and a broken hero photo is a worse
   trade than an unoptimised one. */
function Photo({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-lg ${className ?? ""}`}
      style={{ borderColor: "var(--border)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

const PHOTO_PEERS =
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1400&q=75";
const PHOTO_PREP =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=75";


/* ============================== HERO ============================== */
function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-14 sm:pt-20">
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
              <span className="text-sm text-ink-3">From $16.66/mo. Cancel anytime.</span>
            </div>
          </Reveal>
          <Reveal delay={0.26}>
            <div className="mt-10 flex items-center gap-4">
              <AvatarRow />
              <p className="text-sm text-ink-2">
                <span className="font-semibold text-ink">12,000+ people</span> have practiced with Axon Careers
              </p>
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
    <section id="how" className="scroll-mt-20 border-y py-24 sm:py-28" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
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
      <div className="container-wide">
        <Reveal delay={0.1}>
          <Photo
            src={PHOTO_PREP}
            alt="People preparing at a table with laptops"
            className="mx-auto mt-16 aspect-[16/6] max-w-4xl"
          />
        </Reveal>
      </div>
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

/* ===================== STORIES ===================== */
const STORIES = [
  {
    tag: "The 3 AM panic",
    name: "Maria, 38",
    photo: "https://randomuser.me/api/portraits/women/90.jpg",
    body: "It was 3 AM and my interview was at 9. Every answer in my head sounded wrong and there was no one I could call. I was so stressed out I felt sick. So I opened Axon Careers and ran through five questions. I hit a 78. I finally closed my eyes thinking, okay. I've actually done this before.",
  },
  {
    tag: "The parking lot",
    name: "Rachel, 41",
    photo: "https://randomuser.me/api/portraits/women/33.jpg",
    body: "I hadn't worked since 2021. I stayed home with my kids, and I'd make that choice again. But there I was in the parking lot, ten minutes out, hands shaking about the gap. The night before, I'd practiced explaining it nine times. On the tenth, it finally came out easy.",
  },
  {
    tag: "The career change",
    name: "James, 45",
    photo: "https://randomuser.me/api/portraits/men/45.jpg",
    body: "I loved teaching. The burnout is what broke me. Everyone kept asking 'why leave education?' and I heard judgment that probably wasn't even there. I practiced my answer twelve times. Now it comes out true, because it is.",
  },
];

function Stories() {
  return (
    <section className="py-28 sm:py-40">
      <div className="container-wide">
        <Reveal>
          <Eyebrow>For the moments no one sees</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">
            Real moments.
          </h2>
        </Reveal>

        <Reveal delay={0.08}>
          <Photo
            src={PHOTO_PEERS}
            alt="Two colleagues in their forties celebrating at a desk"
            className="mx-auto mt-14 aspect-[16/7] max-w-4xl"
          />
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {STORIES.map((s, i) => (
            <Reveal key={s.tag} delay={i * 0.1}>
              <figure className="card h-full p-7">
                <div className="flex items-center gap-3">
                  <Avatar src={s.photo} name={s.name} size={48} className="ring-2 ring-white" />
                  <div>
                    <div className="text-sm font-semibold text-ink">{s.name}</div>
                    <div className="text-xs font-medium text-primary-ink">{s.tag}</div>
                  </div>
                </div>
                <p className="mt-4 leading-relaxed text-ink-2">{s.body}</p>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===================== COMPARISON ===================== */
const ROWS: [string, string, string][] = [
  ["Cost", "$150-300 / hour", "$16.66 / month"],
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
  const q = PLANS.quarterly;
  const mo = PLANS.monthly;
  const [qD, qC] = priceParts("quarterly");
  const [mD, mC] = priceParts("monthly");
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
            The average job search takes about three months. So we sell three months, not a year you
            hope you won&apos;t need.
          </p>
        </Reveal>

        <div className="mx-auto mt-16 grid max-w-3xl gap-6 sm:grid-cols-2">
          {/* 3 months — the plan that matches how long a search takes */}
          <Reveal delay={0.08}>
            <div
              className="relative flex h-full flex-col rounded-2xl border-2 p-8 shadow-xl"
              style={{ borderColor: "var(--primary)", background: "var(--surface)" }}
            >
              <span
                className="absolute -top-3 left-8 rounded-full px-3 py-1 text-2xs font-bold uppercase tracking-wider text-white"
                style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-ink))" }}
              >
                Save {q.savePct}%
              </span>
              <h3 className="font-serif text-xl font-semibold" style={{ color: "var(--primary-ink)" }}>
                3 months
              </h3>
              <p className="mt-1.5 text-sm text-ink-2">{q.pitch}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-serif text-2xl font-semibold text-ink-3">$</span>
                <span className="font-serif text-6xl font-semibold leading-none text-ink">{qD}</span>
                <span className="font-serif text-2xl font-semibold text-ink-3">.{qC}</span>
              </div>
              <p className="mt-2 text-sm text-ink-3">
                Billed once every 3 months
              </p>
              <p className="mt-1 text-sm font-semibold text-sage-ink">
                {perDayLabel("quarterly")} a day · {q.perMonth}
              </p>

              <ul className="mt-6 space-y-2.5 border-t pt-6" style={{ borderColor: "var(--border)" }}>
                {["Unlimited scored mock interviews", "Your full metrics and projections", "Both prep builders"].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <StartFreeButton className="mt-auto w-full !mt-7" size="md" source="pricing_quarterly" showArrow={false} />
            </div>
          </Reveal>

          {/* Monthly */}
          <Reveal delay={0.14}>
            <div
              className="relative flex h-full flex-col rounded-2xl border-2 p-8 shadow-lg"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <h3 className="font-serif text-xl font-semibold text-ink">Monthly</h3>
              <p className="mt-1.5 text-sm text-ink-2">{mo.pitch}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-serif text-2xl font-semibold text-ink-3">$</span>
                <span className="font-serif text-6xl font-semibold leading-none text-ink">{mD}</span>
                <span className="font-serif text-2xl font-semibold text-ink-3">.{mC}</span>
              </div>
              <p className="mt-2 text-sm text-ink-3">Billed monthly</p>
              <p className="mt-1 text-sm font-medium text-ink-2">
                {perDayLabel("monthly")} a day · cancel anytime
              </p>

              <ul className="mt-6 space-y-2.5 border-t pt-6" style={{ borderColor: "var(--border)" }}>
                {["Unlimited scored mock interviews", "Your full metrics and projections", "Both prep builders"].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <StartFreeButton variant="secondary" className="mt-auto w-full !mt-7" size="md" source="pricing_monthly" showArrow={false} />
            </div>
          </Reveal>
        </div>

        {/* Everything included, on both plans */}
        <Reveal delay={0.1}>
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border p-7" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="text-center text-sm font-semibold text-ink">Everything included, on both plans</p>
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
              From $16.66/mo. Cancel anytime. You&apos;ve already spent more time thinking about it than it takes to try.
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
        <TestimonialCarousel />
        <DemoSection />
        <Stories />
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
