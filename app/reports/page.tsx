"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Users, Eye, MousePointerClick, UserCheck, Loader2, TrendingDown, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* Owner-only product analytics, SPLIT OUT of the app — no app chrome, not in any
   nav, gated by a password (REPORTS_PASSWORD). Page-by-page traffic + the
   acquisition funnel from our own first-party event log (public.events). */

type Report = {
  days: number;
  totals: { events: number; visitors: number; pageviews: number; identified: number };
  pages: { path: string; views: number; visitors: number }[];
  events: { name: string; count: number; users: number }[];
  funnel: { land: number; onboard: number; onboard_done: number; account: number; scored: number; subscribed: number };
  daily: { day: string; events: number; views: number }[];
};

const FUNNEL_STEPS: { key: keyof Report["funnel"]; label: string; event: string }[] = [
  { key: "land", label: "Landed on site", event: "page:view" },
  { key: "onboard", label: "Started onboarding", event: "onboarding_situation" },
  { key: "onboard_done", label: "Finished onboarding", event: "onboarding_complete" },
  { key: "account", label: "Created account", event: "account_created" },
  { key: "scored", label: "First scored answer", event: "session_complete" },
  { key: "subscribed", label: "Subscribed", event: "upgrade_success" },
];

const pc = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "—");

export default function ReportsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "demo" | "error">("idle");
  const [report, setReport] = useState<Report | null>(null);
  const [pw, setPw] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [authErr, setAuthErr] = useState("");

  // Restore a password unlocked earlier this browser session.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("reports_pw");
      if (saved) { setPw(saved); setUnlocked(true); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!unlocked || !pw) return;
    let alive = true;
    setState("loading");
    fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days, password: pw }),
    })
      .then(async (r) => ({ ok: r.ok, status: r.status, d: await r.json() }))
      .then(({ ok, status, d }) => {
        if (!alive) return;
        if (status === 401) { setUnlocked(false); setAuthErr("Wrong password."); try { sessionStorage.removeItem("reports_pw"); } catch {} return; }
        if (d.configured === false) return setState("demo");
        if (!ok || d.error || !d.report) return setState("error");
        setReport(d.report as Report);
        setState("ready");
      })
      .catch(() => alive && setState("error"));
    return () => { alive = false; };
  }, [days, unlocked, pw]);

  const maxDaily = useMemo(
    () => Math.max(1, ...(report?.daily || []).map((x) => x.events)),
    [report]
  );
  const land = report?.funnel.land || 0;
  const empty = state === "ready" && (report?.totals.events || 0) === 0;

  // ── password gate ──
  if (!unlocked) {
    return (
      <main className="grid min-h-screen place-items-center px-5" style={{ background: "var(--bg)" }}>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!pw.trim()) return; setAuthErr(""); try { sessionStorage.setItem("reports_pw", pw.trim()); } catch {} setUnlocked(true); }}
          className="w-full max-w-xs text-center"
        >
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full" style={{ background: "var(--bg-sunk)" }}><Lock size={20} className="text-ink-2" /></span>
          <h1 className="mt-4 font-serif text-xl font-semibold text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ink-3">Enter the password to continue.</p>
          <input
            type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)}
            placeholder="Password" className="field mt-5 text-center"
          />
          {authErr && <p className="mt-2 text-sm text-coral-ink">{authErr}</p>}
          <button type="submit" className="btn-primary mt-4 w-full">Unlock</button>
        </form>
      </main>
    );
  }

  return (
    <>
      <main className="container-wide space-y-6 py-8 sm:py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Product analytics</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">Reports</h1>
            <p className="mt-1 text-ink-2">
              Page-by-page traffic and the acquisition funnel, from your own first-party event log.
            </p>
          </div>
          <div className="flex gap-1 rounded-full bg-bg-tint p-1">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  days === d ? "bg-white text-ink shadow-xs" : "text-ink-2 hover:text-ink"
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </header>

        {state === "loading" && (
          <div className="grid place-items-center py-24">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        )}

        {state === "demo" && (
          <Note title="Connect Supabase to see live reports">
            This deployment has no Supabase key set, so there&apos;s no event store to read yet. Reports light up the
            moment the app is running against Supabase in production.
          </Note>
        )}

        {state === "error" && (
          <Note title="Couldn&apos;t load reports">
            The report query failed. Make sure the <code>events</code> table and <code>report_summary</code> function
            exist (they&apos;re in <code>supabase/schema.sql</code>).
          </Note>
        )}

        {state === "ready" && report && (
          <>
            {empty && (
              <Note title="No events in this window yet">
                Tracking is live and wired page by page — the numbers below fill in as soon as real traffic arrives.
                Every route fires a <code>page:view</code>, and each funnel step is its own event.
              </Note>
            )}

            {/* Totals */}
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Tile icon={Users} label="Visitors" value={report.totals.visitors} tone="var(--primary-bright)" />
              <Tile icon={Eye} label="Pageviews" value={report.totals.pageviews} tone="var(--primary)" />
              <Tile icon={MousePointerClick} label="Events" value={report.totals.events} tone="var(--ink-2)" />
              <Tile icon={UserCheck} label="Identified" value={report.totals.identified} tone="var(--sage)" />
            </section>

            {/* Funnel */}
            <section className="card p-7">
              <h2 className="font-serif text-lg font-semibold text-ink">Acquisition funnel</h2>
              <p className="mt-0.5 text-sm text-ink-2">Land → subscribe, unique people at each step in the last {report.days} days.</p>
              <div className="mt-5 space-y-2.5">
                {FUNNEL_STEPS.map((s, i) => {
                  const val = report.funnel[s.key] || 0;
                  const prev = i === 0 ? val : report.funnel[FUNNEL_STEPS[i - 1].key] || 0;
                  return (
                    <div key={s.key} className="grid grid-cols-[160px_1fr_auto] items-center gap-3">
                      <div>
                        <p className="text-sm font-medium text-ink">{s.label}</p>
                        <p className="font-mono text-2xs text-ink-3">{s.event}</p>
                      </div>
                      <div className="h-7 overflow-hidden rounded-md" style={{ background: "var(--bg-tint)" }}>
                        <div
                          className="flex h-full items-center rounded-md px-2 text-2xs font-semibold text-white transition-all duration-500"
                          style={{
                            width: `${land ? Math.max((val / land) * 100, val ? 4 : 0) : 0}%`,
                            background: "linear-gradient(90deg, var(--primary), var(--primary-bright))",
                          }}
                        >
                          {val || ""}
                        </div>
                      </div>
                      <div className="w-28 text-right">
                        <span className="font-mono text-sm font-semibold text-ink">{pc(val, land)}</span>
                        {i > 0 && (
                          <span className="ml-2 inline-flex items-center gap-0.5 font-mono text-2xs text-ink-3">
                            <TrendingDown size={11} /> {pc(val, prev)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Pages */}
              <section className="card p-7">
                <h2 className="flex items-center gap-1.5 font-serif text-lg font-semibold text-ink">
                  <BarChart3 size={17} className="text-primary" /> Pages
                </h2>
                <p className="mt-0.5 text-sm text-ink-2">Views and unique visitors, by route.</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-2xs uppercase tracking-wider text-ink-3">
                        <th className="pb-2 text-left font-semibold">Path</th>
                        <th className="pb-2 text-right font-semibold">Views</th>
                        <th className="pb-2 text-right font-semibold">Visitors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.pages.length === 0 && (
                        <tr><td colSpan={3} className="py-4 text-center text-ink-3">No pageviews yet.</td></tr>
                      )}
                      {report.pages.map((p) => (
                        <tr key={p.path} className="border-t" style={{ borderColor: "var(--border)" }}>
                          <td className="max-w-[220px] truncate py-2.5 font-mono text-xs text-ink">{p.path}</td>
                          <td className="py-2.5 text-right font-mono font-semibold text-ink">{p.views}</td>
                          <td className="py-2.5 text-right font-mono text-ink-2">{p.visitors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Top events */}
              <section className="card p-7">
                <h2 className="font-serif text-lg font-semibold text-ink">Top events</h2>
                <p className="mt-0.5 text-sm text-ink-2">Named funnel steps and clicks, most frequent first.</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-2xs uppercase tracking-wider text-ink-3">
                        <th className="pb-2 text-left font-semibold">Event</th>
                        <th className="pb-2 text-right font-semibold">Count</th>
                        <th className="pb-2 text-right font-semibold">Users</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.events.length === 0 && (
                        <tr><td colSpan={3} className="py-4 text-center text-ink-3">No events yet.</td></tr>
                      )}
                      {report.events.map((e) => (
                        <tr key={e.name} className="border-t" style={{ borderColor: "var(--border)" }}>
                          <td className="max-w-[220px] truncate py-2.5 font-mono text-xs text-ink">{e.name}</td>
                          <td className="py-2.5 text-right font-mono font-semibold text-ink">{e.count}</td>
                          <td className="py-2.5 text-right font-mono text-ink-2">{e.users}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* Daily activity */}
            <section className="card p-7">
              <h2 className="font-serif text-lg font-semibold text-ink">Daily activity</h2>
              <p className="mt-0.5 text-sm text-ink-2">Events per day over the window.</p>
              <div className="mt-5 flex h-32 items-end gap-1">
                {report.daily.length === 0 && <p className="text-ink-3">No activity yet.</p>}
                {report.daily.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.events} events, ${d.views} views`}>
                    <div
                      className="w-full rounded-t transition-all duration-500"
                      style={{
                        height: `${(d.events / maxDaily) * 100}%`,
                        minHeight: d.events ? 4 : 1,
                        background: "linear-gradient(180deg, var(--primary-bright), var(--primary))",
                      }}
                    />
                    <span className="text-[9px] text-ink-3">{d.day}</span>
                  </div>
                ))}
              </div>
            </section>

            <p className="text-center text-xs text-ink-3">
              First-party data from your own event log. Also flowing to Mixpanel and Vercel Web Analytics.
            </p>
          </>
        )}
      </main>
    </>
  );
}

function Tile({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-3">
        <Icon size={14} style={{ color: tone }} /> {label}
      </div>
      <p className="mt-2 font-mono text-3xl font-semibold leading-none" style={{ color: tone }}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed p-6" style={{ borderColor: "var(--border-strong)" }}>
      <p className="font-serif text-lg font-semibold text-ink">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}
