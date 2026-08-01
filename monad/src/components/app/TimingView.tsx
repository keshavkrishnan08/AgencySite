'use client';

import { useMemo, useState } from 'react';
import { LockedCta, LockedInline, useShell } from './AppShell';
import { LockedZone } from './LockedZone';
import { INTENTS, type Intent } from '@/lib/astro/bestday';

export interface DayResult {
  date: string;
  score: number;
  reasons: string[];
  headline: string;
  moonSign: string;
  moonPhase: string;
  quiet: boolean;
}

export interface IntentResult {
  best: DayResult[];
  worst: DayResult | null;
}

/**
 * Timing — the one surface that answers "when".
 *
 * Two zoom levels on one page. The intent picker answers "when should I do
 * this specific thing" with dates; the outlook underneath answers "what shape
 * is this week". They were separate pages, which meant each made the other
 * look redundant to whoever found it first.
 *
 * All six intents precompute server-side, so switching is instant and free.
 * Only the first window is readable unpaid; a specific date is the most
 * valuable thing the product knows, so it is also the thing behind the wall.
 */
export interface Outlook {
  headline: string;
  summary: string;
  windows: { label: string; dates: string; guidance: string }[];
}

export function TimingView({
  firstName,
  results,
  week,
  month,
}: {
  firstName: string;
  results: Record<Intent, IntentResult>;
  week: Outlook | null;
  month: Outlook | null;
}) {
  const { isPaid } = useShell();
  const [intent, setIntent] = useState<Intent>('launch');
  const [copied, setCopied] = useState<string | null>(null);

  const active = results[intent];
  const locked = !isPaid;

  // The server sends an empty date for windows the reader hasn't paid for, so
  // the date itself never reaches the browser. Render a placeholder rather than
  // an Invalid Date.
  const fmt = useMemo(
    () => (iso: string) =>
      !iso
        ? 'A date in the next 30 days'
        : new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
          }),
    [],
  );

  /** A calendar file, so the answer leaves the app and lands in their week. */
  function addToCalendar(day: DayResult) {
    const label = INTENTS.find((i) => i.id === intent)?.label ?? 'Your window';
    const stamp = day.date.replace(/-/g, '');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Axon//Best Day//EN',
      'BEGIN:VEVENT',
      `UID:axon-${intent}-${stamp}`,
      `DTSTART;VALUE=DATE:${stamp}`,
      `DTEND;VALUE=DATE:${stamp}`,
      `SUMMARY:${label} — your window`,
      `DESCRIPTION:${day.reasons.join(' ').replace(/[,;]/g, '')}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `axon-${intent}-${day.date}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setCopied(day.date);
    setTimeout(() => setCopied(null), 2200);
  }

  return (
    <div className="mx-auto max-w-[820px] space-y-10 pb-8">
      <header>
        <p className="eyebrow">Timing</p>
        <h1 className="mt-2.5 font-serif text-[27px] font-normal leading-tight sm:text-[33px]">
          {firstName}, when should you move?
        </h1>
        <p className="mt-2 max-w-measure text-[14.5px] leading-relaxed text-ink/65">
          Pick the move. Your next 30 days are scored against your own chart —
          the same astronomy, not a general calendar.
        </p>
      </header>

      {/* Intent picker. Horizontal scroll rather than wrap so choosing does not
          reflow the answer underneath it. */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 pb-1">
          {INTENTS.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => setIntent(i.id)}
              aria-pressed={intent === i.id}
              className={`chip ${intent === i.id ? 'chip-on' : 'bg-transparent'}`}
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-3.5">
        {active.best.map((day, i) => {
          const dayLocked = locked && i > 0;
          return (
            <article key={day.date} className="card card-interactive">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="eyebrow">
                  {i === 0 ? 'Your best window' : `Option ${i + 1}`}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-label text-ink/45">
                  {day.moonPhase} · Moon in {day.moonSign}
                </p>
              </div>

              <h2 className="mt-2.5 font-serif text-[23px] font-normal leading-tight sm:text-[27px]">
                {fmt(day.date)}
              </h2>

              {dayLocked ? (
                <>
                  <LockedZone label={`Unlock ${fmt(day.date)}`}>
                  <div className="locked-text mt-3 space-y-2" aria-hidden>
                    {day.reasons.map((r) => (
                      <p key={r} className="text-[13.5px] leading-[1.6] text-ink">{r}</p>
                    ))}
                  </div>
                  </LockedZone>
                  <span className="sr-only">Locked. Subscribe to see this window.</span>
                  <div className="mt-3">
                    <LockedInline label="See this window" />
                  </div>
                </>
              ) : (
                <>
                  {day.quiet ? (
                    <p className="mt-3 text-[13.5px] leading-[1.6] text-ink/75">
                      Nothing is making an exact contact to your chart. For this
                      move that is neutral ground — it will neither carry you nor
                      fight you, so it comes down to preparation.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {day.reasons.map((r) => (
                        <li key={r} className="flex gap-2.5 text-[13.5px] leading-[1.6] text-ink/78">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brass-deep" aria-hidden />
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    onClick={() => addToCalendar(day)}
                    className="mt-4 flex min-h-[42px] items-center gap-1.5 font-mono text-[10px] uppercase tracking-label text-ledger-mid transition-colors hover:text-ledger"
                  >
                    {copied === day.date ? 'Added to calendar' : 'Add to calendar'}{' '}
                    <span aria-hidden>↓</span>
                  </button>
                </>
              )}
            </article>
          );
        })}
      </section>

      {active.worst && (
        <section className="rounded-[10px] border-l-2 border-oxblood bg-oxblood/[0.05] px-6 py-5">
          <p className="eyebrow text-oxblood">The day to avoid</p>
          {locked ? (
            <>
              <LockedZone label="Unlock the day to avoid">
                <p className="locked-text mt-2 text-[14.5px] leading-relaxed text-ink" aria-hidden>
                  {fmt(active.worst.date)} — {active.worst.headline}
                </p>
              </LockedZone>
              <span className="sr-only">Locked.</span>
              <div className="mt-2">
                <LockedInline label="See the day to avoid" />
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 font-serif text-[18px]">{fmt(active.worst.date)}</p>
              <p className="mt-1.5 text-[13.5px] leading-[1.6] text-ink/75">
                {active.worst.reasons[0] ??
                  'The sky argues against this move on that day.'}
              </p>
            </>
          )}
        </section>
      )}

      {/* The wider shape, underneath the specific dates. Same question, lower
          resolution — which is why it belongs here and not on its own page. */}
      {(week ?? month) && (
        <section className="space-y-3.5">
          <p className="eyebrow">The shape of it</p>
          {([['This week', week], ['This month', month]] as const).map(([label, o]) =>
            o ? (
              <article key={label} className="card">
                <p className="eyebrow">{label}</p>
                <h3 className="mt-2 font-serif text-[19px] font-normal leading-tight sm:text-[21px]">
                  {o.headline}
                </h3>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-ink/80">{o.summary}</p>

                {o.windows?.length > 0 && (
                  <ul className="mt-3 divide-y rule">
                    {o.windows.map((w, i) => {
                      const wLocked = locked && i > 0;
                      return (
                        <li key={w.label} className="py-2.5">
                          <p className="flex flex-wrap items-baseline gap-x-2.5">
                            <span className="font-mono text-[9.5px] uppercase tracking-label text-ledger-mid">
                              {w.label}
                            </span>
                            <span className="font-mono text-[9.5px] text-brass-deep">{w.dates}</span>
                          </p>
                          {wLocked ? (
                            <LockedZone label={`Unlock ${w.label}`} className="relative mt-1 max-h-[38px] overflow-hidden">
                              <p aria-hidden className="locked-text text-[13px] leading-[1.6] text-ink">
                                {w.guidance}
                              </p>
                            </LockedZone>
                          ) : (
                            <p className="mt-1 text-[13px] leading-[1.6] text-ink/78">{w.guidance}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            ) : null,
          )}
        </section>
      )}

      {locked && (
        <section className="flex flex-col items-start justify-between gap-5 rounded-[12px] border border-ledger-mid/30 bg-[#eef0e6] p-6 sm:flex-row sm:items-center sm:p-7">
          <div>
            <p className="font-serif text-[20px] leading-snug sm:text-[22px]">
              Every window, every move, thirty days out.
            </p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink/68">
              Plus the day to avoid, and a calendar file for each one.
            </p>
          </div>
          <div className="shrink-0">
            <LockedCta label="Unlock every window" />
          </div>
        </section>
      )}
    </div>
  );
}
