'use client';

import { useState } from 'react';
import { EVENTS, track } from '../Analytics';
import { PRICING } from '@/lib/brand';

/**
 * Weekly → annual, offered inside the product rather than at the paywall.
 *
 * At the paywall a $98 charge competes with $8.99 and loses; two weeks in, the
 * same offer lands on someone who has already decided they want the thing. It
 * is also the safest way to raise ARPU: a subscriber who upgrades knowingly
 * disputes at a fraction of the rate of a trial that converted into a large
 * charge they had forgotten about.
 */
export function AnnualUpsell({ weeklySpendPerYear }: { weeklySpendPerYear: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    setBusy(true);
    setError(null);
    track(EVENTS.checkoutStarted, { plan: 'annual', source: 'annual_upsell' });

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'annual' }),
      });
      // Next serves HTML on an unhandled error, so never assume JSON.
      const json = await res.json().catch(() => ({}) as { url?: string; error?: string });
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Could not start checkout.');
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.');
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[12px] border border-ledger-mid/30 bg-[#eef0e6] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Switch to annual</p>
          <p className="mt-2 font-serif text-[19px] leading-snug sm:text-[21px]">
            {PRICING.annual.amount} a year instead of {weeklySpendPerYear}.
          </p>
          <p className="mt-1.5 max-w-measure text-[13px] leading-relaxed text-ink/68">
            Same product, billed once. Works out at $8.17 a month, and you stop
            thinking about it every week.
          </p>
        </div>

        <button type="button" onClick={upgrade} disabled={busy} className="cta-sm shrink-0">
          {busy ? 'Opening checkout…' : 'Switch to annual'}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[13px] text-oxblood">
          {error}
        </p>
      )}

      <p className="mt-3 font-mono text-[9.5px] uppercase leading-[1.6] tracking-label text-ink/45">
        Your weekly plan is cancelled automatically when the annual one starts ·
        cancel either any time
      </p>
    </section>
  );
}
