import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Star,
  Mic,
  TrendingUp,
  UserRound,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Lock,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Avatar } from "@/components/ui/Avatar";
import { AvatarRow } from "@/components/ui/AvatarRow";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { StartSticky } from "@/components/landing/StartSticky";

/* Dedicated ad landing page. Single purpose: turn cold Meta traffic into a
   first practice session. Tighter than the full marketing site, one CTA
   everywhere, problem-focused, mobile-first. */

export const metadata: Metadata = {
  title: "Practice your interview in private",
  description:
    "Haven't interviewed in years? Practice with a private AI coach, five minutes a day, and walk in sure. Just $9.99/month.",
  openGraph: {
    title: "You're more ready than you think.",
    description:
      "A private place to practice your interview until the fear turns into calm. Just $9.99/month.",
  },
  robots: { index: false }, // ad destination, not for organic search
};

const CTA = "/onboarding";

/* Compact proof set — concrete before/after beats adjectives. */
const PROOF = [
  {
    quote: "I hadn't interviewed in six years. My score went from 44 to 81. I got the job.",
    name: "Rachel M.",
    role: "Office Manager",
    photo: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    quote: "It caught how many times I said 'um.' I had no idea. Two weeks later, gone.",
    name: "David K.",
    role: "Operations Lead",
    photo: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    quote: "The gap question used to wreck me. Now I have an answer I actually believe.",
    name: "Priya N.",
    role: "Account Manager",
    photo: "https://randomuser.me/api/portraits/women/44.jpg",
  },
];

const STEPS = [
  {
    n: "01",
    icon: UserRound,
    title: "Tell us your situation",
    body: "Returning to work, laid off, switching careers, or going for the promotion. We tailor every question to your exact job.",
  },
  {
    n: "02",
    icon: Mic,
    title: "Practice out loud",
    body: "Real interview questions. Speak your answer like the real thing. We listen for filler words, pace, and confidence.",
  },
  {
    n: "03",
    icon: TrendingUp,
    title: "Watch your score climb",
    body: "Scored on five dimensions with one specific fix each time. A 44 today becomes an 82 next week, in real numbers.",
  },
];

const ASSURANCES = [
  { icon: ShieldCheck, label: "Cancel anytime" },
  { icon: Lock, label: "Completely private" },
  { icon: Smartphone, label: "Works on your phone" },
  { icon: CreditCard, label: "Cancel anytime" },
];

function Stars({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-0.5 ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={15} className="fill-gold text-gold" />
      ))}
    </div>
  );
}

