'use client';

import { useEffect, useState } from 'react';

interface Funnel {
  charts_total: number;
  charts_today: number;
  charts_with_email: number;
  charts_claimed_by_user: number;
  readings_generated: number;
  accounts_created: number;
  accounts_today: number;
  paid_trialing: number;
  paid_weekly: number;
  paid_annual: number;
  canceled: number;
}

interface Data {
  funnel: Funnel;
  engagement: { daily_briefs: number; chat_messages: number; decisions_logged: number };
  recent: { first_name: string; email: string; archetype: string; sun_sign: string; created_at: string }[];
  daily: [string, { charts: number; withEmail: number; claimed: number }][];
}

export default function Dashboard() {
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');

  async function load(password: string) {
    const res = await fetch(`/api/funnel?pw=${password}`);
    if (!res.ok) { setError('Wrong password'); return; }
    setData(await res.json());
    setAuthed(true);
  }

  useEffect(() => {
    if (!authed) return;
    const t = setInterval(() => load(pw), 30_000);
    return () => clearInterval(t);
  }, [authed, pw]);

  if (!authed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0e0e0c]">
        <form onSubmit={(e) => { e.preventDefault(); void load(pw); }} className="space-y-4 text-center">
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(''); }}
            placeholder="Password"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30"
            autoFocus
          />
          <br />
          <button type="submit" className="rounded-lg bg-white/10 px-6 py-2.5 text-sm text-white hover:bg-white/20">
            Enter
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </div>
    );
  }

  if (!data) return null;
  const f = data.funnel;
  const e = data.engagement;

  const paidTotal = f.paid_trialing + f.paid_weekly + f.paid_annual;
  const rate = (a: number, b: number) => b === 0 ? '—' : `${Math.round((a / b) * 100)}%`;

  const steps = [
    { label: 'Landing Page Visits', value: '—', sub: 'From Meta Pixel', color: 'bg-white/10' },
    { label: 'Charts Created', value: f.charts_total, sub: `${f.charts_today} today`, color: 'bg-amber-500/20' },
    { label: 'Email Captured', value: f.charts_with_email, sub: rate(f.charts_with_email, f.charts_total) + ' of charts', color: 'bg-amber-500/30' },
    { label: 'Account Created', value: f.accounts_created, sub: `${f.accounts_today} today · ${rate(f.accounts_created, f.charts_total)} of charts`, color: 'bg-emerald-500/20' },
    { label: 'Chart Claimed', value: f.charts_claimed_by_user, sub: rate(f.charts_claimed_by_user, f.accounts_created) + ' of accounts', color: 'bg-emerald-500/30' },
    { label: 'Reading Generated', value: f.readings_generated, sub: rate(f.readings_generated, f.charts_total) + ' of charts', color: 'bg-emerald-500/40' },
    { label: 'Free Trial Started', value: f.paid_trialing, sub: rate(f.paid_trialing, f.accounts_created) + ' of accounts', color: 'bg-blue-500/30' },
    { label: 'Paid (Weekly)', value: f.paid_weekly, sub: rate(f.paid_weekly, paidTotal || 1) + ' of paid', color: 'bg-violet-500/30' },
    { label: 'Paid (Annual)', value: f.paid_annual, sub: rate(f.paid_annual, paidTotal || 1) + ' of paid', color: 'bg-violet-500/40' },
    { label: 'Canceled', value: f.canceled, sub: rate(f.canceled, paidTotal + f.canceled || 1) + ' churn', color: 'bg-red-500/20' },
  ];

  const maxVal = Math.max(...steps.map(s => typeof s.value === 'number' ? s.value : 0), 1);

  return (
    <div className="min-h-dvh bg-[#0e0e0c] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Axon Funnel</h1>
          <p className="text-xs text-white/40">Auto-refreshes every 30s</p>
        </div>

        {/* Visual funnel */}
        <div className="mt-8 space-y-2">
          {steps.map((s, i) => {
            const w = typeof s.value === 'number' ? Math.max(8, (s.value / maxVal) * 100) : 100;
            return (
              <div key={s.label} className="flex items-center gap-4">
                <div className="w-[160px] shrink-0 text-right">
                  <p className="text-xs text-white/50">{s.label}</p>
                </div>
                <div className="flex-1">
                  <div
                    className={`flex items-center justify-between rounded-md px-3 py-2.5 transition-all ${s.color}`}
                    style={{ width: `${w}%` }}
                  >
                    <span className="text-lg font-bold tabular-nums">{s.value}</span>
                    <span className="text-xs text-white/50">{s.sub}</span>
                  </div>
                </div>
                {i < steps.length - 1 && i > 0 && typeof s.value === 'number' && typeof steps[i-1].value === 'number' && (
                  <div className="w-[50px] shrink-0 text-right text-xs text-white/30">
                    {rate(s.value as number, steps[i-1].value as number)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Engagement */}
        <div className="mt-10 grid grid-cols-3 gap-3">
          {[
            ['Daily Briefs', e.daily_briefs],
            ['Chat Messages', e.chat_messages],
            ['Decisions Logged', e.decisions_logged],
          ].map(([label, val]) => (
            <div key={label as string} className="rounded-lg bg-white/5 p-4 text-center">
              <p className="text-2xl font-bold tabular-nums">{val}</p>
              <p className="mt-1 text-xs text-white/40">{label}</p>
            </div>
          ))}
        </div>

        {/* Daily breakdown */}
        {data.daily.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-medium text-white/60">Daily Breakdown</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs text-white/40">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4 text-right">Charts</th>
                    <th className="pb-2 pr-4 text-right">With Email</th>
                    <th className="pb-2 text-right">Claimed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map(([day, d]) => (
                    <tr key={day} className="border-b border-white/5">
                      <td className="py-2 pr-4 tabular-nums text-white/70">{day}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{d.charts}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{d.withEmail}</td>
                      <td className="py-2 text-right tabular-nums">{d.claimed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent charts */}
        <div className="mt-10">
          <h2 className="text-sm font-medium text-white/60">Recent Charts</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-white/40">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Archetype</th>
                  <th className="pb-2 pr-4">Sign</th>
                  <th className="pb-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((c, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-white/80">{c.first_name}</td>
                    <td className="py-2 pr-4 text-white/50">{c.email}</td>
                    <td className="py-2 pr-4 text-amber-400/80">{c.archetype}</td>
                    <td className="py-2 pr-4 text-white/60">{c.sun_sign}</td>
                    <td className="py-2 tabular-nums text-white/40">
                      {new Date(c.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })} ET
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
