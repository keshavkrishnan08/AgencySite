"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Users, Eye, MousePointerClick, UserCheck, Loader2, Lock,
  TrendingDown, ArrowRight, Smartphone, Monitor, Tablet, Globe, Clock,
  Target, Zap, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* Owner-only hyper-detailed conversion analytics.
   Password-gated. Not linked from any nav. Micro step-by-step funnel,
   device breakdown, hourly heatmap, UTM attribution, drop-off analysis,
   session journeys, and lead details. */

type Report = {
  totals: { total_events: number; unique_visitors: number; pageviews: number; identified_users: number };
  funnel: Record<string, number>;
  microFunnel: { step: string; count: number; users: number }[];
  pages: { path: string; views: number; visitors: number }[];
  topEvents: { name: string; count: number; users: number }[];
  daily: { day: string; events: number; views: number; visitors: number; cta_clicks: number; onboards: number; accounts: number }[];
  hourly: { hour: number; views: number; clicks: number }[];
  devices: { device: string; visitors: number; cta_clicks: number }[];
  referrers: { referrer: string; visitors: number }[];
  utmSources: { source: string; campaign: string; visitors: number; cta_clicks: number; onboards: number; accounts: number }[];
  leadDetails: { email: string; situation: string; target_role: string; source: string; utm_source: string; landing_path: string; created_at: string; converted_at: string | null }[];
  sessionFlow: { anon_id: string; journey: string[]; events: number; first_seen: string; last_seen: string }[];
  dropoffs: { name: string; path: string; exits: number }[];
};

const FUNNEL_STEPS = [
  { key: "land", label: "Landed", color: "var(--primary-bright)", benchmark: "100%" },
  { key: "cta_click", label: "Clicked CTA", color: "var(--primary)", benchmark: "3-8%" },
  { key: "onboard_start", label: "Started onboarding", color: "var(--primary)", benchmark: "2-5%" },
  { key: "onboard_answer", label: "Answered a question", color: "var(--primary-ink)", benchmark: "1.5-4%" },
  { key: "onboard_done", label: "Finished onboarding", color: "var(--primary-ink)", benchmark: "1-3%" },
  { key: "account_created", label: "Created account", color: "var(--sage)", benchmark: "0.8-2.5%" },
  { key: "session_started", label: "Started practice", color: "var(--sage)", benchmark: "0.5-2%" },
  { key: "first_scored", label: "Got first score", color: "var(--sage-ink)", benchmark: "0.4-1.5%" },
  { key: "session_complete", label: "Completed session", color: "var(--sage-ink)", benchmark: "0.3-1.2%" },
  { key: "upgrade_view", label: "Saw pricing", color: "var(--amber)", benchmark: "0.2-1%" },
  { key: "upgrade_click", label: "Clicked subscribe", color: "var(--amber-ink)", benchmark: "0.1-0.5%" },
  { key: "upgrade_success", label: "Paid", color: "var(--gold)", benchmark: "0.05-0.3%" },
];

const pc = (n: number, d: number) => d ? `${((n / d) * 100).toFixed(1)}%` : "—";
const fmt = (n: number) => n?.toLocaleString() || "0";

