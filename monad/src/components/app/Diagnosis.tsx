'use client';

import { LockedInline, useShell } from './AppShell';
import { LockedZone } from './LockedZone';
import type { Blocker, Chapter } from '@/lib/astro/blockers';

/**
 * The diagnosis, as a section of My Chart rather than a page of its own.
 *
 * It is the only surface that is diagnostic instead of descriptive — it names
 * the repeating pattern that costs money and says what it costs. That makes it
 * the strongest upsell in the product, which is why it belongs on the screen
 * everyone lands on rather than behind a nav item most people never click.
 */
export function Diagnosis({
  blockers,
  chapter,
  pressure,
}: {
  blockers: Blocker[];
  chapter: Chapter;
  pressure: string;
}) {
  const { isPaid } = useShell();

  return (
    <section className="space-y-3.5">
      <div>
        <p className="eyebrow">Why you&rsquo;re stuck</p>
        <h2 className="mt-2 font-serif text-[21px] font-normal leading-tight sm:text-[25px]">
          The pattern that keeps costing you
        </h2>
        <p className="mt-2 max-w-measure text-[13.5px] leading-relaxed text-ink/65">
          Read from the hard aspects in your chart — the tense pairs, not the
          flattering ones. Each cites the placement it came from.
        </p>
      </div>

      {/* The chapter frames everything below it: the same pattern reads very
          differently at year two of a build than at year nine. */}
      <section className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="eyebrow">Your current chapter</p>
          <p className="font-mono text-[9.5px] uppercase tracking-label text-ink/45">
            {chapter.span}
          </p>
        </div>

        <h2 className="mt-2 font-serif text-[22px] font-normal leading-tight sm:text-[25px]">
          {chapter.name}
        </h2>
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-label text-brass-deep">
          {chapter.yearsIn} years in · Saturn cycle {Math.round(chapter.progress * 100)}% through
        </p>

        <div className="mt-3 h-[5px] w-full overflow-hidden rounded-full bg-bone/60">
          <div
            className="h-full rounded-full bg-ledger-mid"
            style={{ width: `${Math.round(chapter.progress * 100)}%` }}
          />
        </div>

        <p className="mt-4 text-[14px] leading-[1.7] text-ink/82">{chapter.what}</p>

        {isPaid ? (
          <p className="mt-3 text-[14px] leading-[1.7] text-ink/82">{chapter.ends}</p>
        ) : (
          <>
            <LockedZone
              label="Unlock when this chapter ends"
              className="relative mt-3 max-h-[64px] overflow-hidden"
            >
              <p aria-hidden className="locked-text text-[14px] leading-[1.7] text-ink">
                {chapter.ends}
              </p>
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-8"
                style={{ background: 'linear-gradient(to bottom, rgba(250,248,240,0), #faf8f0 92%)' }}
              />
            </LockedZone>
            <div className="mt-2">
              <LockedInline label="See when it lifts" />
            </div>
          </>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="eyebrow">The patterns</p>
          <p className="font-mono text-[9.5px] uppercase tracking-label text-ink/45">
            {blockers.length} found in your chart
          </p>
        </div>

        {blockers.length === 0 ? (
          <div className="card">
            <p className="text-[14px] leading-relaxed text-ink/70">
              Your chart carries no tight hard aspects between the pairs that
              usually cause trouble in working life. That is genuinely uncommon,
              and it means your constraint is more likely circumstance than
              wiring — which the timing windows speak to better than this page.
            </p>
          </div>
        ) : (
          blockers.map((b, i) => {
            const locked = !isPaid && i > 0;
            return (
              <article key={b.title} className="card card-interactive">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="eyebrow">Pattern {i + 1}</p>
                  <p className="font-mono text-[9.5px] uppercase tracking-label text-brass-deep">
                    {b.evidence}
                  </p>
                </div>

                <h3 className="mt-2 font-serif text-[19px] font-normal leading-tight sm:text-[21px]">
                  {b.title}
                </h3>

                {locked ? (
                  <>
                    <LockedZone
                      label={`Unlock: ${b.title}`}
                      className="relative mt-2.5 max-h-[110px] overflow-hidden"
                    >
                      <p aria-hidden className="locked-text text-[13.5px] leading-[1.65] text-ink">
                        {b.costs}
                      </p>
                      <p aria-hidden className="locked-text mt-2 text-[13.5px] leading-[1.65] text-ink">
                        {b.fix}
                      </p>
                      <div
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-12"
                        style={{ background: 'linear-gradient(to bottom, rgba(250,248,240,0), #faf8f0 92%)' }}
                      />
                    </LockedZone>
                    <div className="mt-2">
                      <LockedInline label="See what this costs you" />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-2.5 text-[13.5px] leading-[1.65] text-ink/80">{b.costs}</p>
                    <div className="mt-3 border-l-2 border-ledger-mid/50 pl-3.5">
                      <p className="font-mono text-[9.5px] uppercase tracking-label text-ledger-mid">
                        The counter-move
                      </p>
                      <p className="mt-1 text-[13.5px] leading-[1.65] text-ink/80">{b.fix}</p>
                    </div>
                  </>
                )}
              </article>
            );
          })
        )}
      </section>

      <section className="rounded-[10px] border-l-2 border-oxblood bg-oxblood/[0.05] px-5 py-4">
        <p className="eyebrow text-oxblood">Where the pressure sits</p>
        <p className="mt-1.5 text-[13.5px] leading-[1.65] text-ink/80">
          Your Saturn is in {pressure}. That is the area of life where the bill
          arrives last but always arrives — the one you are most tempted to
          under-resource because the consequences are slow.
        </p>
      </section>

    </section>
  );
}
