"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Flame, Gauge, CalendarDays, MessageSquare,
  Sparkles, TrendingUp, Target as TargetIcon, Newspaper, Lightbulb, Loader2,
  CheckCircle2, Circle, MapPin, Banknote, ListChecks, Award, Activity, Trophy, RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { getOnboarding, getProfile, getSessions, getStreak, onStoreChange } from "@/lib/store";
import { apiInsights, type CareerInsights } from "@/lib/client";
import { pushInsight, pullLatestInsight } from "@/lib/cloud";
import { computeMetrics } from "@/lib/metrics";
import { contextSummary, persistOverview } from "@/lib/context";
import { ProgressLineChart, DonutChart, HBarChart } from "@/components/charts/Charts";
import { todayKey } from "@/lib/utils";
import { cn, formatDuration, formatDate, scoreColor } from "@/lib/utils";
import type { Session, Streak } from "@/lib/types";

/* The dashboard HOME: a calm, Attio-style overview. Usage at a glance (streak,
   volume, readiness) plus a weekly, cheap-LLM career read. The deep performance
   analytics live one click away at /analytics. */

// Midpoint of each score band, so the donut slices take the same colour a score
// of that value would elsewhere in the app.
const BAND_MID: Record<string, number> = {
  "0-39": 20, "40-54": 47, "55-69": 62, "70-79": 75, "80-89": 85, "90+": 95,
};