export default function StartPage() {
  return (
    <main className="relative overflow-hidden">
      {/* Stripped header — logo only. No nav links: zero leaks off the funnel. */}
      <header className="container-wide flex items-center justify-between py-5">
        <Logo href={null} size={30} />
        <span className="chip hidden bg-sage-soft text-sage-ink sm:inline-flex">
          <Star size={13} className="fill-sage-ink" /> $9.99/month
        </span>
      </header>

      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="container-wide grid items-center gap-12 pb-10 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-20 lg:pt-10">
        <div>
          <Reveal>
            <span className="eyebrow">For people who haven&apos;t interviewed in years</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-5 text-balance font-serif text-hero font-semibold leading-[1.04] text-ink">
              Walk into your next interview{" "}
              <span className="relative whitespace-nowrap">
                already sure.
                <svg
                  className="absolute -bottom-1.5 left-0 w-full"
                  height="10"
                  viewBox="0 0 200 10"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 7C50 3 150 3 198 6"
                    stroke="var(--amber)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              If it&apos;s been years, the nerves aren&apos;t the problem. Not knowing where you stand
              is. Practice in private with an AI coach, just five minutes a day, and watch your score
              climb before the real thing.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-col items-start gap-3">
              <ButtonLink href={CTA} size="lg" className="w-full sm:w-auto">
                Get started <ArrowRight size={18} />
              </ButtonLink>
              <p className="text-sm font-medium text-ink-3">
                $9.99/mo. Cancel anytime.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-8 flex items-center gap-3">
              <AvatarRow />
              <div className="text-sm">
                <div className="flex items-center gap-1.5">
                  <Stars />
                  <span className="font-semibold text-ink">4.9</span>
                </div>
                <span className="text-ink-3">12,000+ people have practiced here</span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Product visual — shows it's real and it works */}
        <Reveal delay={0.1} y={28}>
          <HeroDemo />
        </Reveal>
      </section>

      {/* ───────────────────────── REFRAME (tight) ───────────────────────── */}
      <section className="container-content py-16 text-center sm:py-20">
        <Reveal>
          <span className="eyebrow justify-center">It&apos;s not just you</span>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance font-serif text-display font-semibold leading-tight text-ink">
            The market got harder. You didn&apos;t get worse.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
            The average job post now draws <strong className="text-ink">340 applicants</strong>. Just{" "}
            <strong className="text-ink">2% get the call</strong>. No wonder{" "}
            <strong className="text-ink">93% of people feel anxious</strong> before an interview. Not
            because they aren&apos;t good enough. Because they&apos;ve never had a safe place to
            practice.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-6 font-serif text-xl font-semibold text-primary-ink">This is that place.</p>
        </Reveal>
      </section>

      {/* ───────────────────────── THE PROCESS (centerpiece, glass) ───────────────────────── */}
      <section className="relative py-4">
        <div className="container-wide">
          <div
            className="relative overflow-hidden rounded-[28px] px-6 py-14 shadow-xl sm:px-12 sm:py-16"
            style={{ background: "linear-gradient(150deg, #19a9b8 0%, #14808e 52%, #0c5660 120%)" }}
          >
            {/* ambient orbs */}
            <div
              className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
              style={{ background: "radial-gradient(circle, #ffffff88, transparent)" }}
            />
            <div
              className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full opacity-30 blur-3xl"
              style={{ background: "radial-gradient(circle, #ffe0a688, transparent)" }}
            />

            <div className="relative text-center">
              <Reveal>
                <span className="eyebrow justify-center text-white/80">How it works</span>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="mx-auto mt-4 max-w-2xl text-balance font-serif text-display font-semibold leading-tight text-white">
                  Three steps. Five minutes. Real calm.
                </h2>
              </Reveal>
            </div>

            <div className="relative mt-12 grid gap-5 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 0.08} y={24}>
                  <div className="glass-card h-full rounded-2xl p-7">
                    <div className="flex items-center justify-between">
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg"
                        style={{
                          background: "linear-gradient(140deg, rgba(255,255,255,0.35), rgba(255,255,255,0.12))",
                        }}
                      >
                        <s.icon size={22} />
                      </span>
                      <span className="font-mono text-sm font-semibold text-white/55">{s.n}</span>
                    </div>
                    <h3 className="mt-5 font-serif text-xl font-semibold text-white">{s.title}</h3>
                    <p className="mt-2.5 text-[0.95rem] leading-relaxed text-white/80">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.1}>
              <div className="relative mt-10 flex justify-center">
                <span className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-primary-ink">
                  <TrendingUp size={15} /> Repeat until your score says you&apos;re ready
                </span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────────────────────── PROOF (compact) ───────────────────────── */}
      <section className="container-wide py-16 sm:py-24">
        <Reveal>
          <p className="eyebrow justify-center">Real people, real interviews</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance text-center font-serif text-display font-semibold text-ink">
            They walked in nervous. They walked out hired.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PROOF.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.07}>
              <figure className="card flex h-full flex-col p-6">
                <Stars />
                <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-ink">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <figcaption className="mt-5 flex items-center gap-3">
                  <Avatar src={t.photo} name={t.name} size={44} className="ring-2 ring-white" />
                  <div>
                    <div className="text-sm font-semibold text-ink">{t.name}</div>
                    <div className="text-xs text-ink-3">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────────────────── SAFETY / OBJECTION ───────────────────────── */}
      <section className="container-content pb-4 text-center">
        <Reveal>
          <h2 className="mx-auto max-w-xl text-balance font-serif text-2xl font-semibold text-ink sm:text-3xl">
            Nobody will know you&apos;re practicing.
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mx-auto mt-4 max-w-lg text-ink-2">
            No profiles. No leaderboards. No posts to your contacts. Just you and your screen. A safe
            place to be bad at this until you&apos;re good.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mx-auto mt-7 flex max-w-xl flex-wrap justify-center gap-2.5">
            {ASSURANCES.map((a) => (
              <span key={a.label} className="chip">
                <a.icon size={14} /> {a.label}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ───────────────────────── FINAL CTA ───────────────────────── */}
      <section className="container-wide py-16 sm:py-24">
        <div
          className="relative overflow-hidden rounded-[28px] px-6 py-16 text-center shadow-xl sm:px-12 sm:py-20"
          style={{ background: "linear-gradient(150deg, #0c5660 0%, #14808e 60%, #19a9b8 130%)" }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #ffe0a688, transparent)" }}
          />
          <Reveal>
            <h2 className="mx-auto max-w-2xl text-balance font-serif text-display font-semibold leading-tight text-white">
              You&apos;re more ready than you think. Prove it.
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mx-auto mt-5 max-w-md text-lg text-white/85">
              Your next interview is coming. Spend five minutes getting ready tonight.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-9 flex flex-col items-center gap-3">
              <Link
                href={CTA}
                className="glass inline-flex items-center gap-2 rounded-full px-9 py-4 text-base font-semibold shadow-xl"
                style={{ color: "var(--primary-ink)" }}
              >
                Get started <ArrowRight size={18} />
              </Link>
              <p className="text-sm text-white/70">$9.99/mo. Cancel anytime.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* slim footer */}
      <footer className="container-wide border-t py-8" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-ink-3 sm:flex-row">
          <Logo href="/" size={24} />
          <p>Axon Careers is an AI practice tool, not a guarantee of employment.</p>
        </div>
      </footer>

      <StartSticky />
    </main>
  );
}
