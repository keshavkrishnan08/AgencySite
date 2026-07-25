"use client";

import { Brain, Target, Flame, Banknote, Sparkles, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { StartFreeButton } from "@/components/ui/StartFreeButton";

/* Landing section: the mega-context layer, told as a promise.
 *
 * "It learns you, then works for you." The right side is a live-looking memory
 * card — the human face of the context layer that actually powers the app — so
 * the claim is shown, not just stated. Sits on a soft stock background behind
 * the house ivory scrim, same treatment as the other photo sections. */

const PHOTO =
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1900&q=80";

const MEMORY = [
  { icon: Target, label: "Target role", value: "Registered Nurse · Kaiser", tone: "var(--primary)" },
  { icon: Brain, label: "Working on", value: "Specificity — needs real numbers", tone: "var(--amber)" },
  { icon: Flame, label: "Momentum", value: "5-day streak · 12 sessions in", tone: "var(--coral)" },
  { icon: Banknote, label: "Knows your market", value: "$75k–$95k for this role", tone: "var(--sage)" },
];

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
              Every answer, every session, every gap you talk through becomes context your coach never forgets.
              The more you practice, the more it sounds like it was built for you. Because by then, it was.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <ul className="mt-6 space-y-3">
              {[
                "One memory across scoring, follow-ups, and chat — you never re-explain yourself.",
                "Advice tuned to your role, your weak spot, and how close your interview is.",
                "Quietly gets sharper the more you use it. No settings to wrangle.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-ink-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--primary)" }} />
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-8">
              <StartFreeButton size="lg" source="operating_system" />
            </div>
          </Reveal>
        </div>

        {/* Memory card — the human face of the context layer */}
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
                <p className="text-sm font-semibold text-ink">What your coach remembers</p>
                <p className="text-2xs text-ink-3">Updated after every session</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {MEMORY.map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${m.tone} 14%, transparent)` }}>
                      <Icon size={15} style={{ color: m.tone }} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">{m.label}</p>
                      <p className="truncate text-sm font-medium text-ink">{m.value}</p>
                    </div>
                  </div>
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
