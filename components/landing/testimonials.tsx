"use client";

import { Star } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Avatar } from "@/components/ui/Avatar";

/* Real photos pulled from randomuser.me (free, no key, stable CDN).
   Quotes are sample copy. Swap for verified reviews before launch. */

export interface T {
  quote: string;
  name: string;
  role: string;
  photo: string;
}

export const TESTIMONIALS: T[] = [
  {
    quote:
      "I hadn't interviewed since 2018 and my first score was a 44. I almost gave up, honestly! But I kept at it five minutes a night and hit an 84 by interview morning. Walked in actually calm for once. I start Monday!!",
    name: "Rachel M.",
    role: "Office Manager · returned after 6 years",
    photo: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    quote:
      "I had NO idea I said 'um' eleven times in one answer until it counted them for me. So embarrassing 😅 But by interview day? Down to two. Wild.",
    name: "David K.",
    role: "Operations Lead",
    photo: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    quote:
      "The gap question used to make my voice shake so bad. Practiced it like nine times here til it came out steady. In the actual room, the interviewer just nodded and moved on. That was it!",
    name: "Priya N.",
    role: "Account Manager",
    photo: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    quote:
      "Rehearsed the salary talk three times the night before. They offered 70, I asked for 78 without my voice cracking once, and we landed at 76. That's $6k from one practice session!!",
    name: "Marcus T.",
    role: "Sales Rep",
    photo: "https://randomuser.me/api/portraits/men/51.jpg",
  },
  {
    quote:
      "Did the night-before sim at 11pm, totally terrified. And then... I actually slept?! First time ever before an interview. Game changer.",
    name: "Janet R.",
    role: "Registered Nurse",
    photo: "https://randomuser.me/api/portraits/women/65.jpg",
  },
  {
    quote:
      "Explaining why I left teaching felt impossible. This got it down to one clean sentence I actually believed. Nobody flinched when I said it. Got the offer that week!",
    name: "Carlos D.",
    role: "Project Coordinator · career switch",
    photo: "https://randomuser.me/api/portraits/men/76.jpg",
  },
  {
    quote:
      "The follow-ups caught me SO off guard in practice... which meant they didn't on the day. Felt like a real interviewer pushing back. Way less scary when it actually counted!",
    name: "Linda S.",
    role: "HR Coordinator",
    photo: "https://randomuser.me/api/portraits/women/12.jpg",
  },
  {
    quote:
      "Nine bucks and I used it every single night for a week. Cheaper than one hour with a coach, and I could do it after my shift at midnight. No notes!",
    name: "Tom B.",
    role: "Warehouse Supervisor",
    photo: "https://randomuser.me/api/portraits/men/40.jpg",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={14} className="fill-gold text-gold" />
      ))}
    </div>
  );
}

function Card({ t, className }: { t: T; className?: string }) {
  return (
    <figure className={`card flex w-[340px] shrink-0 flex-col p-6 ${className ?? ""}`}>
      <Stars />
      <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-ink">&ldquo;{t.quote}&rdquo;</p>
      <figcaption className="mt-5 flex items-center gap-3">
        <Avatar src={t.photo} name={t.name} size={44} className="ring-2 ring-white" />
        <div>
          <div className="text-sm font-semibold text-ink">{t.name}</div>
          <div className="text-xs text-ink-3">{t.role}</div>
        </div>
      </figcaption>
    </figure>
  );
}

/* Compact, continuously-scrolling review ticker. Constant motion (no snapping),
   and a much shorter row than the full cards. */
function CompactCard({ t }: { t: T }) {
  return (
    <figure
      className="flex w-[300px] shrink-0 items-center gap-3 rounded-full border bg-surface px-4 py-2"
      style={{ borderColor: "var(--border)" }}
    >
      <Avatar src={t.photo} name={t.name} size={32} className="ring-2 ring-white" />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-ink">{t.name}</span>
          <Stars />
        </div>
        <p className="truncate text-xs text-ink-2" title={t.quote}>&ldquo;{t.quote}&rdquo;</p>
      </div>
    </figure>
  );
}

export function TestimonialCarousel() {
  const row = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section className="border-y py-3" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="marquee-mask overflow-hidden">
        <div className="marquee-track flex w-max gap-5">
          {row.map((t, i) => (
            <CompactCard key={i} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialMarquee() {
  const row = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section className="border-y py-10" style={{ background: "var(--bg-sunk)", borderColor: "var(--border)" }}>
      <div className="container-wide mb-6 flex items-center justify-center gap-2 text-sm text-ink-2">
        <Stars />
        <span className="font-medium text-ink">Loved by 12,000+ job seekers</span>
      </div>
      <div className="marquee-mask overflow-hidden">
        <div className="marquee-track flex w-max gap-5">
          {row.map((t, i) => (
            <Card key={i} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialGrid() {
  return (
    <section className="border-t py-24 sm:py-28" style={{ borderColor: "var(--border)" }}>
      <div className="container-wide">
        <Reveal>
          <p className="eyebrow justify-center">Real people, real interviews</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance text-center font-serif text-display font-semibold text-ink">
            They walked in nervous. They walked out hired.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.slice(0, 6).map((t, i) => (
            <Reveal key={t.name} delay={(i % 3) * 0.06}>
              <Card t={t} className="w-full" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
