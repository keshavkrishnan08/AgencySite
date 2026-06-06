"use client";

import { motion } from "framer-motion";
import { TrendingUp, Sparkles } from "lucide-react";
import { ScoreNumber, DimensionBars } from "@/components/ui/Score";

const DEMO = { clarity: 86, relevance: 91, specificity: 74, confidence: 79, conciseness: 88 };

export function HeroDemo() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* ambient glow */}
      <div
        className="absolute -inset-6 -z-10 rounded-[40px] opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(60% 60% at 30% 20%, rgba(25,169,184,0.28), transparent), radial-gradient(50% 50% at 90% 90%, rgba(184,137,59,0.22), transparent)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, rotate: -1 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="card-elevated overflow-hidden p-0"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-3">
              Session score
            </span>
          </div>
          <span className="chip bg-sage-soft text-sage-ink">
            <TrendingUp size={13} /> +14 this week
          </span>
        </div>

        {/* score */}
        <div className="flex items-end justify-between px-6 pt-6">
          <div>
            <ScoreNumber value={84} className="text-[4.5rem]" suffix />
            <p className="mt-1 text-sm font-medium text-sage-ink">Excellent. You&apos;re interview-ready.</p>
          </div>
        </div>

        {/* dimensions */}
        <div className="px-6 py-6">
          <DimensionBars dimensions={DEMO} />
        </div>

        {/* coach note */}
        <div className="mx-6 mb-6 rounded-xl border bg-bg-sunk p-4" style={{ borderColor: "var(--border)" }}>
          <div className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-primary-ink">
            <Sparkles size={13} /> Coach&apos;s note
          </div>
          <p className="text-sm leading-relaxed text-ink-2">
            Strong, specific story. And you cut the word &ldquo;just&rdquo; this time. To push past 90,
            add one number to your result.
          </p>
        </div>
      </motion.div>

      {/* floating mini-stat */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass absolute -left-6 bottom-16 hidden rounded-2xl px-4 py-3 shadow-lg sm:block"
      >
        <div className="font-mono text-2xs font-semibold uppercase tracking-wider text-ink-3">Filler words</div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="font-serif text-2xl font-semibold text-ink">6.2</span>
          <span className="text-ink-3">→</span>
          <span className="font-serif text-2xl font-semibold text-sage-ink">2.1</span>
        </div>
      </motion.div>
    </div>
  );
}
