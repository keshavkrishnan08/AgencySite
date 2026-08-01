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

const CADENCES: { key: Cadence; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
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

  // null = undecided, so the prompt stays until the user answers either way.
  const [notify, setNotify] = useState<boolean | null>(emailOptIn ? true : null);

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
    } catch {
      // A failed preference write is not worth an error state on this screen.
    }
  }

  // Formatted in UTC on purpose. Briefings are keyed by the UTC calendar date,
  // so rendering in the viewer's zone would print a date that does not match
  // the row it came from — and the ‹ › arrows would look off by one.
  const stamp = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
    });

  return (
    <div className="mx-auto max-w-[820px] space-y-12 pb-8">
      {/* -------------------------------------------------------- cadence */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {CADENCES.map((c) => (
            <Link
              key={c.key}
              href={c.key === 'daily' ? '/updates' : `/updates?cadence=${c.key}`}
              scroll={false}
              className={`flex min-h-[40px] items-center gap-1.5 rounded-full border px-4 font-mono text-[10.5px] uppercase tracking-label transition-colors ${
                cadence === c.key
                  ? 'border-ledger bg-ledger text-paper'
                  : 'bg-white/55 text-ink/60 hover:bg-white rule'
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>

        {cadence === 'daily' && (
          <div className="flex items-center gap-1">
            <ArrowLink href={prevDate ? `/updates?date=${prevDate}` : null} dir="prev" />
            <span className="min-w-[132px] text-center font-mono text-[11px] uppercase tracking-label text-ink/60">
              {entry ? stamp(entry.date) : '—'}
            </span>
            <ArrowLink href={nextDate ? `/updates?date=${nextDate}` : null} dir="next" />
          </div>
        )}
      </div>

      {/* ------------------------------------------------------ the briefing */}
      <section>
        {!entry ? (
          <div className="card">
            <SkeletonLines lines={3} />
            <p className="mt-6 eyebrow">Not written yet</p>
            <p className="mt-3 font-serif text-[22px] leading-snug">
              Your {cadence === 'daily' ? 'briefing' : `${cadence} outlook`} lands in the morning.
            </p>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink/70">
              It is computed from where the sky is against your own chart, so it
              is written after the positions for the period settle — not in advance.
            </p>
          </div>
        ) : (
          <>
            <p className="eyebrow">
              {cadence === 'daily' ? stamp(entry.date) : `${cadence} outlook · from ${stamp(entry.date)}`}
            </p>
            <h1 className="mt-3 font-serif text-[23px] font-normal leading-[1.16] sm:text-[29px]">
              {entry.headline}
            </h1>
            <p className="mt-3.5 text-[14px] leading-[1.7] text-ink/85">{entry.body}</p>
          </>
        )}
      </section>

      {/* ---------------------------------------------------- your move today */}
      {entry && (
        <section>
          <p className="eyebrow">
            {cadence === 'daily' ? 'Your move today' : 'Your move'}
          </p>

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

      {/* ------------------------------------------------- tomorrow, delivered */}
      {notify === null ? (
        <section className="card flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="font-serif text-[17.5px] leading-snug">
              Tomorrow&rsquo;s briefing, delivered.
            </p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink/68">
              One notification each morning, when your read is drawn. Nothing else.
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

      {/* The two halves of the record sit side by side, as on the reference:
          what you did, and what that adds up to. Stacked they read as two
          unrelated widgets. */}
      <section className="grid gap-3.5 sm:grid-cols-2">
        <div className="card flex flex-col">
          <p className="eyebrow">Decision journal</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink/80">
            What did you get done today? Log the real move.
          </p>

          <form
            className="mt-4 flex flex-col gap-2.5 sm:flex-row"
            onSubmit={(e) => { e.preventDefault(); void log(); }}
          >
            <input
              className="field flex-1"
              placeholder={'e.g. "Sent the proposal" or "Held the price"'}
              maxLength={2000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="What you decided today"
            />
            <button
              type="submit"
              disabled={saving || !draft.trim()}
              className="flex min-h-[54px] shrink-0 items-center justify-center rounded-[10px] bg-ledger-mid px-6 text-[15px] font-semibold text-paper transition-all hover:bg-ledger disabled:bg-ledger-mid/40"
            >
              {saving ? 'Saving…' : 'Log it'}
            </button>
          </form>

          {error && <p role="alert" className="mt-3 text-sm text-oxblood">{error}</p>}

          {decisions.length > 0 && (
            <ul className="mt-5 divide-y rule">
              {decisions.slice(0, 5).map((d) => (
                <li key={d.id} className="py-3">
                  <p className="font-mono text-[10px] uppercase tracking-label text-brass-deep">
                    {stamp(d.decided_on)}
                  </p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-ink/80">{d.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card flex flex-col">
          <p className="eyebrow">Your record</p>
          <p className="mt-2 font-serif text-[31px] leading-none">
            {streak === 1 ? '1 day' : `${streak} days`}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/72">
            Your chart has been tracking with you since day one. The record
            deepens every reading.
          </p>
          {logged > 0 && (
            <p className="mt-2 text-[15px] text-ink/60">
              {logged} decision{logged === 1 ? '' : 's'} logged.
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4 rule">
            <p className="font-mono text-[10px] uppercase tracking-label text-ink/55">
              {archetype}
            </p>
            <Link
              href="/chart"
              className="flex min-h-[44px] items-center font-mono text-[10px] uppercase tracking-label text-ledger-mid transition-colors hover:text-ledger"
            >
              View your chart <span aria-hidden className="ml-1.5">→</span>
            </Link>
          </div>

          {!isPaid && (
            <div className="mt-3">
              <LockedInline label="Unlock every briefing" />
            </div>
          )}
        </div>
      </section>
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
