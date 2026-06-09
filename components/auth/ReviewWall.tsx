"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { TESTIMONIALS } from "@/components/landing/testimonials";

/* The right half of the sign-in screen: real review cards drifting upward in a
   smooth, infinite vertical marquee over the brand gradient. Two stacked copies
   of the list make the loop seamless; top/bottom fade masks hide the seam. */

function ReviewCard({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  return (
    <figure className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={13} className="fill-amber-soft text-amber-soft" />
        ))}
      </div>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-white/90">&ldquo;{t.quote}&rdquo;</p>
      <figcaption className="mt-4 flex items-center gap-3">
        <Avatar src={t.photo} name={t.name} size={36} className="ring-2 ring-white/30" />
        <div>
          <div className="text-sm font-semibold text-white">{t.name}</div>
          <div className="text-xs text-white/65">{t.role}</div>
        </div>
      </figcaption>
    </figure>
  );
}

export function ReviewWall() {
  const loop = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <aside
      className="relative hidden overflow-hidden lg:block"
      style={{ background: "linear-gradient(160deg, #19a9b8 0%, #14808e 50%, #0c5660 120%)" }}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, #ffffff66, transparent)" }} />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, #ffe0a655, transparent)" }} />

      {/* heading */}
      <div className="absolute inset-x-0 top-0 z-20 px-12 pt-14 xl:px-16">
        <div className="flex items-center gap-1.5 text-white">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} className="fill-white text-white" />)}
          <span className="ml-2 text-sm font-medium text-white/85">Loved by 12,000+ job seekers</span>
        </div>
        <h2 className="mt-4 max-w-md font-serif text-[2rem] font-semibold leading-tight text-white">
          Walk in nervous. Walk out hired.
        </h2>
      </div>

      {/* scrolling reviews */}
      <div
        className="absolute inset-0 px-12 pt-48 xl:px-16"
        style={{ maskImage: "linear-gradient(to bottom, transparent 9rem, #000 14rem, #000 80%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 9rem, #000 14rem, #000 80%, transparent 100%)" }}
      >
        <motion.div
          className="flex flex-col gap-4"
          animate={{ y: ["0%", "-50%"] }}
          transition={{ duration: 38, ease: "linear", repeat: Infinity }}
        >
          {loop.map((t, i) => (
            <ReviewCard key={i} t={t} />
          ))}
        </motion.div>
      </div>
    </aside>
  );
}
