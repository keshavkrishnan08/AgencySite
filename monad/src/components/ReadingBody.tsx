'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EVENTS, track } from './Analytics';
import type { ReadingSection } from '@/lib/ai';

const STAGES = [
  'Reading your placements',
  'Weighing the aspects',
  'Finding the blind spots',
  'Writing your reading',
];

/**
 * Renders the reading, generating it on first view.
 *
 * Free users see the first `freeSections` in full; the rest render for real
 * underneath a blur so the shape of what is missing stays visible. A solid
 * panel converts noticeably worse than blurred real content.
 */
export function ReadingBody({
  chartId,
  sections,
  freeSections,
}: {
  chartId: string;
  sections: ReadingSection[] | null;
  freeSections: number;
}) {
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (sections) track(EVENTS.resultViewed, { chartId });
  }, [sections, chartId]);

  useEffect(() => {
    if (sections || fired.current) return;
    fired.current = true;

    const timer = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      7000,
    );

    (async () => {
      try {
        const res = await fetch('/api/reading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chartId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? 'Generation failed.');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Generation failed.');
      } finally {
        clearInterval(timer);
      }
    })();

    return () => clearInterval(timer);
  }, [sections, chartId, router]);

  if (error) {
    return (
      <section className="border-t px-5 py-20 text-center rule">
        <p className="font-serif text-2xl">That didn&rsquo;t work.</p>
        <p className="mt-3 text-[15px] text-ink/60">{error}</p>
        <button type="button" onClick={() => window.location.reload()} className="cta mt-7">
          Try again
        </button>
      </section>
    );
  }

  if (!sections) {
    return (
      <section className="border-t px-5 py-20 text-center rule">
        <svg viewBox="0 0 100 100" className="mx-auto h-16 w-16 animate-spin [animation-duration:8s]" aria-hidden>
          <circle cx="50" cy="50" r="45" fill="none" stroke="#c2a05b" strokeOpacity="0.25" strokeWidth="1" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#c2a05b" strokeWidth="1.6" strokeDasharray="22 261" strokeLinecap="round" />
        </svg>
        <h2 className="mt-7 font-serif text-2xl">Drawing your reading</h2>
        <p key={stage} className="eyebrow mt-3 animate-fade-up">{STAGES[stage]}</p>
        <p className="mx-auto mt-7 max-w-xs text-[13px] leading-relaxed text-ink/45">
          This takes a minute the first time. Everything after that is instant.
        </p>
      </section>
    );
  }

  const free = sections.slice(0, freeSections);
  const locked = sections.slice(freeSections);

  return (
    <>
      <section className="border-t px-5 py-14 rule">
        <div className="mx-auto max-w-2xl space-y-12">
          {free.map((s) => (
            <Section key={s.key} section={s} />
          ))}
        </div>
      </section>

      {locked.length > 0 && (
        <section className="relative">
          {/* Real content, blurred — the reader can see how much is there. */}
          <div className="relative h-[460px] overflow-hidden sm:h-[520px]">
            <div className="locked mx-auto max-w-2xl space-y-12 px-5" aria-hidden>
              {locked.map((s) => (
                <Section key={s.key} section={s} />
              ))}
            </div>
            <div className="veil" />
          </div>
        </section>
      )}
    </>
  );
}

function Section({ section }: { section: ReadingSection }) {
  return (
    <article>
      <h2 className="font-serif text-[27px] font-normal leading-tight sm:text-[34px]">
        {section.title}
      </h2>
      <p className="mt-3 max-w-measure text-[15px] leading-relaxed text-ink/55">
        {section.standfirst}
      </p>
      <div className="mt-6 space-y-5">
        {section.paragraphs.map((p, i) => (
          <p key={i} className="text-[16.5px] leading-[1.75] text-ink/85">
            {p}
          </p>
        ))}
      </div>
    </article>
  );
}
