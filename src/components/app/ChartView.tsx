'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AskChip, LockedCta, LockedInline, LockGlyph, useShell } from './AppShell';
import { LockedZone } from './LockedZone';
import { SkeletonLines } from './Skeleton';
import { SECTION_LABELS, type ReadingSection } from '@/lib/sections';
import type { Blocker, Chapter } from '@/lib/astro/blockers';

export interface SystemCard {
  eyebrow: string;
  title: string;
  body: string;
}

export interface TimingRow {
  span: 'Today' | 'This week' | 'This month';
  headline: string;
  line: string;
  tail: string;
}

/** Only the first tab is free. It has to be genuinely good on its own. */
const FREE_TABS = 1;

/**
 * My Chart — four sections, matching the reference.
 *
 * Archetype, the three systems, the reading, the timing. Everything that used
 * to be its own card — recommended roles, the business you were built for, the
 * seat to refuse, where you quietly rot — now lives INSIDE the reading card,
 * because that is what all of it is: the reading. Fifteen cards on one page
 * reads as a dashboard; four sections read as a document.
 */
export function ChartView({
  chartId,
  firstName,
  archetype,
  oneLine,
  code,
  glyph,
  placements,
  systems,
  sections,
  roles,
  avoid,
  builtFor,
  rot,
  timing,
  blockers,
  chapter,
  pressure,
  shareUrl,
}: {
  chartId: string;
  firstName: string;
  archetype: string;
  oneLine: string;
  code: string;
  glyph: string;
  placements: string[];
  systems: SystemCard[];
  sections: ReadingSection[] | null;
  roles: string[];
  avoid: string;
  builtFor: string;
  rot: string;
  timing: TimingRow[];
  blockers: Blocker[];
  chapter: Chapter;
  pressure: string;
  shareUrl: string;
}) {
  const { isPaid } = useShell();
  const router = useRouter();
  const [tab, setTab] = useState(SECTION_LABELS[0].key);
  const [copied, setCopied] = useState(false);
  const [openSystem, setOpenSystem] = useState<string | null>(null);
  const kicked = useRef(false);

  // First visit with no reading: start it here. This is the screen people land
  // on after signup and a placeholder at that moment is the worst thing to show.
  useEffect(() => {
    if (sections || kicked.current) return;
    kicked.current = true;
    void fetch('/api/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chartId }),
    })
      .then((r) => (r.ok ? router.refresh() : null))
      .catch(() => {});
  }, [sections, chartId, router]);

  const TABS = SECTION_LABELS;
  const tabIndex = TABS.findIndex((t) => t.key === tab);
  const active = sections?.find((s) => s.key === tab) ?? null;
  const tabLocked = !isPaid && tabIndex >= FREE_TABS;

  async function share() {
    const data = { title: `${firstName} — ${archetype}`, text: oneLine, url: shareUrl };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share(data); return; } catch { /* dismissed */ }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard denied */ }
  }

  return (
    <div className="mx-auto max-w-[820px] space-y-11 pb-8">
      {/* ─────────────────────────────────────────────── 1. the archetype */}
      <section className="card-lg">
        <div className="flex items-start justify-between gap-4">
          <p className="eyebrow pt-2">
            Your archetype <span className="text-ink/30">·</span> {code}
          </p>
          <button
            type="button"
            onClick={share}
            className="-mr-1 -mt-1 flex min-h-[40px] items-center gap-1.5 rounded-full border bg-white px-3.5 text-[13px] font-medium transition-colors hover:border-ink/30 rule"
          >
            {copied ? 'Link copied' : 'Share'} <span aria-hidden>↗</span>
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <span
            aria-hidden
            className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[12px] border bg-white/70 font-serif text-[27px] leading-none text-brass rule"
          >
            {glyph}
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-[27px] font-normal leading-[1.1] sm:text-[34px]">
              {archetype}
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink/72">{oneLine}</p>

            <p className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1 font-mono text-[9.5px] uppercase tracking-label text-brass-deep">
              {placements.map((p) => <span key={p}>{p}</span>)}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2.5">
              <AskChip label="Ask what this means for me today" prominent />
              <Link
                href="/timing"
                className="inline-flex min-h-[40px] items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-label text-ink/55 transition-colors hover:text-ink"
              >
                See my timing <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────── 2. the three systems */}
      <section>
        <p className="eyebrow">The three systems</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {systems.map((s, i) => {
            const sysLocked = !isPaid && i > 0;
            const open = openSystem === s.eyebrow;
            return (
              <div key={s.eyebrow} className="card card-interactive flex min-h-[200px] flex-col">
                <p className="eyebrow">{s.eyebrow}</p>
                <p className="mt-2 font-serif text-[20px] leading-tight">{s.title}</p>
                {sysLocked ? (
                  <>
                    <LockedZone label={`Unlock ${s.eyebrow} reading`} className="relative mt-2 h-[80px] overflow-hidden">
                      <p aria-hidden className="locked-text text-[13.5px] leading-[1.6] text-ink">{s.body}</p>
                    </LockedZone>
                    <div className="mt-auto pt-2">
                      <LockedInline label="Unlock" />
                    </div>
                  </>
                ) : (
                  <>
                    <p className={`mt-2 flex-1 text-[13.5px] leading-[1.6] text-ink/72 ${open ? '' : 'line-clamp-4'}`}>
                      {s.body}
                    </p>
                    <button
                      type="button"
                      onClick={() => setOpenSystem(open ? null : s.eyebrow)}
                      aria-expanded={open}
                      className="mt-2.5 flex min-h-[40px] items-center font-mono text-[9.5px] uppercase tracking-label text-ledger-mid transition-colors hover:text-ledger"
                    >
                      {open ? 'Show less' : 'Read more'} <span aria-hidden className="ml-1.5">→</span>
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ──────────────────────────────────────────────── 3. the reading */}
      <section>
        <p className="eyebrow">The reading</p>

        {/* Horizontal scroll rather than wrap: a wrapping row reflows the whole
            page every time the selection changes. */}
        <div className="-mx-4 mt-2.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 pb-1">
            {TABS.map((t, i) => {
              const locked = !isPaid && i >= FREE_TABS;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-pressed={tab === t.key}
                  className={`chip ${tab === t.key ? 'chip-on' : 'bg-transparent'}`}
                >
                  {locked && <LockGlyph />}
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ONE card. Roles, the business, the seat to refuse and where you rot
            all belong in here — every one of them is the reading. */}
        <article className="card mt-3.5">
          {!sections ? (
            <>
              <SkeletonLines lines={4} />
              <p className="mt-5 font-mono text-[9.5px] uppercase tracking-label text-ledger-mid">
                Computing your full reading · this page updates automatically
              </p>
            </>
          ) : tabLocked ? (
            <>
              <p className="eyebrow">{TABS[tabIndex].label}</p>
              <h2 className="mt-2 font-serif text-[21px] font-normal leading-tight sm:text-[25px]">
                {active?.title ?? ''}
              </h2>
              {/* Fixed height, not max-height: the server now sends a short
                  teaser, and a box that shrank to fit it would read as "there
                  is barely anything here" rather than "there is more". */}
              <LockedZone
                label={`Unlock ${TABS[tabIndex].label}`}
                className="relative mt-2.5 h-[172px] overflow-hidden"
              >
                <div className="locked-text space-y-3" aria-hidden>
                  {(active?.paragraphs ?? []).map((p, i) => (
                    <p key={i} className="text-[14px] leading-[1.7] text-ink">{p}</p>
                  ))}
                </div>
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-16"
                  style={{ background: 'linear-gradient(to bottom, rgba(250,248,240,0), #faf8f0 92%)' }}
                />
              </LockedZone>
              <span className="sr-only">Locked. Subscribe to read this section.</span>
              <div className="mt-3">
                <LockedInline label={`Read ${TABS[tabIndex].label}`} />
              </div>
            </>
          ) : active ? (
            <>
              <p className="eyebrow">{TABS[tabIndex].label}</p>
              <h2 className="mt-2 font-serif text-[21px] font-normal leading-tight sm:text-[25px]">
                {active.title}
              </h2>

              <div className="mt-3 space-y-3.5">
                {active.paragraphs.map((p, i) => (
                  <p key={i} className="text-[14px] leading-[1.7] text-ink/85">{p}</p>
                ))}
              </div>

              {/* The free section carries the roles and the business fit — the
                  same argument continued, not a new card. */}
              {tabIndex === 0 && (
                <>
                  <p className="mt-6 text-[14px] font-semibold">Recommended roles:</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {roles.slice(0, isPaid ? roles.length : 2).map((r) => (
                      <span
                        key={r}
                        className="rounded-full border px-3.5 py-1.5 font-mono text-[11px] rule"
                        style={{ background: 'rgba(47,112,80,0.05)' }}
                      >
                        {r}
                      </span>
                    ))}
                    {!isPaid && roles.length > 2 && (
                      <LockedZone label="Unlock all roles" className="flex flex-wrap gap-2">
                        {roles.slice(2).map((r) => (
                          <span
                            key={r}
                            className="locked-text rounded-full border px-3.5 py-1.5 font-mono text-[11px] rule"
                          >
                            {r}
                          </span>
                        ))}
                      </LockedZone>
                    )}
                  </div>

                  <p className="mt-5 text-[14px] font-semibold">Business recommendations:</p>
                  {isPaid ? (
                    <p className="mt-2 text-[13.5px] leading-[1.65] text-ink/78">{builtFor}</p>
                  ) : (
                    <>
                      <LockedZone label="Unlock business recommendations" className="relative mt-2 h-[52px] overflow-hidden">
                        <p aria-hidden className="locked-text text-[13.5px] leading-[1.65] text-ink">{builtFor}</p>
                      </LockedZone>
                      <div className="mt-1.5">
                        <LockedInline label="Unlock" />
                      </div>
                    </>
                  )}

                  <div className="mt-5 border-l-2 border-oxblood/60 pl-3.5">
                    <p className="font-mono text-[9.5px] uppercase tracking-label text-oxblood">
                      The seat to refuse
                    </p>
                    {isPaid ? (
                      <p className="mt-1 text-[13.5px] leading-[1.65] text-ink/78">{avoid}</p>
                    ) : (
                      <LockedZone label="Unlock the seat to refuse" className="relative mt-1 h-[46px] overflow-hidden">
                        <p aria-hidden className="locked-text text-[13.5px] leading-[1.65] text-ink">{avoid}</p>
                      </LockedZone>
                    )}
                  </div>

                  <div className="mt-5 border-l-2 border-brass-deep/60 pl-3.5">
                    <p className="font-mono text-[9.5px] uppercase tracking-label text-brass-deep">
                      Where you quietly rot
                    </p>
                    {isPaid ? (
                      <p className="mt-1 text-[13.5px] leading-[1.65] text-ink/78">{rot}</p>
                    ) : (
                      <LockedZone label="Unlock where you quietly rot" className="relative mt-1 h-[46px] overflow-hidden">
                        <p aria-hidden className="locked-text text-[13.5px] leading-[1.65] text-ink">{rot}</p>
                      </LockedZone>
                    )}
                  </div>
                </>
              )}
            </>
          ) : null}
        </article>
      </section>

      {/* ──────────────────────────────────────────────── 4. your timing */}
      <section>
        <p className="font-serif text-[19px] leading-snug sm:text-[21px]">
          That&rsquo;s how you&rsquo;re built. The part that changes every week
          is when to use it.
        </p>
        <p className="eyebrow mt-3.5">Your timing</p>

        <div className="mt-3 grid grid-rows-[1fr] gap-3 sm:grid-cols-3">
          {timing.map((t, i) => {
            const locked = !isPaid && i > 0;
            return (
              <div key={t.span} className="card flex min-h-[320px] flex-col">
                <p className="eyebrow">{t.span}</p>
                <h3 className="mt-2 font-serif text-[17px] font-normal leading-[1.3]">
                  {t.headline}
                </h3>

                {locked ? (
                  <>
                    <LockedZone
                      label={`Unlock your ${t.span.toLowerCase()} window`}
                      className="relative mt-2 flex-1 max-h-[160px] overflow-hidden"
                    >
                      <p aria-hidden className="locked-text text-[13px] leading-[1.6] text-ink">
                        {t.line} {t.tail}
                      </p>
                    </LockedZone>
                    <div className="mt-auto pt-3">
                      <LockedInline label="See my window" />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-[13px] leading-[1.6] text-ink/80">{t.line}</p>
                    {isPaid ? (
                      <p className="mt-2 flex-1 text-[13px] leading-[1.6] text-ink/80">{t.tail}</p>
                    ) : (
                      <>
                        <LockedZone
                          label="Unlock the full briefing"
                          className="relative mt-2 max-h-[80px] overflow-hidden"
                        >
                          <p aria-hidden className="locked-text text-[13px] leading-[1.6] text-ink">
                            {t.tail}
                          </p>
                        </LockedZone>
                        <div className="mt-auto pt-3">
                          <LockedInline label="Read the full briefing" />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3">
          <Link
            href="/timing"
            className="inline-flex min-h-[40px] items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-label text-ink/55 transition-colors hover:text-ink"
          >
            Every window, 30 days out <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* ─────────────────────────────────── the diagnosis, one card, one link */}
      <section>
        <p className="eyebrow">Why you&rsquo;re stuck</p>
        <Link href="/stuck" className="card card-interactive mt-3 block">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-[9.5px] uppercase tracking-label text-brass-deep">
              {blockers.length
                ? `${blockers.length} pattern${blockers.length === 1 ? '' : 's'} in your chart`
                : 'Read from your hard aspects'}
            </p>
            <p className="font-mono text-[9.5px] uppercase tracking-label text-ink/45">
              {chapter.name} · Saturn in {pressure}
            </p>
          </div>

          <h3 className="mt-2 font-serif text-[19px] font-normal leading-tight sm:text-[21px]">
            {blockers[0]?.title ?? 'The pattern that keeps costing you'}
          </h3>

          {isPaid ? (
            <p className="mt-2 text-[13.5px] leading-[1.65] text-ink/78">
              {blockers[0]?.costs ??
                'Your chart carries no tight hard aspects between the pairs that usually cause trouble in working life.'}
            </p>
          ) : (
            <div className="relative mt-2 max-h-[62px] overflow-hidden">
              <p aria-hidden className="locked-text text-[13.5px] leading-[1.65] text-ink">
                {blockers[0]?.costs ??
                  'Your chart carries no tight hard aspects between the pairs that usually cause trouble in working life.'}
              </p>
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-8"
                style={{ background: 'linear-gradient(to bottom, rgba(250,248,240,0), #faf8f0 92%)' }}
              />
            </div>
          )}

          <p className="mt-3 font-mono text-[9.5px] uppercase tracking-label text-ledger-mid">
            Open the diagnosis <span aria-hidden>→</span>
          </p>
        </Link>
      </section>

      {!isPaid && (
        <section className="flex flex-col items-start justify-between gap-4 rounded-[12px] border border-ledger-mid/30 bg-[#eef0e6] p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <p className="font-serif text-[17.5px] leading-snug sm:text-[19px]">
              Your chart-aware advisor is one tap away.
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink/68">
              Ask it anything, plus your daily briefing and timing windows.
            </p>
          </div>
          <div className="shrink-0">
            <LockedCta label="Unlock everything" />
          </div>
        </section>
      )}
    </div>
  );
}
