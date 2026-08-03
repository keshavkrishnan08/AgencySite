import Image from 'next/image';
import { Footer, Nav } from '@/components/Chrome';
import { Accordion, AnnouncementBar, Cta, Tabs } from '@/components/ui';
import { BRAND, FEATURES, PRICING } from '@/lib/brand';
import { getEntitlement } from '@/lib/entitlement';

export default async function LandingPage() {
  const ent = await getEntitlement();
  return (
    <>
      {/* Bar and nav pin together as one block, as on the reference: the offer
          stays on screen for the whole scroll rather than vanishing at 40px. */}
      <div className="sticky top-0 z-[60]">
        <AnnouncementBar lead={`${PRICING.trialDays} days of full access, free.`}>
          No card. Your chart-aware advisor, on the house.
        </AnnouncementBar>
        <Nav authed={Boolean(ent.userId)} />
      </div>
      <main id="main">
        <Hero />
        <TitansBand />
        <ArgumentBand />
        <HowItWorks />
        <Pricing />
        <InsideBand />
        <Faq />
        <CloseBand />
      </main>
      <Footer />
    </>
  );
}

/* ------------------------------------------------------------- 1. Hero */

/** Each word animates in individually, as on the reference. */
function Headline() {
  const words = ['Find', 'the', 'business'];
  const rest = ['were', 'built', 'for'];
  return (
    <h1 className="mx-auto mt-9 max-w-[820px] text-balance text-[42px] leading-[1.04] tracking-[-0.018em] sm:text-[60px] sm:leading-[1.04] lg:text-[80px] lg:leading-[1.04]">
      {words.map((w, i) => (
        <span key={w} className="inline-block animate-word-in" style={{ animationDelay: `${i * 70}ms` }}>
          {w}&nbsp;
        </span>
      ))}
      <span className="u-you inline-block animate-word-in" style={{ animationDelay: '210ms' }}>
        you
      </span>
      &nbsp;
      {rest.map((w, i) => (
        <span key={w} className="inline-block animate-word-in" style={{ animationDelay: `${(i + 4) * 70}ms` }}>
          {/* No trailing space on the last word — the brass full stop must sit
              flush against it, not float away from the sentence. */}
          {w}
          {i < rest.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
      <span className="text-brass">.</span>
    </h1>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-[72px] pt-10 text-center sm:px-8">
      <div aria-hidden className="hero-glow" />
      <Wheel />
      <div className="relative mx-auto max-w-[1060px]">
        <p className="mx-auto max-w-[520px] font-serif text-[17px] italic leading-[1.55] text-ink/72 sm:text-[18px]">
          &ldquo;Millionaires don&rsquo;t use astrology, billionaires do.&rdquo;
        </p>
        <p className="eyebrow mt-4">J.P. Morgan</p>

        <Headline />

        <p className="mx-auto mt-6 max-w-[640px] text-pretty text-[17.5px] leading-[1.7] text-ink/72">
          The reason your last venture stalled, the pattern behind every bad hire,
          and the week you should have launched instead — it&rsquo;s all in your chart.
          60 seconds to see what&rsquo;s been holding you back.
        </p>

        <div className="mt-7">
          <Cta modal location="hero" className="w-full sm:w-auto">
            See What&rsquo;s Holding You Back <span aria-hidden>→</span>
          </Cta>
        </div>

        <p className="eyebrow mt-4">Free · 60 seconds · No card</p>

        <div className="mt-9 inline-flex items-center">
          {/* Initials rather than stock faces: invented headshots would be a
              fabricated testimonial, and these read as people either way. */}
          <span className="avatar-stack mr-3" aria-hidden>
            {['M', 'P', 'D', 'A'].map((c) => <span key={c}>{c}</span>)}
          </span>
          <span
            className="inline-flex items-center gap-2.5 rounded-full border px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-brass-deep"
            style={{ borderColor: 'rgba(154,123,63,0.45)' }}
          >
            <span className="font-bold text-ledger-mid" aria-hidden>✓</span>
            Computed using live NASA data
          </span>
        </div>
      </div>
    </section>
  );
}

/** Slowly rotating zodiac wheel. Decorative only. */
function Wheel() {
  return (
    <div
      aria-hidden
      // Off-centre and left-hung, as on the reference: a centred wheel reads as
      // a watermark, an off-centre one reads as light falling across the page.
      className="pointer-events-none absolute -left-[280px] top-[58%] -z-10 h-[640px] w-[640px] -translate-y-1/2 opacity-[0.30] sm:-left-[320px] sm:h-[760px] sm:w-[760px]"
    >
      <svg viewBox="0 0 400 400" className="h-full w-full animate-drift">
        <g stroke="#c2a05b" fill="none" strokeWidth="0.5">
          <circle cx="200" cy="200" r="196" />
          <circle cx="200" cy="200" r="170" />
          <circle cx="200" cy="200" r="118" />
          <circle cx="200" cy="200" r="72" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            return (
              <line key={i} x1={200 + 72 * Math.cos(a)} y1={200 + 72 * Math.sin(a)}
                    x2={200 + 196 * Math.cos(a)} y2={200 + 196 * Math.sin(a)} />
            );
          })}
          {Array.from({ length: 72 }).map((_, i) => {
            const a = (i * 5 * Math.PI) / 180;
            return (
              <line key={`t${i}`} x1={200 + 170 * Math.cos(a)} y1={200 + 170 * Math.sin(a)}
                    x2={200 + 196 * Math.cos(a)} y2={200 + 196 * Math.sin(a)} strokeWidth="0.3" />
            );
          })}
        </g>
      </svg>
    </div>
  );
}

/* ----------------------------------------------------------- 2. Titans */

const TITANS = [
  {
    img: '/titans/jp-morgan.jpg',
    name: 'J.P. Morgan',
    credential: 'The most powerful banker in American history · 1837–1913',
    stat: 'Net worth · ≈ $2.1 billion today',
    // Per-image framing, measured off the reference: each portrait's face sits
    // at a different height in the source crop.
    position: '50% 15%',
    body: 'He bailed out the U.S. government twice, and from 1899 quietly consulted astrologer Evangeline Adams on how the heavens would move the markets. The line attributed to him says it plainly: “Millionaires don\u2019t use astrology, billionaires do.”',
  },
  {
    img: '/titans/ronald-reagan.jpg',
    name: 'Ronald Reagan',
    credential: '40th President of the United States · 1911–2004',
    stat: null,
    position: '50% 22%',
    body: 'Not ancient history. Reagan\u2019s own chief of staff wrote in his memoir that “virtually every major move and decision” in the Reagan White House was cleared in advance with an astrologer in San Francisco. Her color-coded calendars shaped the schedule of the most powerful office on earth, for 7 years.',
  },
  {
    img: '/titans/augustus.jpg',
    name: 'Augustus Caesar',
    credential: 'First Emperor of Rome · 63 BC–14 AD',
    stat: null,
    position: '50% 20%',
    body: 'The man who built the Roman Empire\u2019s economy didn\u2019t hide his chart. He published his horoscope publicly and minted his sign, Capricorn, onto silver coins circulated across the known world. The most powerful executive in history used astrology as strategy and as brand.',
  },
];

function TitansBand() {
  return (
    <section className="band">
      <div className="band-inner">
        <div className="text-center">
          <p className="eyebrow">For over 2,000 years</p>
          <h2 className="band-h mt-4">
            The quiet edge behind the people who built empires.
          </h2>
          <p className="mx-auto mt-6 max-w-measure text-base leading-relaxed text-ink/72">
            Used to make key decisions, time the market, and keep an edge over
            the competition. Emperors, bankers, and presidents ran on it quietly.
            Here are three.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {TITANS.map((t) => (
            <article
              key={t.name}
              className="flex flex-col overflow-hidden border bg-[#fbf8f1]"
              style={{ borderColor: 'rgba(154,123,63,0.35)' }}
            >
              {/* Portrait flush to the card's top edge, square corners. */}
              <div className="relative aspect-[325/275] w-full">
                <Image
                  src={t.img}
                  alt={t.name}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  style={{
                    objectFit: 'cover',
                    objectPosition: t.position,
                    filter: 'grayscale(1) sepia(0.24) contrast(1.05) brightness(0.88)',
                  }}
                />
              </div>

              <div className="flex flex-1 flex-col px-6 pb-7 pt-6">
                <h3 className="font-serif text-[22px] font-medium">{t.name}</h3>
                <p className="mt-2.5 font-mono text-[10px] uppercase leading-[1.6] tracking-label text-brass-deep sm:text-[11px]">
                  {t.credential}
                </p>
                {t.stat && (
                  <p className="mt-2.5 font-mono text-[10px] uppercase leading-[1.6] tracking-label text-ledger-mid sm:text-[11px]">
                    {t.stat}
                  </p>
                )}
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink/72">{t.body}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-12 max-w-measure text-center font-serif text-2xl font-light leading-snug">
          They kept a private astrologer on retainer. You need your exact birth
          details and 60 seconds.
        </p>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- 3. Argument */

function ArgumentBand() {
  return (
    <section className="band bg-ledger/[0.03]">
      <div className="band-inner">
        <div className="text-center">
          <p className="eyebrow">One system. Every decision.</p>
          <h2 className="band-h mt-4">
            Same effort. Different weeks. Wildly different results.
          </h2>
        </div>

        <div className="essay mx-auto mt-10 max-w-[680px] space-y-6">
          <p>
            You&rsquo;ve noticed it. The pitch that closed in ten minutes in March
            gets ghosted in April. A launch you built for months flops, then some
            throwaway post takes off. You sleep a full eight hours, eat clean,
            train, and the brain fog still rolls in on a random Tuesday like
            weather. Most people blame themselves and think they just need to
            grind harder. History&rsquo;s sharpest operators knew better: they
            treated the swings as data, and paid handsomely for someone who could
            read it.
          </p>
          <p>
            Your birth chart is that read, calculated from the exact minute you
            were born. It shows which weeks are built for being seen, so you
            launch when attention comes easy. Which days favor the close, so you
            make the ask when the other side is ready to move. When the writing
            and creative work will pour out of you, and when the highest-leverage
            move is rest: build nothing, decide nothing, recover.
          </p>
          <p>
            It also shows the pattern behind your worst stretches, the moments you
            force calls you later unwind, and what pulls you back into flow. The
            same for the people you deal with: what your cofounder needs to hear,
            how your boss handles pressure, when to walk into the room. There are
            larger currents moving through your weeks whether you track them or
            not. You can grind against the tide, or you can read it and move with
            it. Stop guessing at timing. Start operating on it.
          </p>
        </div>

        <div className="mt-9 text-center">
          <Cta modal location="argument">
            Start operating on it <span aria-hidden>→</span>
          </Cta>
          <p className="eyebrow mt-4">Takes 60 seconds · No card required</p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------ 4. How it works */

function HowItWorks() {
  const steps = [
    ['Step 1', 'Enter your birth data', 'Takes 60 seconds. Date, time, place.'],
    ['Step 2', `${BRAND.name} reads your chart`, 'Archetype, strengths, blind spots, timing.'],
    ['Step 3', 'Make your move', 'A clear call on who you are and when to act.'],
  ];
  return (
    <section id="how-it-works" className="band">
      <div className="band-inner text-center">
        <p className="eyebrow">How it works</p>
        <h2 className="band-h mt-4">
          Your Birth Data. Your Reading. Your Move.
        </h2>

        <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
          {steps.map(([n, title, body]) => (
            <div key={n} className="step-card">
              <span className="step-badge">{n}</span>
              <h3 className="mt-4 font-serif text-[22px] font-medium">{title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink/65">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Cta modal location="how">
            Start free <span aria-hidden>→</span>
          </Cta>
          <p className="eyebrow mt-4">Computed using live NASA data</p>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- 5. Pricing */

function Pricing() {
  return (
    <section id="pricing" className="band">
      <div className="band-inner text-center">
        <p className="eyebrow">Pricing</p>
        <h2 className="band-h mt-4">Full access.</h2>
        <p className="mx-auto mt-5 max-w-measure text-[17px] leading-relaxed text-ink/72">
          Everything {BRAND.name}, from your first reading on.
        </p>

        {/* One card: plan rows, CTA, trust line, then the feature list — the
            reference's structure. Everything the decision needs is inside a
            single frame instead of scattered down the band. */}
        <div className="card-lg mx-auto mt-11 max-w-[560px] text-left">
          <div className="space-y-3">
            {([PRICING.weekly, PRICING.annual] as const).map((p, i) => (
              <div key={p.label} className={`plan-row ${i === 0 ? 'plan-row-on' : ''}`}>
                <span
                  className={`absolute -top-3 right-4 whitespace-nowrap rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
                    i === 0 ? 'bg-ledger-mid text-paper' : 'bg-[#fbf8f1] text-brass-deep'
                  }`}
                >
                  {p.badge}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
                  {p.label}
                </span>
                <span className="font-serif text-[24px]">
                  {p.amount}
                  <span className="font-sans text-[13px] text-ink/55">{p.cadence}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Cta modal location="pricing" className="w-full">
              Read your chart free <span aria-hidden>→</span>
            </Cta>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2">
            {[`${PRICING.trialDays}-day free trial`, 'No charge during trial', 'Cancel anytime'].map((t) => (
              <span key={t} className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
                <span className="font-bold text-ledger-mid" aria-hidden>✓</span> {t}
              </span>
            ))}
          </div>

          <ul
            className="mt-7 grid gap-x-[22px] gap-y-3.5 border-t pt-[26px] sm:grid-cols-2"
            style={{ borderColor: 'rgba(154,123,63,0.3)' }}
          >
            {FEATURES.map(([title, body]) => (
              <li key={title}>
                <p className="flex items-baseline gap-1.5 text-[14px] font-semibold">
                  <span className="shrink-0 font-bold text-ledger-mid" aria-hidden>✓</span>
                  {title}
                </p>
                <p className="mt-0.5 pl-[19px] text-[13.5px] leading-[1.45] text-ink/60">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------- 6. Inside the reading */

const TABS = [
  { key: 'career', label: 'Career',
    body: 'Your public work points toward partnership: you close best in rooms of two, not ten. Structure the company so the final conversation is always yours to have.' },
  { key: 'timing', label: 'Timing',
    body: 'Your chart favors visible moves early in the cycle: launch and announce while momentum is cheap, and hold the big asks for the windows when the other side is ready to move.' },
  { key: 'decisions', label: 'Decisions',
    body: 'Your first read is right more often than your third. Long deliberation is where you talk yourself out of the correct call. Cap the diligence, then decide with what you have.' },
  { key: 'blind', label: 'Blind Spots',
    body: 'You take risks in the one area you should be conservative, and play safe where you have the most edge. Most people around you have noticed. Nobody has said it.' },
];

function InsideBand() {
  return (
    <section className="band bg-ledger/[0.03]">
      <div className="band-inner">
        <div className="text-center">
          <p className="eyebrow">Inside the reading</p>
          <h2 className="band-h mt-4">
            See what your reading covers.
          </h2>
        </div>
        <div className="mx-auto mt-10 max-w-3xl">
          <Tabs tabs={TABS} />
          <div className="mt-9 text-center">
            <Cta modal location="inside">
              Get my full reading <span aria-hidden>→</span>
            </Cta>
            <p className="eyebrow mt-4">Free · Drawn from your own birth data</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- 7. FAQ */

const FAQ = [
  { q: 'Does this actually work?',
    a: <p>The math does, provably: your chart is computed astronomically from your exact birth moment, and every calculation is shown. The interpretation is where 2,000 years of craft comes in, and the reading either describes you with unsettling accuracy or it doesn&rsquo;t. It&rsquo;s free to test, so the experiment costs you sixty seconds.</p> },
  { q: 'How is this different from a horoscope app?',
    a: <p>A horoscope app gives everyone born in the same month the same paragraph. {BRAND.name} computes your full chart from your exact birth minute and place, reads it against your actual goals, and applies it to business: your archetype, your blind spots, your timing windows, and an advisor you can question.</p> },
  { q: 'I don’t believe in astrology.',
    a: <p>You don&rsquo;t have to. Read it the way Morgan did: as one more instrument. The math is computed astronomically and shown in full, and the reading either describes you with unsettling accuracy or it doesn&rsquo;t. Most skeptics forward the blind-spots section to someone before they finish reading it.</p> },
  { q: 'What do I get free?',
    a: <p>Your full personality reading is free, no card required. Full access (daily briefings, chat with your chart, timing windows) starts with {PRICING.trialDays} days free, then {PRICING.weekly.amount}/week or {PRICING.annual.amount}/year. You&rsquo;ll see exactly where one ends and the other begins.</p> },
  { q: 'Why do you need my birth time?',
    a: <p>Your Rising sign and Midheaven, the career point of the chart, move roughly one degree every four minutes. Even 15 minutes changes them. Check your birth certificate or ask your mother. If you don&rsquo;t know it, we&rsquo;ll generate a partial reading and tell you plainly which pieces need the exact time.</p> },
  { q: 'Is my data private?',
    a: <p>Your birth data is used to compute your chart and generate your reading, nothing else. We never sell birth data. Ever.</p> },
  { q: 'How fast is my reading?',
    a: <p>Your chart is computed in seconds. The full written reading is drawn fresh for you and takes a few minutes the first time; everything after that is instant.</p> },
  { q: 'Can I cancel anytime?',
    a: <p>Yes, in one click, no questions. If you cancel inside the {PRICING.trialDays}-day trial, you&rsquo;re never charged.</p> },
  { q: 'Will it tell me what business to start?',
    a: <p>It names the business models and sectors that fit the way you&rsquo;re wired, and the ones that quietly drain you. The chart is information; the decisions are yours.</p> },
];

function Faq() {
  return (
    <section id="faq" className="band">
      <div className="band-inner">
        <div className="text-center">
          <p className="eyebrow">Questions</p>
          <h2 className="band-h mt-4">Asked and answered.</h2>
        </div>
        <div className="mx-auto mt-10 max-w-3xl">
          <Accordion items={FAQ} />
        </div>
        {/* A bare CTA on the page ground reads as an orphan. The reference
            gives its closers a surround; this one gets the dark band. */}
        <div className="mx-auto mt-12 max-w-3xl rounded-[14px] bg-ledger px-6 py-10 text-center text-paper sm:px-10">
          <h3 className="font-serif text-[26px] font-normal text-paper sm:text-[30px]">
            Ready to stop guessing?
          </h3>
          <p className="mt-2.5 text-[15.5px] text-paper/72">Read your chart in 60 seconds.</p>
          <div className="mt-7">
            <Cta modal location="faq" className="w-full !border-ink/10 !bg-none !bg-paper !text-ink sm:w-auto">
              Start free <span aria-hidden>→</span>
            </Cta>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- 8. Close */

function CloseBand() {
  return (
    <section className="band bg-ledger text-paper">
      <div className="band-inner text-center">
        <h2 className="band-h text-paper">
          Stop guessing your next move.
        </h2>
        <p className="mx-auto mt-6 max-w-measure text-base leading-relaxed text-paper/75">
          You&rsquo;ll make the next call either way, the hire, the pivot, the
          pricing. This is sixty seconds of knowing how you make calls before you
          make one. The windows in your week pass whether you see them or not.
        </p>
        <div className="mt-9">
          <Cta modal location="close" className="w-full !border-ink/10 !bg-none !bg-paper !text-ink sm:w-auto">
            Get My Free Reading <span aria-hidden>→</span>
          </Cta>
        </div>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-label text-paper/55 sm:text-[11px]">
          Free · Takes 60 seconds · No card required
        </p>
      </div>
    </section>
  );
}
