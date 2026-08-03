'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PRICING } from '@/lib/brand';

function InsightContent() {
  const params = useSearchParams();
  const chartId = params.get('chart');
  const token = params.get('token');
  const type = params.get('type') ?? 'unusual';

  const [data, setData] = useState<{
    firstName: string;
    archetype: string;
    sunSign: string;
    type: string;
    paragraphs: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartId || !token) {
      setError('Invalid link.');
      setLoading(false);
      return;
    }
    void fetch(`/api/insight?chart=${chartId}&token=${token}&type=${type}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Could not load.'))
      .finally(() => setLoading(false));
  }, [chartId, token, type]);

  const TITLES: Record<string, string> = {
    unusual: 'We found something unusual in your chart.',
    blindspot: 'The blind spot your chart names.',
    timing: 'Your timing right now.',
    decision: 'How you actually make decisions.',
  };

  const BADGES: Record<string, string> = {
    unusual: 'Rare pattern detected',
    blindspot: 'Diagnostic insight',
    timing: 'Time-sensitive',
    decision: 'Decision pattern',
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <svg viewBox="0 0 100 100" className="mx-auto h-12 w-12 animate-spin [animation-duration:6s]" aria-hidden>
            <circle cx="50" cy="50" r="44" fill="none" stroke="#C2A05B" strokeOpacity="0.25" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="#C2A05B" strokeWidth="2" strokeDasharray="24 253" strokeLinecap="round" />
          </svg>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-label text-ink/50">Computing your insight</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-[15px] text-ink/60">{error ?? 'Something went wrong.'}</p>
          <Link href="/" className="mt-4 inline-block text-[14px] text-ledger-mid underline underline-offset-4">
            Go to Axon
          </Link>
        </div>
      </div>
    );
  }

  // First paragraph is free, rest is blurred
  const free = data.paragraphs.slice(0, 1);
  const locked = data.paragraphs.slice(1);

  return (
    <div className="mx-auto max-w-2xl">
      <span className="inline-block rounded-[2px] border border-brass/40 bg-brass/[0.08] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brass-deep">
        {BADGES[type] ?? 'Insight'}
      </span>

      <h1 className="mt-5 font-serif text-[28px] font-normal leading-tight sm:text-[34px]">
        {TITLES[type] ?? 'Your chart insight.'}
      </h1>

      <p className="mt-3 font-mono text-[10px] uppercase tracking-label text-ink/45">
        {data.firstName} · {data.archetype} · {data.sunSign}
      </p>

      {/* Free content */}
      <div className="mt-8 space-y-4">
        {free.map((p, i) => (
          <p key={i} className="text-[15px] leading-[1.75] text-ink/85">{p}</p>
        ))}
      </div>

      {/* Blurred content */}
      {locked.length > 0 && (
        <div className="relative mt-4">
          <div className="space-y-4" style={{ filter: 'blur(8px)', opacity: 0.35, userSelect: 'none' }}>
            {locked.map((p, i) => (
              <p key={i} className="text-[15px] leading-[1.75] text-ink">{p}</p>
            ))}
          </div>

          {/* Overlay CTA */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-[12px] border border-ledger-mid/30 bg-[#eef0e6] p-6 text-center shadow-[0_12px_40px_-12px_rgba(15,18,21,0.2)]">
              <p className="font-serif text-[20px] leading-snug">
                Unlock the full insight.
              </p>
              <p className="mt-2 text-[14px] text-ink/60">
                {PRICING.trialDays} days free. Cancel anytime.
              </p>
              <Link
                href={`/r/${chartId}#pricing`}
                className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-[2px] bg-ledger-mid px-8 text-[15px] font-semibold text-paper transition-all hover:bg-ledger"
              >
                Start {PRICING.trialDays} days free →
              </Link>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-label text-ink/40">
                {PRICING.weekly.amount}/week after trial
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InsightPage() {
  return (
    <div className="min-h-dvh bg-paper">
      {/* Top bar with X close */}
      <header className="flex items-center justify-between border-b px-5 py-4 rule">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-[20px]">Axon<span className="text-brass">.</span></span>
        </Link>
        <Link
          href="/"
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-full text-[20px] text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          ×
        </Link>
      </header>

      <main className="px-5 py-10 sm:py-14">
        <Suspense fallback={null}>
          <InsightContent />
        </Suspense>
      </main>
    </div>
  );
}
