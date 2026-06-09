"use client";

import { Star } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Avatar } from "@/components/ui/Avatar";

/* Real photos pulled from randomuser.me (free, no key, stable CDN).
   Quotes are sample copy. Swap for verified reviews before launch. */

interface T {
  quote: string;
  name: string;
  role: string;
  photo: string;
}

const TESTIMONIALS: T[] = [
  { quote: "I hadn't interviewed in six years. My score went from 44 to 81. I got the job.", name: "Rachel M.", role: "Office Manager", photo: "https://randomuser.me/api/portraits/women/68.jpg" },
  { quote: "It caught how many times I said 'um.' I had no idea. Two weeks later, gone.", name: "David K.", role: "Operations Lead", photo: "https://randomuser.me/api/portraits/men/32.jpg" },
  { quote: "The gap question used to wreck me. Now I have an answer I actually believe.", name: "Priya N.", role: "Account Manager", photo: "https://randomuser.me/api/portraits/women/44.jpg" },
  { quote: "Practiced the salary talk three times. Asked for more. Got it.", name: "Marcus T.", role: "Sales Rep", photo: "https://randomuser.me/api/portraits/men/51.jpg" },
  { quote: "I did the night-before mode and actually slept. First time ever.", name: "Janet R.", role: "Registered Nurse", photo: "https://randomuser.me/api/portraits/women/65.jpg" },
  { quote: "Switching careers felt impossible to explain. This made it simple.", name: "Carlos D.", role: "Project Coordinator", photo: "https://randomuser.me/api/portraits/men/76.jpg" },
  { quote: "The follow-up questions felt like a real interview. Way less scary on the day.", name: "Linda S.", role: "HR Coordinator", photo: "https://randomuser.me/api/portraits/women/12.jpg" },
  { quote: "Cheaper than one hour with a coach. I used it every night for a week.", name: "Tom B.", role: "Warehouse Supervisor", photo: "https://randomuser.me/api/portraits/men/40.jpg" },
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
        <Reveal delay={0.08}>
          <p className="mx-auto mt-3 max-w-md text-center text-xs text-ink-3">
            Illustrative examples of what regular practice can look like.
          </p>
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
