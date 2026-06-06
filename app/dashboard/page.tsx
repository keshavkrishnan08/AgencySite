"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Flame,
  Clock,
  Lightbulb,
  Sparkles,
  Target as TargetIcon,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/Score";
import { ProgressLineChart, Sparkline } from "@/components/charts/Charts";
import {
  getInterviews,
  getProfile,
  getSessions,
  getStreak,
  isPremium,
  onStoreChange,
  upgradeToPremium,
} from "@/lib/store";
import type { InterviewRecord } from "@/lib/types";
import { seedSampleData } from "@/lib/seed";
import {
  DIMENSIONS,
  average,
  cn,
  formatDate,
  formatDuration,
  scoreColor,
} from "@/lib/utils";
import type { Dimension, Session } from "@/lib/types";

const DAILY_TIPS = [
  "When asked your greatest weakness, never say 'perfectionist.' Name a real skill you're improving and what you're doing about it.",
  "Pause instead of saying 'um.' A one-second silence reads as thoughtful; a filler word reads as nervous.",
  "End every behavioral answer with a result — ideally a number. 'Cut wait times 30%' beats 'it got better.'",
  "Replace 'I just' and 'I only' with nothing. You didn't *just* manage a team — you managed a team.",
  "Research one recent piece of company news. Mentioning it makes you sound like you've followed them for years.",
  "Mirror the energy of the job posting. 'Fast-paced' means they'll ask how you handle pressure — have a story ready.",
  "Always ask two questions at the end. It signals genuine interest more than any answer you give.",
];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [premium, setPremium] = useState(false);
  const [name, setName] = useState("");
  const [range, setRange] = useState<7 | 30 | 0>(0);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);

  useEffect(() => {
    setMounted(true);
    // Stripe success redirect (or demo): activate premium, then clean the URL.
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("upgraded") === "1") {
      upgradeToPremium();
      window.history.replaceState({}, "", "/dashboard");
    }
    const sync = () => {
      setSessions(getSessions());
      const s = getStreak();
      setStreak({ current: s.current, longest: s.longest });
      setPremium(isPremium());
      setName(getProfile().name || "");
      setInterviews(getInterviews());
    };
    sync();
    return onStoreChange(sync);
  }, []);

  const readiness = useMemo(() => {
    const last5 = sessions.slice(-5);
    return last5.length ? average(last5.map((s) => s.overall)) : 0;
  }, [sessions]);

  const filtered = useMemo(() => {
    if (!range) return sessions;
    const cutoff = Date.now() - range * 86400000;
    return sessions.filter((s) => +new Date(s.createdAt) >= cutoff);
  }, [sessions, range]);

  const progressData = filtered.map((s) => ({ label: formatDate(s.createdAt), score: s.overall }));

  const dimTrends = useMemo(() => {
    const recent = sessions.slice(-10);
    return DIMENSIONS.map((d) => {
      const vals = recent.map((s) => s.dimensions[d.key]);
      const current = vals[vals.length - 1] ?? 0;
      const first = vals[0] ?? current;
      return { key: d.key, label: d.label, vals, current, delta: current - first };
    });
  }, [sessions]);

  const weakest = useMemo(() => {
    if (!dimTrends.length) return null;
    return dimTrends.reduce((a, b) => (b.current < a.current ? b : a));
  }, [dimTrends]);

  const stats = useMemo(() => {
    const questions = sessions.reduce((n, s) => n + s.answers.length, 0);
    const time = sessions.reduce((n, s) => n + s.durationSeconds, 0);
    const best = sessions.reduce((m, s) => Math.max(m, s.overall), 0);
    return { sessions: sessions.length, questions, time, best };
  }, [sessions]);

  const tip = DAILY_TIPS[new Date().getDate() % DAILY_TIPS.length];

  if (!mounted) return <main className="min-h-screen"><AppNav /></main>;

  if (sessions.length === 0) {
    return (
      <>
        <AppNav />
        <EmptyState onSeed={() => seedSampleData()} />
      </>
    );
  }

  return (
    <>
      <AppNav />
      <main className="container-wide py-8 sm:py-10">
        <header className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-ink">
            {name ? `Welcome back, ${name}.` : "Your progress"}
          </h1>
          <p className="mt-1 text-ink-2">Every session moves the line. Here&apos;s where you stand.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* Readiness hero */}
            <div
              className="relative overflow-hidden rounded-2xl p-7 text-white shadow-xl sm:p-8"
              style={{ background: "linear-gradient(135deg, #19a9b8 0%, #14808e 55%, #0c5660 120%)" }}
            >
              <div
                className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-25 blur-2xl"
                style={{ background: "radial-gradient(circle, #fff, transparent)" }}
              />
              <div className="flex flex-col items-center gap-7 sm:flex-row sm:gap-9">
                <div className="glass-card rounded-full p-3">
                  <ScoreRing value={readiness} size={140} stroke={10} ringColor="#ffffff" trackColor="rgba(255,255,255,0.22)">
                    <div className="text-center">
                      <div className="font-serif text-4xl font-semibold leading-none">{readiness}%</div>
                      <div className="mt-1 text-2xs uppercase tracking-wider text-white/70">ready</div>
                    </div>
                  </ScoreRing>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-white/70">
                    Interview readiness
                  </p>
                  <h2 className="mt-2 font-serif text-2xl font-semibold">
                    {readiness >= 80
                      ? "You're interview-ready."
                      : readiness >= 65
                      ? "You're close. Keep going."
                      : "Building momentum."}
                  </h2>
                  <p className="mt-2 max-w-sm text-white/80">
                    Based on your last {Math.min(sessions.length, 5)} sessions. Most users feel confident at
                    80%+{readiness < 80 ? " — you're almost there." : "."}
                  </p>
                  <ButtonLink
                    href="/practice"
                    className="mt-5 !bg-white !text-primary-ink shadow-sm hover:!shadow-md"
                  >
                    Practice now <ArrowRight size={16} />
                  </ButtonLink>
                </div>
              </div>
            </div>

            {/* Progress chart */}
            <div className="card p-7">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold text-ink">Your progress</h2>
                <div className="flex gap-1 rounded-full bg-bg-tint p-1">
                  {([
                    [7, "7d"],
                    [30, "30d"],
                    [0, "All"],
                  ] as const).map(([v, label]) => (
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
              {progressData.length >= 2 ? (
                <ProgressLineChart data={progressData} height={280} />
              ) : (
                <p className="py-16 text-center text-ink-3">
                  Complete one more session to see your trend line.
                </p>
              )}
            </div>

            {/* Skills breakdown */}
            <div className="card p-7">
              <h2 className="mb-5 font-serif text-lg font-semibold text-ink">Skills breakdown</h2>
              <div className="space-y-1">
                {dimTrends.map((d) => (
                  <Link
                    key={d.key}
                    href={`/practice?focus=${d.key}`}
                    className="flex items-center gap-4 rounded-lg px-2 py-2.5 transition-colors hover:bg-bg-tint"
                  >
                    <span className="w-24 text-sm font-medium text-ink">{d.label}</span>
                    <span className="w-9 font-mono text-sm font-semibold" style={{ color: scoreColor(d.current) }}>
                      {d.current}
                    </span>
                    <div className="flex-1">
                      <Sparkline values={d.vals.length > 1 ? d.vals : [d.current, d.current]} width={160} height={28} />
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
                    <ChevronRight size={16} className="text-ink-3" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent sessions */}
            <div className="card p-7">
              <h2 className="mb-4 font-serif text-lg font-semibold text-ink">Recent sessions</h2>
              <div className="space-y-2">
                {[...sessions].reverse().slice(0, 6).map((s) => (
                  <Link
                    key={s.id}
                    href={`/session/${s.id}`}
                    className="flex items-center gap-4 rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-ink">{s.targetRole}</p>
                      <p className="text-xs text-ink-3">
                        {formatDate(s.createdAt)} · {s.answers.length} questions ·{" "}
                        {s.mode === "interview_day" ? "Interview Day" : s.mode === "focus" ? "Focus drill" : "Practice"}
                      </p>
                    </div>
                    <span
                      className="grid h-10 w-10 place-items-center rounded-full font-mono text-sm font-bold text-white"
                      style={{ background: scoreColor(s.overall) }}
                    >
                      {s.overall}
                    </span>
                    <ChevronRight size={18} className="text-ink-3" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT sidebar */}
          <div className="space-y-6">
            {/* Streak */}
            <div
              className="rounded-2xl p-6 text-white shadow-lg"
              style={{ background: "linear-gradient(140deg, #dd8b3d, #a8631f)" }}
            >
              <div className="flex items-center gap-2">
                <Flame size={22} className="fill-white" />
                <span className="font-serif text-2xl font-semibold">
                  {streak.current}-day streak
                </span>
              </div>
              <p className="mt-2 text-sm text-white/85">
                {streak.current > 0
                  ? "Keep it going — practice today to extend it."
                  : "Practice today to start a streak."}
              </p>
            </div>

            {/* Quick stats */}
            <div className="card p-6">
              <h3 className="mb-4 font-serif text-base font-semibold text-ink">Quick stats</h3>
              <div className="space-y-3">
                <Stat label="Sessions completed" value={String(stats.sessions)} />
                <Stat label="Questions answered" value={String(stats.questions)} />
                <Stat label="Total practice time" value={formatDuration(stats.time)} icon={<Clock size={14} />} />
                <Stat label="Best session" value={`${stats.best}/100`} highlight />
              </div>
            </div>

            {/* Real interviews (outcome loop) */}
            <div className="card p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-serif text-base font-semibold text-ink">Your interviews</h3>
                <Link href="/tools/tracker" className="text-xs font-medium text-primary-ink hover:underline">
                  {interviews.length ? "Manage" : "Track"}
                </Link>
              </div>
              {interviews.length ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-2">Offers</span>
                    <span className="font-mono font-semibold text-sage-ink">
                      {interviews.filter((i) => i.status === "offer").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-2">Upcoming</span>
                    <span className="font-mono font-semibold text-ink">
                      {interviews.filter((i) => i.status === "upcoming").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-2">Total tracked</span>
                    <span className="font-mono font-semibold text-ink">{interviews.length}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-2">
                  Got a real interview lined up? Track it here — offers are the point, not just scores.
                </p>
              )}
            </div>

            {/* Weak area focus */}
            {weakest && (
              <div className="card p-6" style={{ borderLeft: "4px solid var(--amber)" }}>
                <div className="mb-1.5 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-amber-ink">
                  <TargetIcon size={14} /> Focus area
                </div>
                <p className="text-sm text-ink-2">
                  <strong className="text-ink">{weakest.label}</strong> is your lowest dimension at{" "}
                  {weakest.current}. A focused drill is the fastest way to lift it.
                </p>
                <ButtonLink href={`/practice?focus=${weakest.key}`} variant="secondary" size="sm" className="mt-4 w-full">
                  Practice {weakest.label.toLowerCase()} <ArrowRight size={14} />
                </ButtonLink>
              </div>
            )}

            {/* Daily tip */}
            <div className="card p-6">
              <div className="mb-1.5 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-primary-ink">
                <Lightbulb size={14} /> Today&apos;s tip
              </div>
              <p className="text-sm leading-relaxed text-ink-2">{tip}</p>
            </div>

            {/* Upgrade */}
            {!premium && (
              <div
                className="rounded-2xl border-2 p-6"
                style={{ borderColor: "var(--gold)", background: "var(--gold-soft)" }}
              >
                <div className="flex items-center gap-2 text-gold-ink">
                  <Sparkles size={18} />
                  <h3 className="font-serif text-lg font-semibold">Go Premium</h3>
                </div>
                <p className="mt-2 text-sm text-ink-2">
                  Unlimited sessions, full scoring, every tool, and Interview Day mode.
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">$9.99/month · Cancel anytime</p>
                <ButtonLink href="/upgrade" variant="gold" size="sm" className="mt-4 w-full">
                  Upgrade <ArrowRight size={14} />
                </ButtonLink>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-sm text-ink-2">{icon}{label}</span>
      <span className={cn("font-mono text-sm font-semibold", highlight ? "text-primary-ink" : "text-ink")}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({ onSeed }: { onSeed: () => void }) {
  return (
    <main className="container-content py-20 text-center">
      <span
        className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-white shadow-sm"
        style={{ background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))" }}
      >
        <TrendingUp size={28} />
      </span>
      <h1 className="mt-6 font-serif text-3xl font-semibold text-ink">Your dashboard is ready</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-2">
        Complete your first practice session and your scores, charts, and streak will appear here. Want to
        see what it looks like first?
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <ButtonLink href="/practice" size="lg">
          Start a session <ArrowRight size={18} />
        </ButtonLink>
        <Button variant="secondary" size="lg" onClick={onSeed}>
          <Sparkles size={16} /> Load sample progress
        </Button>
      </div>
    </main>
  );
}
