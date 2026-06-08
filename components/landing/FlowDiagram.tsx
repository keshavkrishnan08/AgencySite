"use client";

import { ChevronDown, ChevronRight, Mic, RotateCw, Sparkles, TrendingUp, Trophy, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

/* A beautiful left-to-right flow of the whole Axon Careers journey. */

const NODES: { icon: LucideIcon; label: string; sub: string }[] = [
  { icon: UserRound, label: "Your situation", sub: "Role and where you're at" },
  { icon: Mic, label: "Practice out loud", sub: "Speak or type 8 answers" },
  { icon: Sparkles, label: "AI scores you", sub: "5 scores, one fix, a follow-up" },
  { icon: TrendingUp, label: "Your score climbs", sub: "Every session, a little higher" },
  { icon: Trophy, label: "Walk in. Get hired.", sub: "Sure of every answer" },
];

function Node({ icon: Icon, label, sub }: { icon: LucideIcon; label: string; sub: string }) {
  return (
    <div className="flex flex-1 items-center gap-3.5 rounded-2xl border bg-surface p-4 shadow-sm transition-shadow hover:shadow-lg lg:flex-col lg:items-center lg:gap-3 lg:px-3 lg:py-6 lg:text-center" style={{ borderColor: "var(--border)" }}>
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-sm"
        style={{ background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))" }}
      >
        <Icon size={22} />
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
    <div className="flex items-center justify-center text-primary" aria-hidden>
      <ChevronRight size={22} className="hidden lg:block" />
      <ChevronDown size={20} className="lg:hidden" />
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
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-sm font-medium text-primary-ink">
            <RotateCw size={14} /> Repeat until your score says you're ready
          </span>
        </div>
      </Reveal>
    </div>
  );
}
