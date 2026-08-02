'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EVENTS, track } from './Analytics';
import { BRAND } from '@/lib/brand';

const MAX_ATTEMPTS = 20; // ~40 seconds

export function WelcomePoller() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    track(EVENTS.trialStarted);
    track(EVENTS.purchased);
  }, []);

  useEffect(() => {
    if (stalled) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/entitlement', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (json?.isPaid) {
          router.replace('/chart');
          return;
        }
      } catch {
        // Network blip — the next attempt will pick it up.
      }

      if (attempts + 1 >= MAX_ATTEMPTS) setStalled(true);
      else setAttempts((a) => a + 1);
    }, 2000);

    return () => clearTimeout(timer);
  }, [attempts, stalled, router]);

  if (stalled) {
    return (
      <div className="max-w-sm text-center">
        <h1 className="font-serif text-3xl">Your payment went through.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/65">
          Access is taking longer than usual to activate. Refresh in a moment —
          if it still is not there, email{' '}
          <a
            href={`mailto:${BRAND.supportEmail}?subject=Payment went through but access is not active`}
            className="underline underline-offset-2"
          >
            {BRAND.supportEmail}
          </a>{' '}
          and we will sort it immediately.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="cta mt-7"
        >
          Refresh
        </button>
        <p className="mt-4">
          <Link
            href="/chart"
            className="font-mono text-[10.5px] uppercase tracking-label text-ink/55 underline underline-offset-4 hover:text-ink"
          >
            Go to my chart anyway
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm text-center">
      <svg
        viewBox="0 0 100 100"
        className="mx-auto h-16 w-16 animate-spin [animation-duration:6s]"
        aria-hidden
      >
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="#C2A05B"
          strokeOpacity="0.25"
          strokeWidth="1.5"
        />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="#C2A05B"
          strokeWidth="2"
          strokeDasharray="24 253"
          strokeLinecap="round"
        />
      </svg>
      <h1 className="mt-8 font-serif text-3xl">Unlocking your reading</h1>
      <p className="mt-3 text-[15px] text-ink/60">
        Confirming your payment with Stripe. A few seconds.
      </p>
    </div>
  );
}
