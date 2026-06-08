"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

/* A looping, video-like demo for the onboarding side panel: the interviewer
   asks, a typing indicator runs, the answer slides in, then a score pops.
   It cycles through scenarios so the empty space feels alive. */

const SCENES = [
  {
    q: "Tell me about a time you led under pressure.",
    a: "When two teammates left at once, I cross-trained the team in a week. We never missed a deadline.",
    score: 84,
    note: "Strong, specific story. Add one number to push past 90.",
  },
  {
    q: "Walk me through the gap on your résumé.",
    a: "I took two years for family. I kept sharp managing our local board's budget the whole time.",
    score: 81,
    note: "Honest and confident. You owned it without apologizing.",
  },
  {
    q: "Why are you the right fit here?",
    a: "I've run this exact process for six years, and I cut our turnaround time by twenty percent.",
    score: 88,
    note: "Great. You tied your experience straight to their need.",
  },
];

// phase: 0 clear · 1 interviewer typing · 2 interviewer msg · 3 you typing · 4 you msg · 5 score
const SEQ: [number, number][] = [
  [1, 900],
  [2, 1400],
  [3, 900],
  [4, 1900],
  [5, 2600],
  [0, 500],
];

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

export function OnboardingShowcase() {
  const [scene, setScene] = useState(0);
  const [phase, setPhase] = useState(0);
  const sceneRef = useRef(0);

  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      let acc = 0;
      SEQ.forEach(([p, d]) => {
        timers.push(setTimeout(() => alive && setPhase(p), acc));
        acc += d;
      });
      timers.push(
        setTimeout(() => {
          if (!alive) return;
          sceneRef.current = (sceneRef.current + 1) % SCENES.length;
          setScene(sceneRef.current);
          run();
        }, acc)
      );
    };
    run();
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  const s = SCENES[scene];

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* the live interview card */}
      <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-semibold uppercase tracking-[0.18em] text-white/60">
            Live practice
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-2xs font-semibold text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Recording
          </span>
        </div>

        <div className="mt-4 min-h-[210px] space-y-3">
          {/* interviewer */}
          <div className="flex items-start gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[10px] font-bold text-ink">HM</span>
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2 text-sm text-ink shadow-sm">
              <AnimatePresence mode="wait">
                {phase === 1 ? (
                  <motion.span key="qt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-ink-3">
                    <TypingDots />
                  </motion.span>
                ) : phase >= 2 ? (
                  <motion.span key="qm" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    {s.q}
                  </motion.span>
                ) : (
                  <span key="qe" className="text-ink-3"><TypingDots /></span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* you */}
          <AnimatePresence>
            {phase >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-end"
              >
                <div className="max-w-[82%] rounded-2xl rounded-tr-sm border border-white/25 bg-white/15 px-3.5 py-2 text-sm text-white backdrop-blur">
                  {phase === 3 ? <TypingDots /> : <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{s.a}</motion.span>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* score + coach note */}
          <AnimatePresence>
            {phase >= 5 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className="rounded-xl border border-white/20 bg-white/12 p-3.5 backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-white/70">
                    <Sparkles size={13} /> Coach score
                  </span>
                  <span className="font-serif text-2xl font-semibold text-white">
                    <AnimatedNumber value={s.score} duration={900} startOnView={false} />
                    <span className="text-base text-white/60"> / 100</span>
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-white/80">{s.note}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* floating live stat, like the homepage */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-white/20 bg-white/90 px-4 py-3 shadow-xl backdrop-blur sm:block"
      >
        <div className="flex items-center gap-1.5 font-mono text-2xs font-semibold uppercase tracking-wider text-ink-3">
          <TrendingUp size={12} className="text-sage-ink" /> Filler words
        </div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="font-serif text-xl font-semibold text-ink">6.2</span>
          <span className="text-ink-3">&rarr;</span>
          <span className="font-serif text-xl font-semibold text-sage-ink">2.1</span>
        </div>
      </motion.div>
    </div>
  );
}
