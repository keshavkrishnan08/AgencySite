"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import { ScoreNumber, DimensionBars } from "@/components/ui/Score";
import { InfoTip } from "@/components/ui/Tooltip";
import { DIMENSIONS, DIMENSION_HELP, scoreLabel, scoreColor, cn } from "@/lib/utils";
import type { Dimension, ScoredAnswer } from "@/lib/types";

function FeedbackRow({ dim, score, text }: { dim: Dimension; score: number; text: string }) {
  const label = DIMENSIONS.find((d) => d.key === dim)?.label ?? dim;
  const Icon = score >= 75 ? CheckCircle2 : score >= 55 ? TrendingUp : AlertCircle;
  const help = DIMENSION_HELP[dim];
  return (
    <div className="flex gap-3">
      <Icon size={18} className="mt-0.5 shrink-0" style={{ color: scoreColor(score) }} />
      <p className="text-[0.95rem] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">
          {label} ({score})
        </span>
        <InfoTip title={`${label} — ${help.what}`} className="mx-1">
          {help.tip}
        </InfoTip>
        : {text}
      </p>
    </div>
  );
}

function AnxietyPanel({ answer }: { answer: ScoredAnswer }) {
  const a = answer.anxiety;
  const flags: { label: string; items: string[]; count: number }[] = [
    { label: "Filler words", items: a.fillers, count: a.fillerCount },
    { label: "Hedging", items: a.hedges, count: a.hedgeCount },
    { label: "Apologies", items: a.apologies, count: a.apologyCount },
    { label: "Self-undermining", items: a.underminers, count: a.underminerCount },
  ].filter((f) => f.count > 0);

  if (flags.length === 0) {
    return (
      <div className="rounded-xl border bg-sage-soft/60 p-4" style={{ borderColor: "var(--border)" }}>
        <p className="flex items-center gap-2 text-sm font-medium text-sage-ink">
          <CheckCircle2 size={16} /> Clean delivery — no filler words, hedging, or apologies detected.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-amber-soft/40 p-4" style={{ borderColor: "var(--border)" }}>
      <p className="mb-2.5 text-2xs font-semibold uppercase tracking-wider text-amber-ink">
        Anxiety detector
      </p>
      <div className="flex flex-wrap gap-2">
        {flags.map((f) => (
          <span
            key={f.label}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-ink-2 shadow-xs"
          >
            <span className="font-mono font-bold text-amber-ink">{f.count}</span> {f.label}
            <span className="text-ink-3">
              ({f.items.slice(0, 2).map((i) => `"${i}"`).join(", ")})
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function AnswerScoreCard({
  answer,
  animate = true,
  loadExample,
}: {
  answer: ScoredAnswer;
  animate?: boolean;
  loadExample?: (a: ScoredAnswer) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  const [example, setExample] = useState(answer.exampleAnswer || "");
  const [loading, setLoading] = useState(false);

  const onToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !example && loadExample) {
      setLoading(true);
      try {
        setExample(await loadExample(answer));
      } finally {
        setLoading(false);
      }
    }
  };

  const s = answer.scores.overall;

  return (
    <div className="space-y-6">
      {/* Overall + dimensions */}
      <div className="card-elevated grid items-center gap-8 p-7 sm:grid-cols-[auto_1fr] sm:p-8">
        <div className="text-center sm:border-r sm:pr-8" style={{ borderColor: "var(--border)" }}>
          <ScoreNumber value={s} className="text-[4.5rem]" duration={animate ? 1200 : 1} />
          <p className="mt-1 text-sm font-semibold" style={{ color: scoreColor(s) }}>
            {scoreLabel(s)}
          </p>
          <p className="mt-0.5 text-2xs uppercase tracking-wider text-ink-3">out of 100</p>
        </div>
        <DimensionBars dimensions={answer.scores} />
      </div>

      {/* Coach's notes */}
      <div className="card p-7">
        <h3 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-ink">
          <Lightbulb size={18} className="text-primary" /> Coach&apos;s notes
        </h3>
        <div className="space-y-3.5">
          {DIMENSIONS.map((d) => (
            <FeedbackRow key={d.key} dim={d.key} score={answer.scores[d.key]} text={answer.feedback[d.key]} />
          ))}
        </div>
        <div className="mt-5">
          <AnxietyPanel answer={answer} />
        </div>
      </div>

      {/* Example answer */}
      <div className="card overflow-hidden p-0">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-bg-tint"
        >
          <span className="font-medium text-primary-ink">See an example strong answer</span>
          <ChevronDown size={18} className={cn("text-ink-3 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="border-t px-5 pb-6 pt-4" style={{ borderColor: "var(--border)" }}>
            <p className="mb-2 text-2xs uppercase tracking-wider text-ink-3">
              Example — not the only right answer, just one approach
            </p>
            {loading ? (
              <p className="text-ink-3">Writing an example…</p>
            ) : (
              <p className="leading-relaxed text-ink-2">{example}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