export default function AnalyticsAdmin() {
  const [days, setDays] = useState<1 | 7 | 30 | 90>(7);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [report, setReport] = useState<Report | null>(null);
  const [pw, setPw] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("analytics_pw");
      if (saved) { setPw(saved); setUnlocked(true); }
    } catch {}
  }, []);

  useEffect(() => {
    if (!unlocked || !pw) return;
    let alive = true;
    setState("loading");
    fetch("/api/analytics-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days, password: pw }),
    })
      .then(async (r) => ({ ok: r.ok, status: r.status, d: await r.json() }))
      .then(({ ok, status, d }) => {
        if (!alive) return;
        if (status === 401) { setUnlocked(false); setErrMsg("Wrong password."); sessionStorage.removeItem("analytics_pw"); return; }
        if (!ok || d.error) { setErrMsg(d.error || "Failed"); setState("error"); return; }
        if (d.configured === false) { setErrMsg("Supabase not configured."); setState("error"); return; }
        setReport(d.report);
        setState("ready");
      })
      .catch(() => alive && setState("error"));
    return () => { alive = false; };
  }, [days, unlocked, pw]);

  const land = report?.funnel?.land || 0;
  const maxDaily = useMemo(() => Math.max(1, ...(report?.daily || []).map(d => d.visitors)), [report]);
  const maxHourly = useMemo(() => Math.max(1, ...(report?.hourly || []).map(h => h.views)), [report]);

  // Password gate
  if (!unlocked) {
    return (
      <main className="grid min-h-screen place-items-center px-5" style={{ background: "#0f172a" }}>
        <form onSubmit={(e) => { e.preventDefault(); if (!pw.trim()) return; setErrMsg(""); sessionStorage.setItem("analytics_pw", pw.trim()); setUnlocked(true); }} className="w-full max-w-xs text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-800"><Lock size={20} className="text-slate-400" /></span>
          <h1 className="mt-4 text-xl font-semibold text-white">Conversion Analytics</h1>
          <p className="mt-1 text-sm text-slate-400">Owner access only.</p>
          <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" className="mt-5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-center text-white placeholder-slate-500 outline-none focus:border-blue-500" />
          {errMsg && <p className="mt-2 text-sm text-red-400">{errMsg}</p>}
          <button type="submit" className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-500">Unlock</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8" style={{ background: "#0f172a", color: "#e2e8f0" }}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">Axon Careers</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Conversion Analytics</h1>
          </div>
          <div className="flex gap-1 rounded-full bg-slate-800 p-1">
            {([1, 7, 30, 90] as const).map((d) => (
              <button key={d} onClick={() => setDays(d)} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors", days === d ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white")}>{d === 1 ? "Today" : `${d}d`}</button>
            ))}
          </div>
        </header>

        {state === "loading" && <div className="grid place-items-center py-24"><Loader2 size={28} className="animate-spin text-blue-400" /></div>}
        {state === "error" && <div className="rounded-xl border border-red-800 bg-red-950/50 p-6 text-red-300">{errMsg || "Failed to load."}</div>}

        {state === "ready" && report && (
          <>
            {/* ── Totals ── */}
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Tile icon={Users} label="Visitors" value={report.totals.unique_visitors} />
              <Tile icon={Eye} label="Pageviews" value={report.totals.pageviews} />
              <Tile icon={MousePointerClick} label="Events" value={report.totals.total_events} />
              <Tile icon={UserCheck} label="Identified" value={report.totals.identified_users} />
            </section>

            {/* ── Micro Funnel ── */}
            <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h2 className="text-lg font-bold text-white">Micro Conversion Funnel</h2>
              <p className="mt-0.5 text-sm text-slate-400">Every step from landing to payment. Unique users.</p>
              <div className="mt-5 space-y-2">
                {FUNNEL_STEPS.map((s, i) => {
                  const val = Number(report.funnel[s.key]) || 0;
                  const prev = i === 0 ? val : Number(report.funnel[FUNNEL_STEPS[i - 1].key]) || 0;
                  const stepRate = prev ? ((val / prev) * 100).toFixed(1) : "—";
                  return (
                    <div key={s.key} className="grid grid-cols-[180px_1fr_160px] items-center gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-200">{s.label}</p>
                        <p className="text-[10px] text-slate-500">benchmark: {s.benchmark}</p>
                      </div>
                      <div className="h-8 overflow-hidden rounded-md bg-slate-900">
                        <div className="flex h-full items-center rounded-md px-3 text-xs font-bold text-white transition-all duration-700" style={{ width: `${land ? Math.max((val / land) * 100, val ? 3 : 0) : 0}%`, background: s.color, minWidth: val ? 40 : 0 }}>
                          {val || ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-bold text-white">{pc(val, land)}</span>
                        {i > 0 && <span className="ml-2 font-mono text-xs text-slate-500">↓{stepRate}%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Daily Chart ── */}
            <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h2 className="text-lg font-bold text-white">Daily Breakdown</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-2 text-left">Date</th><th className="pb-2 text-right">Visitors</th><th className="pb-2 text-right">Views</th><th className="pb-2 text-right">CTA Clicks</th><th className="pb-2 text-right">Onboards</th><th className="pb-2 text-right">Accounts</th><th className="pb-2 text-right">CTR</th>
                  </tr></thead>
                  <tbody>
                    {report.daily.map((d) => (
                      <tr key={d.day} className="border-t border-slate-700/50">
                        <td className="py-2 font-mono text-xs text-slate-300">{d.day}</td>
                        <td className="py-2 text-right font-mono font-bold text-white">{fmt(d.visitors)}</td>
                        <td className="py-2 text-right font-mono text-slate-300">{fmt(d.views)}</td>
                        <td className="py-2 text-right font-mono text-blue-400">{fmt(d.cta_clicks)}</td>
                        <td className="py-2 text-right font-mono text-emerald-400">{fmt(d.onboards)}</td>
                        <td className="py-2 text-right font-mono text-amber-400">{fmt(d.accounts)}</td>
                        <td className="py-2 text-right font-mono text-slate-400">{pc(d.cta_clicks, d.visitors)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* ── Devices ── */}
              <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Smartphone size={18} /> Devices</h2>
                <div className="mt-4 space-y-3">
                  {report.devices.map((d) => (
                    <div key={d.device} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {d.device === "Mobile" ? <Smartphone size={16} className="text-blue-400" /> : d.device === "Tablet" ? <Tablet size={16} className="text-purple-400" /> : <Monitor size={16} className="text-emerald-400" />}
                        <span className="text-sm text-slate-200">{d.device}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-bold text-white">{fmt(d.visitors)}</span>
                        <span className="ml-2 font-mono text-xs text-slate-500">{fmt(d.cta_clicks)} clicks</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Referrers ── */}
              <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Globe size={18} /> Referrers</h2>
                <div className="mt-4 space-y-2">
                  {report.referrers.slice(0, 10).map((r) => (
                    <div key={r.referrer} className="flex items-center justify-between">
                      <span className="max-w-[250px] truncate font-mono text-xs text-slate-300">{r.referrer}</span>
                      <span className="font-mono text-sm font-bold text-white">{fmt(r.visitors)}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* ── UTM Attribution ── */}
            <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Target size={18} /> Ad Attribution (UTM)</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-2 text-left">Source</th><th className="pb-2 text-left">Campaign</th><th className="pb-2 text-right">Visitors</th><th className="pb-2 text-right">CTA</th><th className="pb-2 text-right">Onboards</th><th className="pb-2 text-right">Accounts</th>
                  </tr></thead>
                  <tbody>
                    {report.utmSources.map((u, i) => (
                      <tr key={i} className="border-t border-slate-700/50">
                        <td className="py-2 font-mono text-xs text-blue-400">{u.source}</td>
                        <td className="py-2 font-mono text-xs text-slate-300">{u.campaign}</td>
                        <td className="py-2 text-right font-mono font-bold text-white">{fmt(u.visitors)}</td>
                        <td className="py-2 text-right font-mono text-slate-300">{fmt(u.cta_clicks)}</td>
                        <td className="py-2 text-right font-mono text-emerald-400">{fmt(u.onboards)}</td>
                        <td className="py-2 text-right font-mono text-amber-400">{fmt(u.accounts)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Hourly Heatmap ── */}
            <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Clock size={18} /> Hourly Traffic</h2>
              <div className="mt-4 flex h-24 items-end gap-1">
                {report.hourly.map((h) => (
                  <div key={h.hour} className="flex flex-1 flex-col items-center gap-1" title={`${h.hour}:00 — ${h.views} views, ${h.clicks} clicks`}>
                    <div className="w-full rounded-t transition-all" style={{ height: `${(h.views / maxHourly) * 100}%`, minHeight: h.views ? 3 : 1, background: h.clicks > 0 ? "#3b82f6" : "#334155" }} />
                    <span className="text-[8px] text-slate-500">{h.hour}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Blue = hours with CTA clicks</p>
            </section>

            {/* ── Drop-offs ── */}
            <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white"><AlertTriangle size={18} /> Where Users Drop Off</h2>
              <p className="mt-0.5 text-sm text-slate-400">Last event before a user leaves. Biggest leaks first.</p>
              <div className="mt-4 space-y-2">
                {report.dropoffs.slice(0, 12).map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs text-red-400">{d.name}</span>
                      <span className="ml-2 font-mono text-xs text-slate-500">{d.path}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-white">{d.exits} exits</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* ── Pages ── */}
              <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                <h2 className="text-lg font-bold text-white">Pages</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="pb-2 text-left">Path</th><th className="pb-2 text-right">Views</th><th className="pb-2 text-right">Visitors</th></tr></thead>
                    <tbody>
                      {report.pages.map((p) => (
                        <tr key={p.path} className="border-t border-slate-700/50">
                          <td className="max-w-[200px] truncate py-2 font-mono text-xs text-slate-300">{p.path}</td>
                          <td className="py-2 text-right font-mono font-bold text-white">{fmt(p.views)}</td>
                          <td className="py-2 text-right font-mono text-slate-400">{fmt(p.visitors)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── Top Events ── */}
              <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                <h2 className="text-lg font-bold text-white">Top Events</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="pb-2 text-left">Event</th><th className="pb-2 text-right">Count</th><th className="pb-2 text-right">Users</th></tr></thead>
                    <tbody>
                      {report.topEvents.slice(0, 20).map((e) => (
                        <tr key={e.name} className="border-t border-slate-700/50">
                          <td className="max-w-[200px] truncate py-2 font-mono text-xs text-slate-300">{e.name}</td>
                          <td className="py-2 text-right font-mono font-bold text-white">{fmt(e.count)}</td>
                          <td className="py-2 text-right font-mono text-slate-400">{fmt(e.users)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* ── Recent Leads ── */}
            <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h2 className="text-lg font-bold text-white">Recent Leads</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-2 text-left">Email</th><th className="pb-2 text-left">Role</th><th className="pb-2 text-left">Situation</th><th className="pb-2 text-left">Source</th><th className="pb-2 text-left">UTM</th><th className="pb-2 text-left">Date</th><th className="pb-2 text-left">Paid?</th>
                  </tr></thead>
                  <tbody>
                    {report.leadDetails.map((l, i) => (
                      <tr key={i} className="border-t border-slate-700/50">
                        <td className="max-w-[180px] truncate py-2 font-mono text-xs text-blue-400">{l.email}</td>
                        <td className="py-2 text-xs text-slate-300">{l.target_role}</td>
                        <td className="py-2 text-xs text-slate-400">{l.situation}</td>
                        <td className="py-2 font-mono text-xs text-slate-400">{l.source}</td>
                        <td className="py-2 font-mono text-xs text-slate-500">{l.utm_source || "—"}</td>
                        <td className="py-2 font-mono text-xs text-slate-500">{new Date(l.created_at).toLocaleDateString()}</td>
                        <td className="py-2 text-xs">{l.converted_at ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Session Journeys ── */}
            <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h2 className="text-lg font-bold text-white">Recent User Journeys</h2>
              <p className="mt-0.5 text-sm text-slate-400">Step-by-step path each visitor took (last 50 multi-event sessions).</p>
              <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto">
                {report.sessionFlow.slice(0, 30).map((s, i) => (
                  <div key={i} className="rounded-lg border border-slate-700/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-slate-500">{s.anon_id}</span>
                      <span className="font-mono text-xs text-slate-500">{s.events} events</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.journey.map((step, j) => (
                        <span key={j} className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[10px]",
                          step.includes("upgrade") ? "bg-amber-900/50 text-amber-300" :
                          step.includes("account") ? "bg-emerald-900/50 text-emerald-300" :
                          step.includes("onboarding") ? "bg-blue-900/50 text-blue-300" :
                          step.includes("session") || step.includes("practice") ? "bg-purple-900/50 text-purple-300" :
                          step.includes("exit") ? "bg-red-900/50 text-red-300" :
                          "bg-slate-700 text-slate-300"
                        )}>{step.replace("page:", "").replace("onboarding:", "ob:")}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <p className="text-center text-xs text-slate-600">First-party data · axonservices.dev · {days}-day window</p>
          </>
        )}
      </div>
    </main>
  );
}

function Tile({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <Icon size={14} className="text-blue-400" /> {label}
      </div>
      <p className="mt-2 font-mono text-3xl font-bold text-white">{fmt(value)}</p>
    </div>
  );
}
