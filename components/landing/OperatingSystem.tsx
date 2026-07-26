"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Brain, Target, Flame, Banknote, Sparkles, ArrowRight, Activity } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { StartFreeButton } from "@/components/ui/StartFreeButton";

/* Landing section: the mega-context layer, told as a promise.
 *
 * "It learns you, then works for you." An animated counter shows it draws on
 * 150+ signals per person, and the memory card is the human face of the context
 * layer that actually powers the app. Sits on a soft stock background behind the
 * house ivory scrim, same treatment as the other photo sections. No em dashes. */

const PHOTO =
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1900&q=80";

const MEMORY = [
  { icon: Target, label: "Target role", value: "Registered Nurse at Kaiser", tone: "var(--primary)" },
  { icon: Brain, label: "Working on", value: "Specificity, needs real numbers", tone: "var(--amber)" },
  { icon: Flame, label: "Momentum", value: "5-day streak, 12 sessions in", tone: "var(--coral)" },
  { icon: Banknote, label: "Knows your market", value: "$75k to $95k for this role", tone: "var(--sage)" },
];

/* Counts up to `to` once the element scrolls into view. */
function CountUp({ to, duration = 1400 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return <span ref={ref}>{n}</span>;
}

/* A little bar chart that fills column by column as it enters view: the visual
   of interactions accumulating into the model's picture of you. */
function SignalBars() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const heights = [30, 46, 38, 58, 50, 68, 60, 78, 72, 88, 82, 96];
  return (
    <div ref={ref} className="flex h-14 items-end gap-1.5">
      {heights.map((h, i) => (
        <motion.span
          key={i}
          className="w-full flex-1 rounded-sm"
          style={{ background: "var(--primary)", opacity: 0.35 + (i / heights.length) * 0.65 }}
          initial={{ height: 4 }}
          animate={inView ? { height: `${h}%` } : { height: 4 }}
          transition={{ delay: i * 0.06, type: "spring", stiffness: 220, damping: 22 }}
        />
      ))}
    </div>
  );
}

export function OperatingSystem() {
  return (
    <section id="operating-system" className="relative overflow-hidden py-24 sm:py-28">
      {/* Stock background behind the ivory scrim */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PHOTO} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: "rgba(247,243,233,0.9)" }} />
        <div className="absolute inset-x-0 top-0 h-32" style={{ background: "linear-gradient(180deg, var(--bg), transparent)" }} />
        <div className="absolute inset-x-0 bottom-0 h-32" style={{ background: "linear-gradient(0deg, var(--bg), transparent)" }} />
      </div>

      <div className="container-wide grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Copy */}
        <div>
          <Reveal>
            <p className="eyebrow"><Sparkles size={14} /> Your operating system</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 font-serif text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl">
              It learns you.<br />Then it works for you.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-2">
              It doesn't just take a snapshot on day one. Every answer you give and every session you run adds
              another line to a picture that keeps filling in. Week two knows you better than week one. Month two,
              better than that. The longer you use it, the more it sounds like it was built for you.
            </p>
          </Reveal>

          {/* The "150+ interactions" animation */}
          <Reveal delay={0.14}>
            <div className="mt-7 rounded-2xl border bg-surface/80 p-5 backdrop-blur-sm" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="flex items-baseline gap-1 font-mono text-4xl font-semibold text-ink">
                    <CountUp to={150} />
                    <span className="text-primary-ink">+</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2">
                    <Activity size={14} className="text-primary" /> signals learned about you, and counting
                  </p>
                </div>
                <div className="w-32 sm:w-40">
                  <SignalBars />
                </div>
              </div>
              <p className="mt-4 text-2xs text-ink-3">
                Scores, phrasing, pace, filler words, your weak spots, your role. All of it feeds one memory.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-7">
              <StartFreeButton size="lg" source="operating_system" />
            </div>
          </Reveal>
        </div>

        {/* Memory card, the human face of the context layer */}
        <Reveal delay={0.12}>
          <div
            className="relative mx-auto w-full max-w-md rounded-3xl border bg-surface p-6 sm:p-7"
            style={{ borderColor: "var(--border)", boxShadow: "0 24px 60px -28px rgba(15,23,42,0.35)" }}
          >
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "var(--primary-soft)" }}>
                <Brain size={17} className="text-primary-ink" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">It&apos;s learning you</p>
                <p className="text-2xs text-ink-3">A little more after every session</p>
              </div>
              <span className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold" style={{ background: "var(--sage-soft)", color: "var(--sage-ink)" }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--sage)" }} /> Live
              </span>
            </div>

            <div className="mt-5 space-y-2.5">
              {MEMORY.map((m, i) => {
                const Icon = m.icon;
                return (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ delay: 0.15 + i * 0.12 }}
                    className="flex items-center gap-3 rounded-xl border p-3"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${m.tone} 14%, transparent)` }}>
                      <Icon size={15} style={{ color: m.tone }} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">{m.label}</p>
                      <p className="truncate text-sm font-medium text-ink">{m.value}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-xl p-3.5 text-sm" style={{ background: "var(--primary-soft)" }}>
              <Sparkles size={16} className="shrink-0 text-primary-ink" />
              <span className="text-ink">
                So the first thing it says already fits <strong className="text-primary-ink">you</strong>.
              </span>
              <ArrowRight size={15} className="ml-auto shrink-0 text-primary-ink" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
