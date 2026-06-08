"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, TrendingUp, Wand2, Check, Mic } from "lucide-react";
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
  [1, 1200],
  [2, 1900],
  [3, 1200],
  [4, 2500],
  [5, 3400],
  [0, 700],
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

/* ---------- Step 2: questions tailoring to the role ---------- */
const QSETS = [
  ["Tell me about yourself.", "Why do you want this role?", "Describe a time you led under pressure.", "What's a weakness you're improving?", "What questions do you have for us?"],
  ["Walk me through your résumé.", "Tell me about a conflict you resolved.", "How do you handle a tight deadline?", "Where do you see yourself in five years?", "Why are you the right fit here?"],
];
const QCATS = ["Warm up", "Behavioral", "Behavioral", "Your story", "Closer"];

export function ShowcaseQuestions({ role }: { role?: string }) {
  const [count, setCount] = useState(0);
  const setRef = useRef(0);
  const [, force] = useState(0);

  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setCount(0);
      for (let i = 1; i <= 5; i++) timers.push(setTimeout(() => alive && setCount(i), 620 * i + 600));
      timers.push(
        setTimeout(() => {
          if (!alive) return;
          setRef.current = (setRef.current + 1) % QSETS.length;
          force((n) => n + 1);
          run();
        }, 620 * 5 + 3600)
      );
    };
    run();
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  const qs = QSETS[setRef.current];

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15"><Wand2 size={16} /></span>
          <div>
            <p className="text-sm font-semibold leading-tight">Building your interview</p>
            <p className="text-2xs text-white/65">Tailored for {role || "your role"}</p>
          </div>
          {count < 5 && (
            <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }} className="ml-auto text-2xs font-medium text-white/70">
              generating…
            </motion.span>
          )}
        </div>

        <div className="mt-4 min-h-[228px] space-y-2">
          {qs.map((q, i) => (
            <AnimatePresence key={`${setRef.current}-${i}`}>
              {i < count && (
                <motion.div
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  className="flex items-start gap-2.5 rounded-xl border border-white/15 bg-white/10 p-3"
                >
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-300/90 text-[10px] font-bold text-ink">
                    <Check size={12} />
                  </span>
                  <div>
                    <span className="text-2xs font-semibold uppercase tracking-wider text-white/55">{QCATS[i]}</span>
                    <p className="text-sm leading-snug text-white">{q}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Step 3: the score climbing every session ---------- */
const CLIMB = [44, 57, 66, 74, 82];

export function ShowcaseProgress() {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCycle((c) => c + 1), 7600);
    return () => clearInterval(id);
  }, []);

  return (
    <div key={cycle} className="relative mx-auto w-full max-w-sm">
      <div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-white/60">Interview readiness</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="font-serif text-6xl font-semibold leading-none text-white">
            <AnimatedNumber value={CLIMB[CLIMB.length - 1]} duration={3200} startOnView={false} />
            <span className="text-2xl text-white/55">%</span>
          </span>
          <span className="mb-2 flex items-center gap-1 rounded-full bg-emerald-300/20 px-2 py-0.5 text-xs font-bold text-emerald-200">
            <TrendingUp size={13} /> +38
          </span>
        </div>

        {/* rising bars, one per session */}
        <div className="mt-6 flex h-28 items-end justify-between gap-2.5">
          {CLIMB.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <motion.div
                className="w-full rounded-t-md"
                style={{ background: "linear-gradient(to top, rgba(255,255,255,0.35), #d7fbff)" }}
                initial={{ height: 0 }}
                animate={{ height: `${v}%` }}
                transition={{ delay: 0.4 + i * 0.36, duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
              />
              <span className="text-2xs text-white/50">S{i + 1}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/80">A 44 today becomes an 82 next week. You&apos;ll see it climb.</p>
      </div>
    </div>
  );
}

/* ---------- Skills: five dimensions filling ---------- */
const SKILLS: [string, number][] = [
  ["Clarity", 86],
  ["Relevance", 91],
  ["Specificity", 74],
  ["Confidence", 80],
  ["Conciseness", 88],
];

export function ShowcaseSkills() {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCycle((c) => c + 1), 7200);
    return () => clearInterval(id);
  }, []);
  return (
    <div key={cycle} className="relative mx-auto w-full max-w-sm">
      <div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15"><Sparkles size={16} /></span>
          <p className="text-sm font-semibold">Scored on five dimensions</p>
        </div>
        <div className="mt-5 space-y-3.5">
          {SKILLS.map(([label, v], i) => (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-white/85">{label}</span>
                <span className="font-mono font-semibold text-white">{v}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(to right, #d7fbff, #7fe1ea)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${v}%` }}
                  transition={{ delay: 0.3 + i * 0.28, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Delivery: live mic, volume meter + transcript ---------- */
const DV = Array.from({ length: 18 }, (_, i) => {
  const s = (i * 13) % 7;
  return { peak: 10 + s * 4, dur: 0.5 + s * 0.09, delay: (i % 6) * 0.08 };
});
const DELIVERY_LINE = "I led the rollout, trained fifteen staff, and cut missed appointments by twenty percent.";

export function ShowcaseDelivery() {
  const [shown, setShown] = useState("");
  useEffect(() => {
    const glyphs = "etaoinshrdlucmfwypvbgkjqxz ";
    let i = 0;
    const id = setInterval(() => {
      i = i > DELIVERY_LINE.length + 18 ? 0 : i + 1;
      const clear = Math.min(i, DELIVERY_LINE.length);
      let scr = "";
      if (clear < DELIVERY_LINE.length) {
        const n = Math.min(4, DELIVERY_LINE.length - clear);
        for (let k = 0; k < n; k++) scr += glyphs[(i * 3 + k * 7) % glyphs.length];
      }
      setShown(DELIVERY_LINE.slice(0, clear) + scr);
    }, 70);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between text-white">
          <span className="flex items-center gap-2 text-sm font-semibold"><Mic size={16} /> Listening to your delivery</span>
          <span className="flex items-center gap-1.5 text-2xs font-semibold text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Live</span>
        </div>
        <div className="mt-5 flex h-12 items-end justify-center gap-[3px]">
          {DV.map((b, i) => (
            <motion.span
              key={i}
              className="w-[3px] rounded-full"
              style={{ background: "linear-gradient(to top, rgba(255,255,255,0.4), #d7fbff)" }}
              initial={{ height: 4 }}
              animate={{ height: [4, b.peak, 6, b.peak * 0.7, 4] }}
              transition={{ duration: b.dur, delay: b.delay, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>
        <p className="mt-4 min-h-[2.5rem] text-sm leading-relaxed text-white/75">
          {shown}
          <span className="ml-0.5 inline-block animate-pulse text-white">▌</span>
        </p>
        <div className="mt-4 flex gap-2">
          {[["Pace", "132 wpm"], ["Filler", "low"], ["Pauses", "2"]].map(([k, v]) => (
            <div key={k} className="flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-center">
              <div className="text-2xs uppercase tracking-wider text-white/55">{k}</div>
              <div className="text-sm font-semibold text-white">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
