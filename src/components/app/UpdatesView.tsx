'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AskChip, LockedInline, useShell } from './AppShell';
import { Locked } from './Locked';
import { SkeletonLines } from './Skeleton';

export type Cadence = 'daily' | 'weekly' | 'monthly';

export interface Entry {
  date: string;
  headline: string;
  body: string;
  action: string | null;
}

export interface DecisionRow {
  id: string;
  decided_on: string;
  body: string;
}

const PROMPTS = [
  'What did you decide today?',
  'What call did you make?',
  'What did you ship, send, or say yes to?',
  'What did you commit to today?',
  'What did you finally do?',
];

export function UpdatesView({
  firstName,
  archetype,
  cadence,
  entry,
  prevDate,
  nextDate,
  emailOptIn,
  decisions: initialDecisions,
  streak,
  logged,
}: {
  firstName: string;
  archetype: string;
  cadence: Cadence;
  entry: Entry | null;
  prevDate: string | null;
  nextDate: string | null;
  emailOptIn: boolean;
  decisions: DecisionRow[];
  streak: number;
  logged: number;
}) {
  const { isPaid } = useShell();
  const [decisions, setDecisions] = useState(initialDecisions);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notify, setNotify] = useState<boolean | null>(emailOptIn ? true : null);
  const [justLogged, setJustLogged] = useState(false);

  const todayHasDecision = decisions.some(
    (d) => d.decided_on === new Date().toISOString().slice(0, 10),
  );

  async function log() {
    const body = draft.trim();
    if (!body || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.decision) {
        throw new Error(json?.error ?? 'Could not save that. Try again.');
      }
      setDecisions((d) => [json.decision, ...d]);
      setDraft('');
      setJustLogged(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function setNotifications(on: boolean) {
    setNotify(on);
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ on }),
      });
    } catch {}
  }

  const stamp = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
    });

  const prompt = PROMPTS[Math.floor(Date.now() / 86_400_000) % PROMPTS.length];

  return (
    <div className="mx-auto max-w-[820px] space-y-10 pb-8">
      {/* -------------------------------------------------- date navigation */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-[23px] font-normal leading-tight sm:text-[29px]">
          Your daily briefing
        </h1>
        <div className="flex items-center gap-1">
          <ArrowLink href={prevDate ? `/updates?date=${prevDate}` : null} dir="prev" />
          <span className="min-w-[110px] text-center font-mono text-[11px] uppercase tracking-label text-ink/60">
            {entry ? stamp(entry.date) : '—'}
          </span>
          <ArrowLink href={nextDate ? `/updates?date=${nextDate}` : null} dir="next" />
        </div>
      </div>

      {/* ------------------------------------------------------ the briefing */}
      <section>
        {!entry ? (
          <div className="card">
            <SkeletonLines lines={3} />
            <p className="mt-6 eyebrow">Not written yet</p>
            <p className="mt-3 font-serif text-[22px] leading-snug">
              Your briefing lands in the morning.
            </p>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink/70">
              It is computed from where the sky is against your own chart, so it
              is written after the positions for the period settle — not in advance.
            </p>
          </div>
        ) : (
          <>
            <p className="eyebrow">{stamp(entry.date)}</p>
            <h2 className="mt-3 font-serif text-[23px] font-normal leading-[1.16] sm:text-[29px]">
              {entry.headline}
            </h2>
            <p className="mt-3.5 text-[14px] leading-[1.7] text-ink/85">{entry.body}</p>
          </>
        )}
      </section>

      {/* ---------------------------------------------------- your move today */}
      {entry && (
        <section>
          <p className="eyebrow">Your move today</p>
          <div className="mt-3">
            {isPaid ? (
              <div className="rounded-[10px] border-l-2 border-brass bg-ink/[0.03] p-5">
                <p className="text-[15px] leading-[1.72]">
                  {entry.action ?? 'Hold. Nothing today is worth spending a decision on.'}
                </p>
              </div>
            ) : (
              <Locked
                teaser={(entry.action ?? entry.body).slice(0, 128).trimEnd() + '…'}
                label="Unlock full access"
              />
            )}
          </div>
          <div className="mt-4">
            <AskChip label="Ask how to use this window" />
          </div>
        </section>
      )}

      {/* ──────────────────────── DECISION JOURNAL — the retention mechanic */}
      <section className="card-lg">
        <div className="flex items-baseline justify-between gap-3">
          <p className="eyebrow">Decision journal</p>
          {streak > 0 && (
            <span className="rounded-full bg-ledger/[0.08] px-3 py-1 font-mono text-[10px] uppercase tracking-label text-ledger-mid">
              {streak} day streak 🔥
            </span>
          )}
        </div>

        {justLogged ? (
          /* ── Success state — reinforces the habit ── */
          <div className="mt-4 text-center">
            <p className="font-serif text-[22px]">Logged.</p>
            <p className="mt-2 text-[14px] text-ink/60">
              {logged + 1} decision{logged === 0 ? '' : 's'} tracked against your chart.
              {logged >= 7 && ' You now have a week of data — your pattern is forming.'}
              {logged >= 30 && ' A full month. Your chart is starting to prove itself.'}
            </p>
            <button
              type="button"
              onClick={() => setJustLogged(false)}
              className="mt-4 font-mono text-[10px] uppercase tracking-label text-ledger-mid hover:text-ledger"
            >
              Log another →
            </button>
          </div>
        ) : !todayHasDecision ? (
          /* ── Prompt — appears when they haven't logged today ── */
          <>
            <p className="mt-3 font-serif text-[19px] leading-snug">
              {prompt}
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink/60">
              One sentence. The call you made, the thing you shipped, the conversation
              you had. Your chart tracks which decisions land on which days — after 30
              entries, it shows you the pattern.
            </p>

            <form
              className="mt-4 flex gap-2.5"
              onSubmit={(e) => { e.preventDefault(); void log(); }}
            >
              <input
                className="field flex-1"
                placeholder={'"Sent the proposal" or "Held the price"'}
                maxLength={2000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="What you decided today"
              />
              <button
                type="submit"
                disabled={saving || !draft.trim()}
                className="flex min-h-[48px] shrink-0 items-center justify-center rounded-[10px] bg-ledger-mid px-5 text-[14px] font-semibold text-paper transition-all hover:bg-ledger disabled:bg-ledger-mid/40"
              >
                {saving ? 'Saving…' : 'Log it'}
              </button>
            </form>

            {error && <p role="alert" className="mt-3 text-sm text-oxblood">{error}</p>}
          </>
        ) : (
          /* ── Already logged today ── */
          <div className="mt-4">
            <p className="text-[14px] text-ink/60">
              ✓ You logged a decision today. Come back tomorrow after your briefing.
            </p>
          </div>
        )}

        {/* Streak + record */}
        {logged > 0 && (
          <div className="mt-6 flex items-center justify-between border-t pt-4 rule">
            <div>
              <p className="font-serif text-[28px] leading-none">{logged}</p>
              <p className="mt-1 font-mono text-[9.5px] uppercase tracking-label text-ink/50">
                decision{logged === 1 ? '' : 's'} logged
              </p>
            </div>
            <div className="text-right">
              <p className="font-serif text-[28px] leading-none">{streak}</p>
              <p className="mt-1 font-mono text-[9.5px] uppercase tracking-label text-ink/50">
                day streak
              </p>
            </div>
          </div>
        )}

        {/* The lock-in message — appears after 3+ decisions */}
        {logged >= 3 && logged < 30 && (
          <p className="mt-4 rounded-[8px] bg-ledger/[0.05] px-4 py-3 text-[13px] leading-relaxed text-ink/65">
            {30 - logged} more and your chart shows you which days your best calls land on.
            That pattern is yours — no other product holds it.
          </p>
        )}
        {logged >= 30 && (
          <p className="mt-4 rounded-[8px] bg-ledger/[0.05] px-4 py-3 text-[13px] leading-relaxed text-ink/65">
            You have {logged} decisions mapped against your chart&rsquo;s timing.
            This record only exists here — it cannot be recreated.
          </p>
        )}
      </section>

      {/* ── Recent decisions ── */}
      {decisions.length > 0 && (
        <section>
          <p className="eyebrow">Recent decisions</p>
          <div className="mt-3 space-y-2">
            {decisions.slice(0, 8).map((d) => (
              <div key={d.id} className="card flex items-start gap-3 !py-4">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brass" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-relaxed text-ink/80">{d.body}</p>
                  <p className="mt-1 font-mono text-[9.5px] uppercase tracking-label text-brass-deep">
                    {stamp(d.decided_on)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Email opt-in ── */}
      {notify === null ? (
        <section className="card flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="font-serif text-[17.5px] leading-snug">
              Get your briefing delivered.
            </p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink/68">
              One email each morning with your briefing and a prompt to log yesterday&rsquo;s call.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <button
              type="button"
              onClick={() => void setNotifications(true)}
              className="flex min-h-[48px] items-center justify-center rounded-[8px] bg-ledger-mid px-7 text-[15.5px] font-semibold text-paper transition-all hover:bg-ledger"
            >
              Turn on
            </button>
            <button
              type="button"
              onClick={() => void setNotifications(false)}
              className="flex min-h-[48px] items-center px-1 text-[15px] text-ink/55 underline underline-offset-4 transition-colors hover:text-ink"
            >
              Not now
            </button>
          </div>
        </section>
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border bg-white/55 p-5 rule">
          <p className="text-[15px]">
            Morning briefing email:{' '}
            <strong className="font-semibold">{notify ? 'on' : 'off'}</strong>
          </p>
          <button
            type="button"
            onClick={() => void setNotifications(!notify)}
            className="flex min-h-[44px] items-center px-2 font-mono text-[10.5px] uppercase tracking-label text-ledger-mid transition-colors hover:text-ledger"
          >
            {notify ? 'Turn off' : 'Turn on'} <span aria-hidden className="ml-1.5">→</span>
          </button>
        </section>
      )}

      {!isPaid && (
        <section className="rounded-[12px] border border-ledger-mid/30 bg-[#eef0e6] p-5 sm:p-6">
          <p className="font-serif text-[19px] leading-snug">
            Your briefing + journal are the product.
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink/65">
            The reading told you how you&rsquo;re built. The briefing tells you what to do
            about it today. The journal proves whether you did. After 30 entries, your
            chart shows you the pattern behind your best calls.
          </p>
          <div className="mt-4">
            <LockedInline label="Unlock daily briefings" />
          </div>
        </section>
      )}
    </div>
  );
}

function ArrowLink({ href, dir }: { href: string | null; dir: 'prev' | 'next' }) {
  const glyph = dir === 'prev' ? '‹' : '›';
  const label = dir === 'prev' ? 'Previous day' : 'Next day';

  if (!href) {
    return (
      <span aria-hidden className="flex h-11 w-11 items-center justify-center text-[19px] text-ink/20">
        {glyph}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      scroll={false}
      className="flex h-11 w-11 items-center justify-center text-[19px] text-ink/55 transition-colors hover:text-ink"
    >
      {glyph}
    </Link>
  );
}