function isoWeekKey(): string {
  const d = new Date();
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 864e5 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}W${week}`;
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [streak, setStreak] = useState<Streak>({ current: 0, longest: 0, lastSessionDate: null });
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [insights, setInsights] = useState<CareerInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [summary, setSummary] = useState("");
  const [lastInsightAt, setLastInsightAt] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      setSessions(getSessions());
      setStreak(getStreak());
      const p = getProfile();
      const ob = getOnboarding();
      setName(p.name || "");
      setRole(p.targetRole || ob?.targetRole || "");
      setSummary(contextSummary());
    };
    sync();
    // Keep the standardized account overview fresh on each dashboard visit.
    persistOverview();
    return onStoreChange(sync);
  }, []);

  // Career insights ("news"): saved to the account and reused, so they DON'T
  // regenerate on every load. A new generation happens at most once per day
  // (auto when the saved one is older than a day, or via the Refresh button).
  // Each generation is appended to the account history, never overwritten.
  const DAY = 86_400_000;
  const roleIndustry = useCallback(() => {
    const p = getProfile();
    const ob = getOnboarding();
    return { r: p.targetRole || ob?.targetRole || "", industry: (ob as { industry?: string } | null)?.industry || "" };
  }, []);

  const genAndSave = useCallback(async () => {
    const { r, industry } = roleIndustry();
    const res = await apiInsights({ role: r, industry });
    if (res) {
      setInsights(res);
      setLastInsightAt(new Date().toISOString());
      pushInsight(r, industry, res).catch(() => {});
      try { localStorage.setItem(`pp:insights:day:${todayKey()}:${r}`.slice(0, 120), JSON.stringify(res)); } catch { /* quota */ }
    }
    return res;
  }, [roleIndustry]);

  useEffect(() => {
    if (!mounted) return;
    let alive = true;
    (async () => {
      setLoadingInsights(true);
      // 1) The account's most recent saved insight.
      const saved = await pullLatestInsight();
      if (!alive) return;
      if (saved?.data) {
        setInsights(saved.data);
        setLastInsightAt(saved.created_at);
        setLoadingInsights(false);
        // Fresh (under a day old): reuse it, do not regenerate.
        if (Date.now() - new Date(saved.created_at).getTime() < DAY) return;
        // Stale: auto-refresh once (the day's single generation).
        await genAndSave();
        return;
      }
      // 2) Not signed in / nothing saved: a local per-day cache still prevents
      //    regenerating on every load.
      const { r } = roleIndustry();
      try {
        const c = localStorage.getItem(`pp:insights:day:${todayKey()}:${r}`.slice(0, 120));
        if (c) { setInsights(JSON.parse(c)); setLastInsightAt(new Date().toISOString()); setLoadingInsights(false); return; }
      } catch { /* ignore */ }
      // 3) First time today: generate and save.
      await genAndSave();
      if (alive) setLoadingInsights(false);
    })();
    return () => { alive = false; };
  }, [mounted, genAndSave, roleIndustry]);

  const canRefresh = !lastInsightAt || Date.now() - new Date(lastInsightAt).getTime() >= DAY;
  const refreshInsights = useCallback(async () => {
    if (!canRefresh || loadingInsights) return;
    setLoadingInsights(true);
    await genAndSave();
    setLoadingInsights(false);
  }, [canRefresh, loadingInsights, genAndSave]);

  const m = useMemo(() => computeMetrics(sessions, streak), [sessions, streak]);

  if (!mounted) {
    return <AppShell><main className="min-h-screen" /></AppShell>;
  }

  const tiles = [
    { icon: Gauge, label: "Readiness", value: m.readiness, sub: m.hasData ? `top ${m.topPercent}%` : "practice to set", tone: scoreColor(m.readiness || 1) },
    { icon: Flame, label: "Day streak", value: m.streak.current, sub: `best ${m.streak.longest}`, tone: "var(--amber)" },
    { icon: CalendarDays, label: "This week", value: m.sessionsThisWeek, sub: "sessions", tone: "var(--primary-bright)" },
    { icon: MessageSquare, label: "Questions", value: m.questionsAnswered, sub: `${formatDuration(m.practiceSeconds)} practiced`, tone: "var(--ink-2)" },
  ];

  return (
    <AppShell>
      <main className="container-wide space-y-7 py-8 sm:py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">
              {name ? `Welcome back, ${name}.` : "Welcome back."}
            </h1>
            <p className="mt-1 text-ink-2">
              {role ? <>Your week at a glance, and this week&apos;s read on the market for <strong className="text-ink">{role}</strong>.</> : "Your week at a glance."}
            </p>
          </div>
          <ButtonLink href="/practice" size="lg">
            Practice <ArrowRight size={16} />
          </ButtonLink>
        </header>

        {/* Usage stats — borderless, flat, segmented (Stripe balance-tile style) */}
        <section
          className="grid grid-cols-2 gap-x-6 gap-y-6 border-y py-6 lg:grid-cols-4"
          style={{ borderColor: "var(--border)" }}
        >
          {tiles.map((t, i) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className={cn(i > 0 && "lg:border-l lg:pl-6")} style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-3">
                  <Icon size={13} className="text-ink-3" /> {t.label}
                </div>
                <p className="mt-1.5 font-mono text-[2rem] font-semibold leading-none text-ink">
                  <AnimatedNumber value={t.value} />
                </p>
                <p className="mt-1.5 text-xs text-ink-3">{t.sub}</p>
              </div>
            );
          })}
        </section>

        {/* What your coach knows — the mega-context layer, surfaced. */}
        {summary && (
          <Link
            href="/prep?tab=recent"
            className="group flex items-center gap-3.5 rounded-2xl border p-4 transition-colors hover:border-primary sm:p-5"
            style={{ borderColor: "var(--border)", background: "var(--primary-soft)" }}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "var(--surface)" }}>
              <Sparkles size={18} className="text-primary-ink" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-2xs font-semibold uppercase tracking-wider text-primary-ink">What your coach knows about you</p>
              <p className="mt-0.5 truncate text-sm text-ink">{summary}</p>
            </div>
            <ArrowRight size={17} className="shrink-0 text-primary-ink transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}

        {/* More stats — trajectory, consistency, next milestone */}
        {m.hasData && (
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <MiniCard icon={TrendingUp} title="Trajectory" tone="var(--primary)">
              <StatRow label="Best score" value={String(m.bestScore)} />
              <StatRow label="Net improvement" value={`${m.improvement >= 0 ? "+" : ""}${m.improvement}`} good={m.improvement >= 0} />
              <StatRow label="Per session" value={`${m.pace >= 0 ? "+" : ""}${m.pace} pts`} sub={m.paceBasis} />
            </MiniCard>
            <MiniCard icon={Activity} title="Consistency" tone="var(--sage)">
              <StatRow label="Show-up rate" value={`${m.consistency}%`} />
              <StatRow label="Days active" value={String(m.daysActive)} />
              <StatRow label="Best week" value={`${m.bestWeekSessions} sessions`} />
            </MiniCard>
            {m.nextMilestone ? (
              <MiniCard icon={Trophy} title="Next milestone" tone="var(--amber)">
                <p className="text-sm font-semibold text-ink">{m.nextMilestone.label}</p>
                <p className="mt-0.5 text-xs text-ink-3">{m.nextMilestone.detail}</p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-sunk)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.round(m.nextMilestone.progress * 100)}%`, background: "var(--amber)" }} />
                </div>
                <p className="mt-1.5 text-2xs text-ink-3">{Math.round(m.nextMilestone.progress * 100)}% there</p>
              </MiniCard>
            ) : (
              <MiniCard icon={Award} title="Milestones" tone="var(--amber)">
                <p className="text-sm text-ink-2">Every milestone cleared. You&apos;re in rare company.</p>
              </MiniCard>
            )}
          </section>
        )}

        {/* Graphs — a mix of line, bars, and a donut so it's not one chart type */}
        {m.hasData && (
          <section className="grid gap-6 lg:grid-cols-2">
            {/* Line: readiness over time */}
            <div className="card p-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold text-ink">Readiness over time</h2>
                <Link href="/analytics" className="text-xs font-medium text-primary-ink hover:underline">Details</Link>
              </div>
              <p className="mb-3 text-sm text-ink-3">Your session score, every time you practice.</p>
              <ProgressLineChart data={m.trend.map((t) => ({ label: t.label, score: t.score }))} height={220} showReady />
            </div>
            {/* Vertical bars: daily practice volume */}
            <div className="card p-6">
              <h2 className="font-serif text-lg font-semibold text-ink">Daily practice</h2>
              <p className="mb-3 text-sm text-ink-3">Sessions a day over the last two weeks.</p>
              <DailyUsage activity={m.activity.slice(-14)} />
            </div>
            {/* Horizontal bars: skill breakdown, ranked */}
            <div className="card p-6">
              <h2 className="font-serif text-lg font-semibold text-ink">Skill breakdown</h2>
              <p className="mb-3 text-sm text-ink-3">Where you stand on each of the five, strongest first.</p>
              <HBarChart
                data={[...m.dimensions]
                  .map((d) => ({ label: d.label, value: Math.round(d.current) }))
                  .sort((a, b) => b.value - a.value)}
                height={220}
              />
            </div>
            {/* Donut: score distribution */}
            <div className="card p-6">
              <h2 className="font-serif text-lg font-semibold text-ink">Answer scores</h2>
              <p className="mb-3 text-sm text-ink-3">How your {m.questionsAnswered} answers land across the range.</p>
              <DonutChart
                data={m.distribution
                  .filter((d) => d.count > 0)
                  .map((d) => ({ name: d.bucket, value: d.count, color: scoreColor(BAND_MID[d.bucket] ?? 60) }))}
                height={220}
                centerLabel="answers"
                centerValue={String(m.questionsAnswered)}
              />
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Weekly market read */}
          <section className="card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b px-7 py-4" style={{ borderColor: "var(--border)" }}>
              <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
                <Newspaper size={18} className="text-primary" /> This week&apos;s market read
              </h2>
              <button
                onClick={refreshInsights}
                disabled={!canRefresh || loadingInsights}
                title={canRefresh ? "Refresh (once a day)" : "Already refreshed today"}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-2xs font-medium text-ink-2 transition-colors enabled:hover:text-ink disabled:opacity-50"
                style={{ borderColor: "var(--border-strong)" }}
              >
                <RefreshCw size={12} className={loadingInsights ? "animate-spin" : ""} />
                {canRefresh ? "Refresh" : "Refreshed today"}
              </button>
            </div>
            <div className="p-7">
              {loadingInsights ? (
                <div className="flex items-center gap-2 py-6 text-ink-3">
                  <Loader2 size={18} className="animate-spin" /> Reading the market for {role || "your field"}…
                </div>
              ) : insights ? (
                <>
                  <p className="text-[0.98rem] leading-relaxed text-ink-2">{insights.market}</p>
                  {insights.outlook && (
                    <p className="mt-4 flex items-start gap-2 rounded-xl bg-bg-sunk p-4 text-sm text-ink-2">
                      <TrendingUp size={16} className="mt-0.5 shrink-0 text-primary" />
                      <span>{insights.outlook}</span>
                    </p>
                  )}
                  {insights.skills?.length > 0 && (
                    <div className="mt-5">
                      <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-ink-3">In-demand right now</p>
                      <div className="flex flex-wrap gap-2">
                        {insights.skills.map((s) => (
                          <span key={s} className="rounded-full border px-3 py-1 text-sm text-ink-2" style={{ borderColor: "var(--border-strong)" }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="mt-5 text-2xs text-ink-3">
                    General outlook for your field, refreshed weekly — not live headlines.
                  </p>
                </>
              ) : (
                <p className="py-6 text-ink-3">Insights will appear here once your role is set in onboarding.</p>
              )}
            </div>
          </section>

          {/* Right column: focus + prep tip + analytics link */}
          <div className="space-y-6">
            {m.weakest && m.hasData && (
              <section className="card p-6" style={{ borderLeft: "4px solid var(--amber)" }}>
                <div className="mb-1.5 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-amber-ink">
                  <TargetIcon size={14} /> Your focus this week
                </div>
                <p className="text-sm text-ink-2">
                  <strong className="text-ink">{m.weakest.label}</strong> is your lowest dimension at {m.weakest.current}.
                  A few focused reps is the fastest lift available.
                </p>
                <ButtonLink href={`/practice?focus=${m.weakest.key}&autostart=1`} variant="secondary" size="sm" className="mt-4 w-full">
                  Drill {m.weakest.label.toLowerCase()} <ArrowRight size={14} />
                </ButtonLink>
              </section>
            )}

            {insights?.tip && (
              <section className="card p-6">
                <div className="mb-1.5 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-primary-ink">
                  <Lightbulb size={14} /> Prep tip for your field
                </div>
                <p className="text-sm leading-relaxed text-ink-2">{insights.tip}</p>
              </section>
            )}

            <Link
              href="/analytics"
              className="group flex items-center justify-between rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <div>
                <p className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
                  <Sparkles size={17} className="text-primary" /> Full analytics
                </p>
                <p className="mt-0.5 text-sm text-ink-2">Readiness, skill breakdown, trajectory, and time to top 1%.</p>
              </div>
              <ArrowUpRight size={20} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        {/* Weekly plan + where to look + salary */}
        {insights && (insights.actions?.length || insights.channels?.length || insights.salary) && (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            {insights.actions && insights.actions.length > 0 && (
              <ActionPlan actions={insights.actions} />
            )}
            <div className="space-y-6">
              {insights.channels && insights.channels.length > 0 && (
                <section className="card p-6">
                  <div className="mb-3 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-primary-ink">
                    <MapPin size={14} /> Where to look
                  </div>
                  <ul className="space-y-2">
                    {insights.channels.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-sm text-ink-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--primary)" }} />
                        {c}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {insights.salary && (
                <section className="card p-6">
                  <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-sage-ink">
                    <Banknote size={14} /> Pay snapshot
                  </div>
                  <p className="text-sm leading-relaxed text-ink-2">{insights.salary}</p>
                </section>
              )}
            </div>
          </div>
        )}

        {/* Recent practice */}
        <section className="card p-6 sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-ink">Recent practice</h2>
            {sessions.length > 0 && <Link href="/analytics" className="text-sm text-primary-ink hover:underline">View all</Link>}
          </div>
          {sessions.length === 0 ? (
            <div className="grid place-items-center rounded-xl py-12 text-center" style={{ background: "var(--bg-sunk)" }}>
              <p className="text-sm text-ink-3">Nothing yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...sessions].reverse().slice(0, 5).map((s) => (
                <Link
                  key={s.id}
                  href={`/session/${s.id}`}
                  className="flex items-center gap-4 rounded-xl border p-3.5 transition-colors hover:bg-bg-tint"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{s.targetRole}</p>
                    <p className="text-2xs text-ink-3">{formatDate(s.createdAt)} · {s.answers.length} questions</p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-sm font-bold text-white" style={{ background: scoreColor(s.overall) }}>
                    {s.overall}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {!m.hasData && (
          <div className="rounded-2xl border-2 border-dashed p-6 text-center" style={{ borderColor: "var(--border-strong)" }}>
            <p className="font-serif text-lg font-semibold text-ink">Run your first session</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">
              Your streak, volume, and readiness fill in here after one practice. The market read above is ready now.
            </p>
            <ButtonLink href="/practice" size="lg" className="mt-4">
              Start practicing <ArrowRight size={18} />
            </ButtonLink>
          </div>
        )}
      </main>
    </AppShell>
  );
}

/* A small stat card for the dashboard's secondary metric grid. Flat, weak
   border, coloured icon chip — same language as the rest of the app. */
function MiniCard({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: typeof Award;
  title: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)` }}>
          <Icon size={15} style={{ color: tone }} />
        </span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function StatRow({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-ink-2">{label}</span>
      <span className={cn("font-mono text-sm font-semibold tabular-nums", good === undefined ? "text-ink" : good ? "text-sage-ink" : "text-coral-ink")}>
        {value}
        {sub && <span className="ml-1 font-sans text-2xs font-normal text-ink-3">{sub}</span>}
      </span>
    </div>
  );
}

/* Daily practice volume for the last two weeks. Div-based bars so it stays light
   and on-palette; height is relative to the busiest day. */
function DailyUsage({ activity }: { activity: { dateISO: string; count: number; score: number }[] }) {
  const max = Math.max(1, ...activity.map((a) => a.count));
  const total = activity.reduce((s, a) => s + a.count, 0);
  const dow = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "narrow" });
  return (
    <div>
      <div className="flex h-[180px] items-end gap-1.5">
        {activity.map((a) => (
          <div key={a.dateISO} className="flex flex-1 flex-col items-center gap-1.5" title={`${a.dateISO}: ${a.count} session${a.count === 1 ? "" : "s"}`}>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-md transition-all"
                style={{
                  height: `${a.count ? Math.max(8, (a.count / max) * 100) : 3}%`,
                  background: a.count ? "var(--primary)" : "var(--bg-sunk)",
                  opacity: a.count ? 1 : 0.7,
                }}
              />
            </div>
            <span className="text-[0.6rem] text-ink-3">{dow(a.dateISO)}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-3">
        <span className="font-semibold text-ink">{total}</span> session{total === 1 ? "" : "s"} in 14 days
      </p>
    </div>
  );
}

/* This week's job-search checklist. Persists per ISO week so ticking survives a
   reload; resets naturally when the week (and the insights) roll over. */
function ActionPlan({ actions }: { actions: string[] }) {
  const key = `pp:plan:${isoWeekKey()}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [key]);
  const toggle = (a: string) =>
    setDone((prev) => {
      const next = { ...prev, [a]: !prev[a] };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  const completed = actions.filter((a) => done[a]).length;
  return (
    <section className="card p-7">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
          <ListChecks size={18} className="text-primary" /> This week&apos;s plan
        </h2>
        <span className="font-mono text-sm font-semibold text-ink-3">{completed}/{actions.length}</span>
      </div>
      <p className="mb-4 text-sm text-ink-2">Three moves that keep the search alive. Check them off.</p>
      <div className="space-y-2">
        {actions.map((a) => {
          const on = !!done[a];
          return (
            <button
              key={a}
              onClick={() => toggle(a)}
              className="flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors"
              style={{ borderColor: on ? "var(--sage)" : "var(--border)", background: on ? "var(--sage-soft)" : "transparent" }}
            >
              {on ? <CheckCircle2 size={18} className="shrink-0 text-sage-ink" /> : <Circle size={18} className="shrink-0 text-ink-3" />}
              <span className={cn("text-sm", on ? "text-ink-2 line-through" : "text-ink")}>{a}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
