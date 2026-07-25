"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Flame, Gauge, CalendarDays, MessageSquare,
  Sparkles, TrendingUp, Target as TargetIcon, Newspaper, Lightbulb, Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { getOnboarding, getProfile, getSessions, getStreak, onStoreChange } from "@/lib/store";
import { apiInsights, type CareerInsights } from "@/lib/client";
import { computeMetrics } from "@/lib/metrics";
import { formatDuration, scoreColor } from "@/lib/utils";
import type { Session, Streak } from "@/lib/types";

/* The dashboard HOME: a calm, Attio-style overview. Usage at a glance (streak,
   volume, readiness) plus a weekly, cheap-LLM career read. The deep performance
   analytics live one click away at /analytics. */

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

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      setSessions(getSessions());
      setStreak(getStreak());
      const p = getProfile();
      const ob = getOnboarding();
      setName(p.name || "");
      setRole(p.targetRole || ob?.targetRole || "");
    };
    sync();
    return onStoreChange(sync);
  }, []);

  // Weekly insights, cached per ISO week per role so the LLM runs ~once a week.
  useEffect(() => {
    if (!mounted) return;
    const p = getProfile();
    const ob = getOnboarding();
    const r = p.targetRole || ob?.targetRole || "";
    const industry = (ob as { industry?: string } | null)?.industry || "";
    const key = `pp:insights:${isoWeekKey()}:${r}`.slice(0, 120);
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        setInsights(JSON.parse(cached));
        setLoadingInsights(false);
        return;
      }
    } catch {
      /* ignore */
    }
    let alive = true;
    apiInsights({ role: r, industry }).then((res) => {
      if (!alive) return;
      if (res) {
        setInsights(res);
        try { localStorage.setItem(key, JSON.stringify(res)); } catch { /* quota */ }
      }
      setLoadingInsights(false);
    });
    return () => { alive = false; };
  }, [mounted]);

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

        {/* Usage stats */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="card p-5">
                <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-3">
                  <Icon size={14} style={{ color: t.tone }} /> {t.label}
                </div>
                <p className="mt-2 font-mono text-3xl font-semibold leading-none" style={{ color: t.tone }}>
                  <AnimatedNumber value={t.value} />
                </p>
                <p className="mt-2 text-xs text-ink-3">{t.sub}</p>
              </div>
            );
          })}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Weekly market read */}
          <section className="card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b px-7 py-4" style={{ borderColor: "var(--border)" }}>
              <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
                <Newspaper size={18} className="text-primary" /> This week&apos;s market read
              </h2>
              <span className="text-2xs font-medium uppercase tracking-wider text-ink-3">Updated weekly</span>
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
