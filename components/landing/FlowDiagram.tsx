"use client";

import type { IconProps } from "@/components/icons";
import {
  JourneyClimbIcon,
  JourneyHiredIcon,
  JourneyLoopIcon,
  JourneyPracticeIcon,
  JourneyScoreIcon,
  JourneySituationIcon,
} from "@/components/icons";
import { Reveal } from "@/components/ui/Reveal";

/* A branded left-to-right flow of the whole Axon Careers journey. */

type JourneyIcon = (props: IconProps) => JSX.Element;

const NODES: { icon: JourneyIcon; label: string; sub: string; accent: "teal" | "sage" | "gold" }[] = [
  { icon: JourneySituationIcon, label: "Your situation", sub: "Role and where you're at", accent: "teal" },
  { icon: JourneyPracticeIcon, label: "Practice out loud", sub: "Speak or type 8 answers", accent: "teal" },
  { icon: JourneyScoreIcon, label: "AI scores you", sub: "5 scores, one fix, a follow-up", accent: "gold" },
  { icon: JourneyClimbIcon, label: "Your score climbs", sub: "Every session, a little higher", accent: "sage" },
  { icon: JourneyHiredIcon, label: "Walk in. Get hired.", sub: "Sure of every answer", accent: "gold" },
];

const accentStyles = {
  teal: {
    halo: "rgba(25,169,184,0.22)",
    gradient: "radial-gradient(90% 90% at 28% 18%, rgba(255,255,255,0.38), transparent 44%), linear-gradient(145deg, var(--primary-bright), var(--primary-ink))",
  },
  sage: {
    halo: "rgba(62,157,110,0.22)",
    gradient: "radial-gradient(90% 90% at 28% 18%, rgba(255,255,255,0.34), transparent 44%), linear-gradient(145deg, var(--sage), var(--primary-ink))",
  },
  gold: {
    halo: "rgba(184,137,59,0.24)",
    gradient: "radial-gradient(90% 90% at 28% 18%, rgba(255,255,255,0.42), transparent 44%), linear-gradient(145deg, var(--amber), var(--gold-ink))",
  },
} as const;

function Node({ icon: Icon, label, sub, accent }: { icon: JourneyIcon; label: string; sub: string; accent: keyof typeof accentStyles }) {
  const style = accentStyles[accent];
  return (
    <div
      className="group relative flex flex-1 items-center gap-3.5 overflow-hidden rounded-2xl border bg-surface p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg lg:flex-col lg:items-center lg:gap-3 lg:px-3 lg:py-6 lg:text-center"
      style={{ borderColor: "var(--border)" }}
    >
      <span
        className="pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: style.halo }}
        aria-hidden
      />
      <span
        className="relative grid h-14 w-14 shrink-0 place-items-center rounded-[18px] text-white shadow-sm ring-1 ring-white/35 transition-transform duration-300 group-hover:rotate-[-2deg] group-hover:scale-105"
        style={{ background: style.gradient }}
      >
        <span className="absolute inset-x-2 top-1 h-px bg-white/45" aria-hidden />
        <Icon size={27} />
      </span>
      <div className="lg:mt-1">
        <div className="font-serif text-base font-semibold text-ink">{label}</div>
        <div className="mt-0.5 text-xs leading-snug text-ink-3">{sub}</div>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center px-1 py-0.5 text-primary" aria-hidden>
      <svg className="hidden h-7 w-9 lg:block" viewBox="0 0 36 28" fill="none">
        <path d="M3 14c7.5-5.8 16.4-5.8 26.7 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="m25.2 9.1 5.5 4.9-5.5 4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10.5" cy="10.8" r="1.3" fill="currentColor" opacity="0.55" />
      </svg>
      <svg className="h-7 w-7 lg:hidden" viewBox="0 0 28 28" fill="none">
        <path d="M14 3c4.7 6.4 4.7 13.6 0 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="m9.2 19.4 4.8 5.1 4.8-5.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="17.5" cy="10.5" r="1.2" fill="currentColor" opacity="0.55" />
      </svg>
    </div>
  );
}

export function FlowDiagram() {
  return (
    <div className="container-wide">
      <div className="flex flex-col items-stretch gap-2.5 lg:flex-row lg:items-center lg:gap-1.5">
        {NODES.map((n, i) => (
          <div key={n.label} className="contents lg:flex lg:flex-1 lg:items-center">
            <Reveal delay={i * 0.08} className="lg:flex-1">
              <Node {...n} />
            </Reveal>
            {i < NODES.length - 1 && <Arrow />}
          </div>
        ))}
      </div>
      <Reveal delay={0.4}>
        <div className="mt-8 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-primary-soft px-4 py-1.5 text-sm font-medium text-primary-ink shadow-xs" style={{ borderColor: "rgba(20, 128, 142, 0.18)" }}>
            <JourneyLoopIcon size={16} /> Repeat until your score says you're ready
          </span>
        </div>
      </Reveal>
    </div>
  );
}
