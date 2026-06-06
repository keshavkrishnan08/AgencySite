import { ArrowRight, Check, CreditCard, Lock, RefreshCw, ShieldCheck, Briefcase, Sparkles } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { Avatar } from "@/components/ui/Avatar";
import { ProductFeatures } from "@/components/landing/features";
import { FlowDiagram } from "@/components/landing/FlowDiagram";
import { TestimonialMarquee, TestimonialGrid } from "@/components/landing/testimonials";
import { StickyCTA } from "@/components/landing/StickyCTA";
import { Reveal } from "@/components/ui/Reveal";
import { ScoreRing } from "@/components/ui/Score";
import { ProgressLineChart, MiniBars } from "@/components/charts/Charts";
import { AvatarRow } from "@/components/ui/AvatarRow";
import { ButtonLink } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow mb-4 justify-center">{children}</p>;
}

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
              <ButtonLink href="/onboarding" size="lg" className="group">
                Start your first practice, free
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              </ButtonLink>
              <span className="text-sm text-ink-3">No credit card. No account. Takes 30 seconds.</span>
            </div>
          </Reveal>
          <Reveal delay={0.26}>
            <div className="mt-10 flex items-center gap-4">
              <AvatarRow />
              <p className="text-sm text-ink-2">
                <span className="font-semibold text-ink">12,000+ people</span> have practiced with PrepPath
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

