'use client';

import { useEffect, useRef, useState } from 'react';
import { EVENTS, track } from './Analytics';
import { TrialModal } from './TrialModal';
import { FEATURES, PRICING } from '@/lib/brand';

export function Paywall({
  chartId,
  authed,
  firstName,
  archetype,
}: {
  chartId: string;
  authed: boolean;
  firstName: string;
  archetype: string;
}) {
  // Plan choice moved into the modal, where the billing timeline is disclosed
  // alongside it. The section below is now purely the pitch.
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);

  // Only count the paywall as seen once it enters the viewport, or the
  // form→paywall step of the funnel is meaningless.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !seen.current) {
            seen.current = true;
            track(EVENTS.paywallViewed, { chartId });
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [chartId]);

  return (
    <div ref={ref} className="relative z-10 mx-auto max-w-2xl px-5 text-center">
      <p className="eyebrow">The rest of your reading</p>
      <h2 className="mt-4 text-balance text-[30px] leading-tight sm:text-[40px]">
        Unlock your full reading.
      </h2>
      <p className="mx-auto mt-5 max-w-measure text-[15px] leading-relaxed text-ink/70">
        {firstName}, you know you are {archetype.startsWith('The') ? archetype : `a ${archetype}`}.
        The rest is what to do about it — your blind spots, your timing windows, and
        an advisor who has read your chart.
      </p>

      <ul className="mx-auto mt-8 grid max-w-lg gap-2.5 text-left">
        {FEATURES.map(([title, body]) => (
          <li key={title} className="flex gap-3 text-[15px] leading-relaxed">
            <span className="mt-0.5 shrink-0 font-bold text-ledger-mid" aria-hidden>✓</span>
            <span>
              <span className="font-medium">{title}</span>
              <span className="text-ink/60"> — {body}</span>
            </span>
          </li>
        ))}
      </ul>

      <button type="button" onClick={() => setOpen(true)} className="cta mt-9 w-full">
        Unlock full access <span aria-hidden>→</span>
      </button>

      <TrialModal open={open} onClose={() => setOpen(false)} chartId={chartId} authed={authed} />

      <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2">
        {[`${PRICING.trialDays}-day free trial`, 'No charge during trial', 'Cancel anytime'].map((t) => (
          <span key={t} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label text-ink/55">
            <span className="font-bold text-ledger-mid" aria-hidden>✓</span> {t}
          </span>
        ))}
      </div>
    </div>
  );
}
