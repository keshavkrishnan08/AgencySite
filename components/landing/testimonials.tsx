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
      "I hadn't interviewed since 2018 and my first practice score was a 44. I almost closed the laptop. I kept at it five minutes a night, and the morning of my interview I hit an 84. I walked in calm for the first time in years. I start Monday.",
    name: "Rachel M.",
    role: "Office Manager · returned after 6 years",
    photo: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    quote:
      "I had no idea I said 'um' eleven times in one answer until it counted them for me. Seeing the actual number fixed it faster than any pep talk ever did. By interview day I was down to two.",
    name: "David K.",
    role: "Operations Lead",
    photo: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    quote:
      "The gap on my résumé used to make my voice shake. I practiced the answer nine times here until it came out steady, because it was the truth. In the room, the interviewer just nodded and moved on.",
    name: "Priya N.",
    role: "Account Manager",
    photo: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    quote:
      "I rehearsed the salary talk three times the night before. When they offered 70 I asked for 78 without my voice cracking. We landed at 76. That's an extra $6k from one practice session.",
    name: "Marcus T.",
    role: "Sales Rep",
    photo: "https://randomuser.me/api/portraits/men/51.jpg",
  },
  {
    quote:
      "I did the night-before simulation at 11pm, genuinely terrified. For the first time before an interview, I actually slept. I knew I'd already survived the hard questions once.",
    name: "Janet R.",
    role: "Registered Nurse",
    photo: "https://randomuser.me/api/portraits/women/65.jpg",
  },
  {
    quote:
      "Explaining why I left teaching for project work felt impossible. It helped me get it into one clean sentence I believed. Nobody flinched when I said it. I got the offer that week.",
    name: "Carlos D.",
    role: "Project Coordinator · career switch",
    photo: "https://randomuser.me/api/portraits/men/76.jpg",
  },
  {
    quote:
      "The follow-up questions caught me off guard in practice, so they didn't on the day. It really did feel like a real interviewer pushing back. Way less scary when it actually counted.",
    name: "Linda S.",
    role: "HR Coordinator",
    photo: "https://randomuser.me/api/portraits/women/12.jpg",
  },
  {
    quote:
      "It's nine bucks and I used it every single night for a week. Cheaper than one hour with a coach, and I could do it after my shift at midnight when nobody was around to watch me mess up.",
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