/* ===================== EMOTIONAL VALIDATION ===================== */
function NotYourFault() {
  return (
    <section className="border-y" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="container-content py-24 text-center sm:py-32">
        <Reveal>
          <Eyebrow>The truth nobody tells you</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="text-balance font-serif text-display font-semibold text-ink">
            The job market changed. You didn&apos;t do anything wrong.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mx-auto mt-8 max-w-prose space-y-5 text-left text-lg leading-loose text-ink-2">
            <p>
              Today the average job post gets <strong className="text-ink">340 applicants</strong>. Only{" "}
              <strong className="text-ink">2%</strong> get an interview. The wait can stretch{" "}
              <strong className="text-ink">108 days</strong>.
            </p>
            <p>
              You&apos;re up against AI-screened résumés and filters that cut you before a person sees your name.
              The system is stacked. That&apos;s not about your talent. It&apos;s a broken process.
            </p>
            <p>
              And when you do get the interview, <strong className="text-ink">93% of people</strong> feel
              anxious. Not because they&apos;re not good enough. Because they&apos;ve never practiced where
              it&apos;s safe to mess up.
            </p>
            <p className="text-ink">
              That&apos;s PrepPath. A private place to practice until the fear turns into calm. Where a 44 today
              becomes an 82 next week. You&apos;ll see it in real numbers. You&apos;ll prove it to yourself.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ===================== FIVE QUESTIONS ===================== */
const QUESTIONS = [
  {
    q: "Tell me about yourself.",
    pain: "You have 90 seconds to summarize your entire career and it never comes out right. You ramble, forget the important parts, and somehow end up six years in the past wondering why.",
    fix: "Our Story Builder walks you through a 60-second answer that sounds natural, hits the key points, and ends strong. You practice it until it flows like you've said it your whole life.",
  },
  {
    q: "Explain this gap on your résumé.",
    pain: "If you were laid off, it feels like admitting failure. If you took time off for your kids, you worry they'll see you as uncommitted. And the silence while you figure out what to say tells them everything.",
    fix: "The Gap Story Builder frames any gap (layoff, family, health, career change) into a confident 30-second answer that satisfies the interviewer without oversharing. Your gap isn't a flaw. It's a chapter.",
  },
  {
    q: "Tell me about a time you failed.",
    pain: "Admitting failure to a stranger deciding your future feels terrible. Too honest and you look bad. Too polished and you sound fake. You can feel them evaluating you mid-sentence.",
    fix: "AI helps you find the right failure story: real enough to be credible, recovered enough to show growth. You practice until telling it feels natural, not painful.",
  },
  {
    q: "What's your biggest weakness?",
    pain: "Everyone says 'don't say perfectionist' but nobody tells you what to actually say. Every answer feels like a trap built to disqualify you.",
    fix: "PrepPath teaches the only weakness formula that works: a real skill you're actively improving, what you're doing about it, kept to two sentences. Done.",
  },
  {
    q: "Where do you see yourself in five years?",
    pain: "In 2026, predicting five years feels absurd. The honest answer is 'I have no idea, and neither do you,' but that's not what they want to hear.",
    fix: "AI helps you build a forward-looking answer that sounds ambitious without being unrealistic, and aligned with the company without sounding scripted.",
  },
];

function FiveQuestions() {
  return (
    <section className="py-24 sm:py-32">
      <div className="container-content">
        <Reveal>
          <Eyebrow>The five that break people</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">
            Interview anxiety isn&apos;t random. It spikes around five questions.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-prose text-center text-lg text-ink-2">
            93% of people have felt interview anxiety. 41% say their biggest fear is freezing when a hard
            question comes. These are the five that cause it.
          </p>
        </Reveal>

        <div className="mt-14 space-y-5">
          {QUESTIONS.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.05}>
              <article
                className="card overflow-hidden p-0 transition-shadow hover:shadow-lg"
                style={{ borderLeft: "4px solid var(--amber)" }}
              >
                <div className="grid gap-6 p-7 sm:grid-cols-[1.1fr_1fr] sm:p-8">
                  <div>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-soft font-mono text-sm font-bold text-amber-ink">
                        {i + 1}
                      </span>
                      <h3 className="font-serif text-xl font-semibold text-ink">&ldquo;{item.q}&rdquo;</h3>
                    </div>
                    <p className="text-[0.95rem] leading-relaxed text-ink-2">{item.pain}</p>
                  </div>
                  <div className="rounded-xl bg-primary-soft/60 p-5">
                    <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-primary-ink">
                      <Check size={13} /> How PrepPath helps
                    </div>
                    <p className="text-[0.95rem] leading-relaxed text-primary-ink/90">{item.fix}</p>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-12 text-center">
            <ButtonLink href="/onboarding" size="lg">
              Practice all five, free
              <ArrowRight size={18} />
            </ButtonLink>
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
            From nervous to hired, one simple path.
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
            It works, and you can watch it happen.
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
    body: "It's 3 AM. Your interview is at 9. Every answer sounds wrong and you can't call anyone. So you open PrepPath. Five questions. Score hits 78. You close your eyes. You've done this before.",
  },
  {
    tag: "The parking lot",
    name: "Rachel, 41",
    photo: "https://randomuser.me/api/portraits/women/33.jpg",
    body: "You haven't worked since 2021. You chose your kids. Now you're in the parking lot, ten minutes out, hands shaking about the gap. But last night you practiced explaining it nine times. On the tenth, it sounded easy.",
  },
  {
    tag: "The career change",
    name: "James, 45",
    photo: "https://randomuser.me/api/portraits/men/45.jpg",
    body: "You loved teaching. The burnout didn't. Now everyone asks 'why leave education?' and you hear judgment that isn't there. PrepPath helped you find the answer. You practiced twelve times. It sounds true, because it is.",
  },
];

function Stories() {
  return (
    <section className="py-24 sm:py-32">
      <div className="container-wide">
        <Reveal>
          <Eyebrow>For the moments no one sees</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="text-balance text-center font-serif text-display font-semibold text-ink">
            For the moments no one talks about.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
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
  ["Cost", "$150-300 / hour", "$9.99 / month"],
  ["Availability", "Business hours, by appointment", "24/7, including 3 AM"],
  ["Privacy", "Face-to-face, potentially awkward", "Completely private, on your couch"],
  ["Feedback", "Subjective, varies by coach", "Scored on 5 dimensions, consistent"],
  ["Progress tracking", "They might remember last time", "Dashboard with charts and trends"],
  ["Practice sessions", "1 / week at $200", "Unlimited"],
  ["Salary negotiation", "Extra session, extra $200", "Included"],
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
            Less than a coffee a day. More useful than a $200 coach.
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
                PrepPath Premium
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
              <div className="p-5 font-bold text-ink">Total for one month</div>
              <div className="p-5 text-center font-semibold text-ink-2">$600-1,200</div>
              <div className="p-5 text-center font-serif text-xl font-bold text-primary-ink">$9.99</div>
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

/* ===================== PRIVACY ===================== */
function Privacy() {
  return (
    <section className="py-24 sm:py-28">
      <div className="container-content text-center">
        <Reveal>
          <span
            className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-white shadow-sm"
            style={{ background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))" }}
          >
            <ShieldCheck size={28} />
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-7 text-balance font-serif text-3xl font-semibold text-ink">
            Nobody will know you&apos;re practicing.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-prose text-lg leading-relaxed text-ink-2">
            No profiles. No leaderboards. No posts to your contacts. We don&apos;t share your data, and we
            don&apos;t email anyone. It&apos;s just you and your screen. A safe place to be bad at this until
            you&apos;re good. That&apos;s the whole point.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ===================== PRICING ===================== */
const PREMIUM_FEATURES = [
  "Unlimited practice sessions",
  "Full 5-dimension scoring with detailed feedback",
  "Progress dashboard with all charts and analytics",
  "Gap Story Builder with unlimited revisions",
  "Company Research Briefing for any company",
  "Question Predictor for any job posting",
  "Anxiety Detector with filler & hedging tracking",
  "Interview Day timed pressure simulation",
  "Salary Negotiation practice mode",
  "Post-Interview Debrief and scoring",
  "Example 'great answers' for every question",
  "Weekly progress reports by email",
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
            Start free. Upgrade when you&apos;re ready.
          </h2>
        </Reveal>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-2">
          {/* Free */}
          <Reveal>
            <div className="card h-full p-8">
              <h3 className="font-serif text-2xl font-semibold text-ink">Free</h3>
              <p className="mt-1 text-ink-3">$0 forever</p>
              <div className="mt-6 font-serif text-5xl font-semibold text-ink">
                $0<span className="font-sans text-base font-medium text-ink-3"> / month</span>
              </div>
              <ButtonLink href="/onboarding" variant="secondary" className="mt-7 w-full">
                Start free
              </ButtonLink>
              <ul className="mt-7 space-y-3">
                {[
                  "2 practice sessions per week",
                  "Overall score per session",
                  "Basic feedback on each answer",
                  "Gap Story Builder (1 use)",
                  "Your Story builder (1 draft)",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-2">
                    <Check size={17} className="mt-0.5 shrink-0 text-sage" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Premium */}
          <Reveal delay={0.08}>
            <div
              className="relative h-full rounded-2xl border-2 p-8 shadow-xl"
              style={{ borderColor: "var(--primary)", background: "var(--surface)" }}
            >
              <span
                className="absolute -top-3 left-8 rounded-full px-3 py-1 text-2xs font-bold uppercase tracking-wider text-white"
                style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-ink))" }}
              >
                Recommended
              </span>
              <h3 className="font-serif text-2xl font-semibold" style={{ color: "var(--primary-ink)" }}>
                Premium
              </h3>
              <p className="mt-1 text-ink-3">Everything, unlimited</p>
              <div className="mt-6 font-serif text-5xl font-semibold text-ink">
                $9.99<span className="font-sans text-base font-medium text-ink-3"> / month</span>
              </div>
              <p className="mt-1 text-sm text-sage-ink">
                7-day free trial · or $79/year (save 34%) · cancel anytime
              </p>
              <ButtonLink href="/onboarding" className="mt-7 w-full">
                Start free, no card needed
              </ButtonLink>
              <ul className="mt-7 grid gap-3 sm:grid-cols-1">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-2">
                    <Check size={17} className="mt-0.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <p className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-sm text-ink-2">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-sage" /> 7-day free trial</span>
            <span className="inline-flex items-center gap-1.5"><CreditCard size={15} className="text-sage" /> No card to start</span>
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
    <section className="py-28 sm:py-36">
      <div className="container-content text-center">
        <Reveal>
          <h2 className="text-balance font-serif text-display font-semibold text-ink">
            You deserve a job you&apos;re proud of.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-7 max-w-prose text-lg leading-loose text-ink-2">
            Not one you settled for because the interview scared you. The job where you walk in Monday and think:{" "}
            <em className="text-ink">I earned this.</em> PrepPath won&apos;t get it for you. You will. We just
            help you stop fearing the conversation in the way.
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="mt-10 flex flex-col items-center gap-3">
            <ButtonLink href="/onboarding" size="lg" className="group">
              Start practicing, free
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </ButtonLink>
            <span className="text-sm text-ink-3">
              Takes 30 seconds. No account required. You&apos;ve already spent more time thinking about it than it takes to try.
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ===================== TRUST STRIP ===================== */
const TRUST = [
  { icon: CreditCard, label: "No credit card to start" },
  { icon: Lock, label: "Completely private" },
  { icon: RefreshCw, label: "Cancel anytime" },
  { icon: Briefcase, label: "Works for any role" },
];

function TrustStrip() {
  return (
    <div className="border-y" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="container-wide grid grid-cols-2 gap-4 py-6 sm:grid-cols-4">
        {TRUST.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="flex items-center justify-center gap-2.5 text-sm font-medium text-ink-2">
              <Icon size={18} className="text-primary" />
              {t.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== FAQ ===================== */
const FAQS: [string, string][] = [
  [
    "Is it really free to start?",
    "Yes. You can run your first practice with no account and no credit card. You only create an account when you want to save your progress, and you only pay if you upgrade to Premium after the 7-day free trial.",
  ],
  [
    "I haven't interviewed in years. Will this work for me?",
    "That's exactly who PrepPath is built for. We tailor questions to how long it's been and ease you in. Returning-to-work, recently-laid-off, and career-changers are our core users, not 22-year-old engineers.",
  ],
  [
    "Is my practice private?",
    "Completely. No public profiles, no leaderboards, no posting to your social media, no emailing your contacts. It's between you and your screen. A safe place to be bad at something until you're good.",
  ],
  [
    "I'm not techy. Is it complicated?",
    "No. Two actions per screen, plain language, nothing to install. If you can type or talk, you can use it. You can even speak your answers out loud and we'll transcribe them.",
  ],
  [
    "Does practicing typed answers actually help out loud?",
    "It builds the muscle: structure, specifics, and cutting the filler words and 'I just' that leak confidence. You can also speak your answers in the app, and the Interview Day mode rehearses you under real time pressure.",
  ],
  [
    "What if I want to cancel?",
    "Two clicks, anytime, from settings. Most people use PrepPath hard for a couple of weeks, land the job, and pause. That's a win in our book.",
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
            Everything you might be wondering.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2">
          {FAQS.map(([q, a], i) => (
            <Reveal key={q} delay={(i % 2) * 0.06}>
              <div>
                <h3 className="font-serif text-lg font-semibold text-ink">{q}</h3>
                <p className="mt-2 leading-relaxed text-ink-2">{a}</p>
              </div>
            </Reveal>
          ))}
        </div>
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
        <TestimonialMarquee />
        <TrustStrip />
        <HowItWorks />
        <ProductFeatures />
        <Numbers />
        <Stories />
        <NotYourFault />
        <FiveQuestions />
        <Comparison />
        <TestimonialGrid />
        <Privacy />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <SiteFooter />
      <StickyCTA />
    </>
  );
}
