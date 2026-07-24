"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  Flame,
  Gauge,
  Lightbulb,
  Lock,
  MessageSquare,
  Target as TargetIcon,
  Timer,
  TrendingUp,
  Trophy,
  Type,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/Score";
import { InfoTip } from "@/components/ui/Tooltip";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { DistributionBars, ProjectionChart, Sparkline } from "@/components/charts/Charts";
import { getProfile, getSessions, getStreak, onStoreChange } from "@/lib/store";
import {
  READY_SCORE,
  TOP_1_SCORE,
  compact,
  computeMetrics,
  humanDays,
  type DimensionMetric,
  type Metrics,
  type Projection,
} from "@/lib/metrics";
import { cn, formatDate, formatDuration, scoreColor } from "@/lib/utils";
import type { Session, Streak } from "@/lib/types";

const DAILY_TIPS = [
  "When asked your greatest weakness, never say 'perfectionist.' Name a real skill you're improving and what you're doing about it.",
  "Pause instead of saying 'um.' A one-second silence reads as thoughtful; a filler word reads as nervous.",
  "End every behavioral answer with a result. Ideally a number. 'Cut wait times 30%' beats 'it got better.'",
  "Replace 'I just' and 'I only' with nothing. You didn't *just* manage a team. You managed a team.",
  "Research one recent piece of company news. Mentioning it makes you sound like you've followed them for years.",
  "Mirror the energy of the job posting. 'Fast-paced' means they'll ask how you handle pressure. Have a story ready.",
  "Always ask two questions at the end. It signals genuine interest more than any answer you give.",
];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [streak, setStreak] = useState<Streak>({ current: 0, longest: 0, lastSessionDate: null });
  const [name, setName] = useState("");

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      setSessions(getSessions());
      setStreak(getStreak());
      setName(getProfile().name || "");
    };
    sync();
    return onStoreChange(sync);
  }, []);

  const m = useMemo(() => computeMetrics(sessions, streak), [sessions, streak]);
  const tip = DAILY_TIPS[new Date().getDate() % DAILY_TIPS.length];

  if (!mounted) {
    return (
      <AppShell>
        <main className="min-h-screen" />
      </AppShell>
    );
  }

  if (!m.hasData) {
    return (
      <AppShell>
        <EmptyState />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="container-wide space-y-6 py-8 sm:py-10">
        <header>
          <p className="eyebrow">Your metrics</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">
            {name ? `Welcome back, ${name}.` : "Where you stand"}
          </h1>
          <p className="mt-1 text-ink-2">
            {m.sessionCount} session{m.sessionCount === 1 ? "" : "s"} · {m.questionsAnswered} questions ·{" "}
            {formatDuration(m.practiceSeconds)} of practice. Every number here comes from your own answers.
          </p>
        </header>

        <Headline m={m} />
        <KpiStrip m={m} />
        <Trajectory m={m} />

        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          <div className="space-y-6">
            <SkillBreakdown m={m} />
            <AnxietyPanel m={m} />
            <div className="grid gap-6 sm:grid-cols-2">
              <Distribution m={m} />
              <Categories m={m} />
            </div>
            <DeliveryPanel m={m} />
            <RecentSessions sessions={sessions} />
          </div>

          <div className="space-y-6">
            <ConsistencyCard m={m} />
            <MilestoneLadder m={m} />
            <PersonalRecords m={m} />
            {m.weakest && <FocusCard dim={m.weakest} />}
            <div className="card p-6">
              <div className="mb-1.5 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-primary-ink">
                <Lightbulb size={14} /> Today&apos;s tip
              </div>
              <p className="text-sm leading-relaxed text-ink-2">{tip}</p>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

/* ============================ Headline ============================ */

function Headline({ m }: { m: Metrics }) {
  return (
    <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      {/* Readiness + percentile */}
      <div
        className="relative overflow-hidden rounded-2xl p-7 text-white shadow-xl sm:p-8"
        style={{ background: "linear-gradient(135deg, #19a9b8 0%, #14808e 55%, #0c5660 120%)" }}
      >
        <div
          className="absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-25 blur-2xl"
          style={{ background: "radial-gradient(circle, #fff, transparent)" }}
        />
        <div className="relative flex flex-col items-center gap-7 sm:flex-row sm:gap-9">
          <div className="glass-card shrink-0 rounded-full p-3">
            <ScoreRing
              value={m.readiness}
              size={148}
              stroke={10}
              ringColor="#ffffff"
              trackColor="rgba(255,255,255,0.22)"
            >
              <div className="text-center">
                <div className="font-serif text-4xl font-semibold leading-none">
                  <AnimatedNumber value={m.readiness} />%
                </div>
                <div className="mt-1 text-2xs uppercase tracking-wider text-white/70">ready</div>
              </div>
            </ScoreRing>
          </div>
          <div className="text-center sm:text-left">
            <p className="flex items-center justify-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.2em] text-white/70 sm:justify-start">
              Interview readiness
              <InfoTip title="How this is figured" iconSize={13} className="text-white/70 hover:text-white">
                The average of your last 5 session scores. Most people feel ready at {READY_SCORE}+.
              </InfoTip>
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold">
              {m.readiness >= TOP_1_SCORE
                ? "You're in the top 1%."
                : m.readiness >= READY_SCORE
                ? "You're interview-ready."
                : m.readiness >= 65
                ? "You're close. Keep going."
                : "Building momentum."}
            </h2>
            <p className="mt-2 max-w-sm text-white/80">
              You&apos;re currently answering better than{" "}
              <strong className="font-semibold text-white">{m.percentile}%</strong> of candidates. That puts you in
              the <strong className="font-semibold text-white">top {m.topPercent}%</strong>.
            </p>
            <ButtonLink href="/practice" className="mt-5 !bg-white !text-primary-ink shadow-sm hover:!shadow-md">
              Practice now <ArrowRight size={16} />
            </ButtonLink>
          </div>
        </div>
      </div>

      {/* Time to top 1% — the number that brings people back */}
      <div
        className="relative overflow-hidden rounded-2xl border-2 p-7"
        style={{ borderColor: "var(--gold)", background: "var(--gold-soft)" }}
      >
        <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.18em] text-gold-ink">
          <Trophy size={15} /> Estimated time to top 1%
          <InfoTip title="How we estimate this" iconSize={13}>
            We fit a trend line through your last ten sessions to get your points-per-session, then divide the gap
            to {TOP_1_SCORE} by that pace at your current practice frequency. It&apos;s a projection, not a promise,
            and it updates every session.
          </InfoTip>
        </div>

        {m.toTop1.reached ? (
          <>
            <p className="mt-4 font-serif text-5xl font-semibold text-gold-ink">You&apos;re there.</p>
            <p className="mt-3 text-ink-2">
              Your readiness is {m.readiness}, above the {TOP_1_SCORE} top-1% bar. Keep practicing to hold it.
            </p>
          </>
        ) : m.toTop1.unknown ? (
          <>
            <p className="mt-4 font-serif text-5xl font-semibold text-gold-ink">One more</p>
            <p className="mt-3 text-ink-2">
              Finish a second session and we can measure your pace and project the date you&apos;d reach the top 1%.
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 font-serif text-5xl font-semibold leading-none text-gold-ink">
              {humanDays(m.toTop1.days)}
            </p>
            <p className="mt-3 text-ink-2">
              About <strong className="text-ink">{m.toTop1.sessions} more sessions</strong> at{" "}
              {m.pace.toFixed(1)} pts each, {m.cadence.toFixed(1)}× a week. That lands around{" "}
              <strong className="text-ink">
                {new Date(m.toTop1.dateISO).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              </strong>
              .
            </p>
            <div className="mt-4 space-y-2">
              <MiniRow label={`Points to ${TOP_1_SCORE}`} value={`${m.toTop1.gap}`} />
              <MiniRow
                label="Based on"
                value={m.toTop1.basis === "measured" ? "your measured pace" : "typical pace"}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-2">{label}</span>
      <span className="font-mono font-semibold text-ink">{value}</span>
    </div>
  );
}

/* ============================ KPI strip ============================ */

function KpiStrip({ m }: { m: Metrics }) {
  const tiles = [
    {
      icon: Gauge,
      label: "Readiness",
      value: `${m.readiness}`,
      sub: `top ${m.topPercent}% of candidates`,
      tone: scoreColor(m.readiness),
    },
    {
      icon: TrendingUp,
      label: "Improvement",
      value: `${m.improvement >= 0 ? "+" : ""}${m.improvement}`,
      sub: `since your first session${m.improvementPct ? ` (${m.improvementPct >= 0 ? "+" : ""}${m.improvementPct}%)` : ""}`,
      tone: m.improvement >= 0 ? "var(--sage)" : "var(--coral)",
    },
    {
      icon: Zap,
      label: "Pace",
      value: `${m.pace.toFixed(1)}`,
      sub: `pts per session · ${m.paceBasis === "measured" ? "measured" : "typical"}`,
      tone: "var(--primary-bright)",
    },
    {
      icon: Flame,
      label: "Streak",
      value: `${m.streak.current}`,
      sub: `day${m.streak.current === 1 ? "" : "s"} · best ${m.streak.longest}`,
      tone: "var(--amber)",
    },
    {
      icon: Calendar,
      label: "Cadence",
      value: `${m.cadence.toFixed(1)}`,
      sub: `sessions a week · ${m.consistency}% of days`,
      tone: "var(--primary-bright)",
    },
    {
      icon: TargetIcon,
      label: `To ready (${READY_SCORE})`,
      value: m.toReady.reached ? "Done" : m.toReady.unknown ? "—" : humanDays(m.toReady.days),
      sub: m.toReady.reached
        ? "you cleared the bar"
        : m.toReady.unknown
        ? "one more session to project"
        : `${m.toReady.sessions} sessions away`,
      tone: "var(--sage)",
    },
    {
      icon: Award,
      label: "Personal best",
      value: `${m.bestScore}`,
      sub: `best single session`,
      tone: scoreColor(m.bestScore),
    },
    {
      icon: MessageSquare,
      label: "Answers",
      value: `${m.questionsAnswered}`,
      sub: `${compact(m.wordsSpoken)} words spoken`,
      tone: "var(--ink-2)",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <div key={t.label} className="card p-5">
            <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-3">
              <Icon size={14} style={{ color: t.tone }} />
              {t.label}
            </div>
            <p className="mt-2 font-mono text-3xl font-semibold leading-none" style={{ color: t.tone }}>
              {t.value}
            </p>
            <p className="mt-2 text-xs leading-snug text-ink-3">{t.sub}</p>
          </div>
        );
      })}
    </section>
  );
}

/* ============================ Trajectory ============================ */

function Trajectory({ m }: { m: Metrics }) {
  const [range, setRange] = useState<7 | 30 | 0>(0);

  const rows = useMemo(() => {
    let trend = m.trend;
    if (range) {
      const cutoff = Date.now() - range * 86400000;
      trend = trend.filter((t) => +new Date(t.dateISO) >= cutoff);
    }
    const past = trend.slice(-14).map((t) => ({
      label: t.label,
      actual: t.score as number | null,
      projected: null as number | null,
    }));
    if (!past.length) return [];
    if (m.toTop1.unknown || m.toTop1.reached) return past;

    // Anchor the dashed line to the last real point so the two lines connect.
    const from = past[past.length - 1].actual ?? m.readiness;
    past[past.length - 1].projected = from;
    const steps = Math.min(6, Math.max(2, m.toTop1.sessions));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      past.push({
        label: `+${Math.round(m.toTop1.days * t)}d`,
        actual: null,
        projected: Math.round(from + (TOP_1_SCORE - from) * t),
      });
    }
    return past;
  }, [m, range]);

  return (
    <section className="card p-7">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 font-serif text-lg font-semibold text-ink">
            Your trajectory
            <InfoTip title="Reading this chart">
              The solid teal line is what you actually scored. The dashed gold line extends your own pace forward to
              the top-1% bar. It moves every time you practice.
            </InfoTip>
          </h2>
          <p className="mt-0.5 text-sm text-ink-2">
            Where you&apos;ve been, and where your current pace takes you.
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-bg-tint p-1">
          {(
            [
              [7, "7d"],
              [30, "30d"],
              [0, "All"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={label}
              onClick={() => setRange(v)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                range === v ? "bg-white text-ink shadow-xs" : "text-ink-2 hover:text-ink"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {rows.length >= 2 ? (
        <div className="mt-4">
          <ProjectionChart data={rows} readyAt={READY_SCORE} topAt={TOP_1_SCORE} height={300} />
        </div>
      ) : (
        <p className="py-16 text-center text-ink-3">
          Complete one more session and your trend line and projection appear here.
        </p>
      )}
    </section>
  );
}

/* ============================ Skills ============================ */

function SkillBreakdown({ m }: { m: Metrics }) {
  return (
    <section className="card p-7">
      <h2 className="flex items-center gap-1.5 font-serif text-lg font-semibold text-ink">
        Skill breakdown
        <InfoTip title="Your five scores">
          Every answer is scored on clarity, relevance, specificity, confidence and conciseness. Tap any row to drill
          that one on its own.
        </InfoTip>
      </h2>
      <p className="mt-0.5 text-sm text-ink-2">
        Current score is the average of your last three sessions, so one bad night doesn&apos;t swing it.
      </p>

      <div className="mt-5 space-y-2">
        {m.dimensions.map((d) => (
          <SkillRow key={d.key} d={d} />
        ))}
      </div>

      {m.strongest && m.weakest && m.strongest.key !== m.weakest.key && (
        <p className="mt-5 rounded-xl bg-bg-sunk p-4 text-sm text-ink-2">
          <strong className="text-ink">{m.strongest.label}</strong> is carrying you at {m.strongest.current}, while{" "}
          <strong className="text-ink">{m.weakest.label}</strong> sits {m.strongest.current - m.weakest.current}{" "}
          points behind. Closing that one gap is the fastest lift available to you.
        </p>
      )}
    </section>
  );
}

function SkillRow({ d }: { d: DimensionMetric }) {
  return (
    <Link
      href={`/practice?focus=${d.key}`}
      className="group block rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-4">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-2xs font-bold text-white"
          style={{ background: scoreColor(d.current) }}
        >
          {d.current}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{d.label}</span>
            <span className="rounded-full bg-bg-tint px-2 py-0.5 text-2xs font-semibold text-ink-3">#{d.rank}</span>
          </div>
          <p className="truncate text-xs text-ink-3">{d.blurb}</p>
        </div>
        <div className="hidden sm:block">
          <Sparkline values={d.series.length > 1 ? d.series : [d.current, d.current]} width={130} height={30} />
        </div>
        <span
          className={cn(
            "inline-flex w-14 items-center justify-end gap-0.5 text-xs font-semibold",
            d.delta >= 0 ? "text-sage-ink" : "text-coral-ink"
          )}
        >
          <ArrowUpRight size={13} className={cn(d.delta < 0 && "rotate-90")} />
          {d.delta >= 0 ? "+" : ""}
          {d.delta}
        </span>
        <ChevronRight size={16} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 pl-13 text-2xs text-ink-3">
        <span>
          Top <strong className="font-semibold text-ink-2">{d.topPercent}%</strong>
        </span>
        <span>
          Best <strong className="font-semibold text-ink-2">{d.best}</strong>
        </span>
        <span>
          Pace <strong className="font-semibold text-ink-2">{d.pace >= 0 ? "+" : ""}{d.pace}</strong>/session
        </span>
        <span>{projectionLabel(d.toReady)}</span>
      </div>
    </Link>
  );
}

function projectionLabel(p: Projection): string {
  if (p.reached) return `At the ${READY_SCORE} bar`;
  if (p.unknown) return "Need more history";
  return `${humanDays(p.days)} to ${READY_SCORE}`;
}

/* ============================ Anxiety ============================ */

function AnxietyPanel({ m }: { m: Metrics }) {
  const improving = m.anxietyDelta < 0;
  return (
    <section className="card p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-1.5 font-serif text-lg font-semibold text-ink">
            Anxiety Detector
            <InfoTip title="What this counts">
              Filler words, hedges, apologies and self-undermining qualifiers, normalized per 100 words so longer
              answers aren&apos;t punished. Interviewers hear all four. You don&apos;t.
            </InfoTip>
          </h2>
          <p className="mt-0.5 text-sm text-ink-2">The tells you can&apos;t hear yourself make.</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl font-semibold" style={{ color: improving ? "var(--sage)" : "var(--amber)" }}>
            {m.anxietyPer100}
          </p>
          <p className="text-2xs uppercase tracking-wider text-ink-3">per 100 words</p>
        </div>
      </div>

      {m.anxietyPer100First > 0 && (
        <p
          className="mt-4 rounded-xl p-4 text-sm"
          style={{
            background: improving ? "var(--sage-soft)" : "var(--amber-soft)",
            color: improving ? "var(--sage-ink)" : "var(--amber-ink)",
          }}
        >
          {improving ? (
            <>
              Down <strong>{Math.abs(m.anxietyDelta)}%</strong> from where you started ({m.anxietyPer100First} per 100
              words). That&apos;s the sound of confidence.
            </>
          ) : m.anxietyDelta === 0 ? (
            <>Holding steady at {m.anxietyPer100} per 100 words. Cutting these is the quickest confidence win.</>
          ) : (
            <>
              Up <strong>{m.anxietyDelta}%</strong> from your first sessions. Slow down and pause instead of
              filling the silence.
            </>
          )}
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {m.anxiety.map((a) => {
          const better = a.delta < 0;
          return (
            <div key={a.key} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{a.label}</span>
                <span
                  className={cn("text-2xs font-semibold", better ? "text-sage-ink" : a.delta > 0 ? "text-coral-ink" : "text-ink-3")}
                >
                  {a.delta > 0 ? "+" : ""}
                  {a.delta} vs start
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-semibold text-ink">{a.per100}</span>
                <span className="text-xs text-ink-3">per 100 words · {a.total} total</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, a.per100 * 12)}%`,
                    background: better ? "var(--sage)" : "var(--amber)",
                  }}
                />
              </div>
              {a.examples.length > 0 && (
                <p className="mt-2.5 flex flex-wrap gap-1.5">
                  {a.examples.map((w, i) => (
                    <span key={i} className="rounded-full bg-bg-tint px-2 py-0.5 text-2xs text-ink-2">
                      {w}
                    </span>
                  ))}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ============================ Distribution + categories ============================ */

function Distribution({ m }: { m: Metrics }) {
  const strong = m.distribution.slice(4).reduce((n, d) => n + d.count, 0);
  const pct = m.questionsAnswered ? Math.round((strong / m.questionsAnswered) * 100) : 0;
  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-1.5 font-serif text-lg font-semibold text-ink">
        <BarChart3 size={17} className="text-primary" /> Answer spread
      </h2>
      <p className="mt-0.5 text-sm text-ink-2">
        {pct}% of your answers score 80 or better. Consistency is what survives a bad room.
      </p>
      <div className="mt-3">
        <DistributionBars data={m.distribution} height={170} />
      </div>
    </section>
  );
}

function Categories({ m }: { m: Metrics }) {
  const best = m.categories[0];
  const worst = m.categories[m.categories.length - 1];
  return (
    <section className="card p-6">
      <h2 className="font-serif text-lg font-semibold text-ink">By question type</h2>
      <p className="mt-0.5 text-sm text-ink-2">
        {best && worst && best.category !== worst.category
          ? `Strongest on ${best.label.toLowerCase()}, weakest on ${worst.label.toLowerCase()}.`
          : "Where your answers land by category."}
      </p>
      <div className="mt-4 space-y-3">
        {m.categories.map((c) => (
          <div key={c.category}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-ink-2">
                {c.label} <span className="text-ink-3">· {c.count}</span>
              </span>
              <span className="font-mono font-semibold" style={{ color: scoreColor(c.avg) }}>
                {c.avg}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${c.avg}%`, background: scoreColor(c.avg) }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================ Delivery ============================ */

function DeliveryPanel({ m }: { m: Metrics }) {
  const stats = [
    { icon: MessageSquare, label: "Avg answer length", value: `${m.avgWordsPerAnswer}`, unit: "words", hint: "60-150 is the sweet spot" },
    { icon: Timer, label: "Avg time per question", value: m.avgSecondsPerQuestion ? `${m.avgSecondsPerQuestion}` : "—", unit: "sec", hint: "thinking time before you speak" },
    { icon: Clock, label: "Avg session", value: formatDuration(m.avgSessionSeconds), unit: "", hint: `${formatDuration(m.practiceSeconds)} total` },
    { icon: Type, label: "Speaking pace", value: m.avgWpm ? `${m.avgWpm}` : "—", unit: "wpm", hint: m.avgWpm ? (m.avgWpm > 170 ? "a touch fast, breathe" : m.avgWpm < 110 ? "a touch slow" : "right in the pocket") : "speak an answer to measure" },
  ];
  return (
    <section className="card p-7">
      <h2 className="font-serif text-lg font-semibold text-ink">Delivery</h2>
      <p className="mt-0.5 text-sm text-ink-2">How you sound, not just what you said.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl bg-bg-sunk p-4">
              <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-3">
                <Icon size={13} /> {s.label}
              </div>
              <p className="mt-1.5 font-mono text-2xl font-semibold text-ink">
                {s.value}
                {s.unit && <span className="ml-1 font-sans text-sm font-medium text-ink-3">{s.unit}</span>}
              </p>
              <p className="mt-1 text-2xs text-ink-3">{s.hint}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ============================ Consistency ============================ */

function ConsistencyCard({ m }: { m: Metrics }) {
  return (
    <section className="card overflow-hidden p-0">
      <div className="p-6 text-white" style={{ background: "linear-gradient(140deg, #dd8b3d, #a8631f)" }}>
        <div className="flex items-center gap-2">
          <Flame size={22} className="fill-white" />
          <span className="font-serif text-2xl font-semibold">
            {m.streak.current}-day streak
          </span>
        </div>
        <p className="mt-1.5 text-sm text-white/85">
          {m.streak.current > 0
            ? `Longest run: ${m.streak.longest} days. Practice today to extend it.`
            : "Practice today to start a new one."}
        </p>
      </div>

      <div className="p-6">
        <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">Last 28 days</p>
        <div className="mt-2.5 flex flex-wrap gap-1">
          {m.activity.map((a) => (
            <span
              key={a.dateISO}
              title={`${a.dateISO} · ${a.count} session${a.count === 1 ? "" : "s"}`}
              className="h-4 w-4 rounded-[4px] transition-transform hover:scale-125"
              style={{
                background:
                  a.count === 0
                    ? "var(--bg-tint)"
                    : a.count === 1
                    ? "rgba(62,157,110,0.45)"
                    : "var(--sage)",
              }}
            />
          ))}
        </div>

        <div className="mt-5 space-y-3">
          <StatLine label="Consistency" value={`${m.consistency}%`} hint={`${m.daysActive} of ${m.daysSinceStart} days`} />
          <StatLine label="This week" value={`${m.sessionsThisWeek}`} hint={weekHint(m.weekDelta)} tone={m.weekDelta >= 0 ? "sage" : "coral"} />
          <StatLine label="Best week" value={`${m.bestWeekSessions}`} hint="sessions in seven days" />
          <StatLine label="Rest days" value={`${m.restDays}`} hint="in the last 28" />
        </div>
      </div>
    </section>
  );
}

function weekHint(delta: number): string {
  if (delta > 0) return `${delta} more than last week`;
  if (delta < 0) return `${Math.abs(delta)} fewer than last week`;
  return "same as last week";
}

function StatLine({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "sage" | "coral";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-ink-2">{label}</span>
      <span className="text-right">
        <span
          className={cn(
            "font-mono text-sm font-semibold",
            tone === "sage" ? "text-sage-ink" : tone === "coral" ? "text-coral-ink" : "text-ink"
          )}
        >
          {value}
        </span>
        <span className="ml-2 text-2xs text-ink-3">{hint}</span>
      </span>
    </div>
  );
}

/* ============================ Milestones ============================ */

function MilestoneLadder({ m }: { m: Metrics }) {
  const achieved = m.milestones.filter((x) => x.achieved).length;
  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-ink">Milestones</h2>
        <span className="font-mono text-sm font-semibold text-ink-3">
          {achieved}/{m.milestones.length}
        </span>
      </div>

      {m.nextMilestone && (
        <div className="mt-4 rounded-xl border-2 border-dashed p-4" style={{ borderColor: "var(--primary)" }}>
          <p className="text-2xs font-semibold uppercase tracking-wider text-primary-ink">Up next</p>
          <p className="mt-1 font-medium text-ink">{m.nextMilestone.label}</p>
          <p className="mt-0.5 text-sm text-ink-2">{m.nextMilestone.detail}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.round(m.nextMilestone.progress * 100)}%`,
                background: "linear-gradient(90deg, var(--primary), var(--primary-bright))",
              }}
            />
          </div>
          <p className="mt-1.5 text-2xs text-ink-3">{Math.round(m.nextMilestone.progress * 100)}% there</p>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {m.milestones.map((x) => (
          <li key={x.id} className="flex items-center gap-2.5 text-sm">
            <span
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full"
              style={{ background: x.achieved ? "var(--sage-soft)" : "var(--bg-tint)" }}
            >
              {x.achieved ? (
                <Award size={11} className="text-sage-ink" />
              ) : (
                <Lock size={10} className="text-ink-3" />
              )}
            </span>
            <span className={x.achieved ? "text-ink" : "text-ink-3"}>{x.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ============================ Records ============================ */

function PersonalRecords({ m }: { m: Metrics }) {
  return (
    <section className="card p-6">
      <h2 className="font-serif text-lg font-semibold text-ink">Personal records</h2>
      <div className="mt-4 space-y-3">
        <StatLine label="Best session" value={`${m.bestScore}`} hint="out of 100" />
        {m.bestAnswer && <StatLine label="Best single answer" value={`${m.bestAnswer.score}`} hint="one answer" />}
        <StatLine label="Longest streak" value={`${m.streak.longest}`} hint="days" />
        <StatLine label="Words spoken" value={compact(m.wordsSpoken)} hint="across every answer" />
        <StatLine label="Time practiced" value={formatDuration(m.practiceSeconds)} hint={`${m.sessionCount} sessions`} />
      </div>
      {m.bestAnswer?.question && (
        <p className="mt-4 rounded-xl bg-bg-sunk p-4 text-sm italic leading-relaxed text-ink-2">
          Your best answer came on: &ldquo;{m.bestAnswer.question}&rdquo;
        </p>
      )}
    </section>
  );
}

/* ============================ Focus ============================ */

function FocusCard({ dim }: { dim: DimensionMetric }) {
  return (
    <section className="card p-6" style={{ borderLeft: "4px solid var(--amber)" }}>
      <div className="mb-1.5 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-amber-ink">
        <TargetIcon size={14} /> Focus area
      </div>
      <p className="text-sm text-ink-2">
        <strong className="text-ink">{dim.label}</strong> is your lowest dimension at {dim.current}, putting you in
        the top {dim.topPercent}% there. {projectionLabel(dim.toReady)} at your current pace.
      </p>
      <ButtonLink href={`/practice?focus=${dim.key}`} variant="secondary" size="sm" className="mt-4 w-full">
        Drill {dim.label.toLowerCase()} <ArrowRight size={14} />
      </ButtonLink>
    </section>
  );
}

/* ============================ Recent ============================ */

function RecentSessions({ sessions }: { sessions: Session[] }) {
  return (
    <section className="card p-7">
      <h2 className="mb-4 font-serif text-lg font-semibold text-ink">Recent sessions</h2>
      <div className="space-y-2">
        {[...sessions]
          .reverse()
          .slice(0, 8)
          .map((s) => (
            <Link
              key={s.id}
              href={`/session/${s.id}`}
              className="flex items-center gap-4 rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{s.targetRole}</p>
                <p className="text-xs text-ink-3">
                  {formatDate(s.createdAt)} · {s.answers.length} questions ·{" "}
                  {s.mode === "focus" ? "Focus drill" : s.mode === "predicted" ? "Predicted questions" : "Practice"}
                </p>
              </div>
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-mono text-sm font-bold text-white"
                style={{ background: scoreColor(s.overall) }}
              >
                {s.overall}
              </span>
              <ChevronRight size={18} className="shrink-0 text-ink-3" />
            </Link>
          ))}
      </div>
    </section>
  );
}

/* ============================ Empty ============================ */

function EmptyState() {
  return (
    <main className="container-content py-20 text-center">
      <span
        className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-white shadow-sm"
        style={{ background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))" }}
      >
        <TrendingUp size={28} />
      </span>
      <h1 className="mt-6 font-serif text-3xl font-semibold text-ink">Your metrics start here</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-2">
        Run one practice session and this page fills with your readiness score, percentile, pace, streak, and a
        projected date for reaching the top 1%.
      </p>
      <div className="mt-8 flex justify-center">
        <ButtonLink href="/practice" size="lg">
          Start a session <ArrowRight size={18} />
        </ButtonLink>
      </div>
    </main>
  );
}
