'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { EVENTS, track } from './Analytics';
import { PRICING } from '@/lib/brand';

type PlanId = 'weekly' | 'annual';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

export function TrialModal({
  open,
  onClose,
  chartId,
  authed,
}: {
  open: boolean;
  onClose: () => void;
  chartId?: string;
  authed: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanId>('weekly');
  const [showCheckout, setShowCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      track(EVENTS.paywallViewed, { chartId });
      setShowCheckout(false);
      setError(null);
    }
  }, [open, chartId]);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch('/api/checkout-embedded', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, chartId }),
    });
    const json = await res.json();
    if (!res.ok || !json.clientSecret) {
      throw new Error(json.error ?? 'Could not start checkout.');
    }
    return json.clientSecret;
  }, [plan, chartId]);

  function proceed() {
    if (!chartId && !authed) {
      router.push(`/start?plan=${plan}`);
      return;
    }
    if (!authed) {
      try { localStorage.setItem('axon_checkout', JSON.stringify({ plan, chartId, ts: Date.now() })); } catch {}
      router.push('/login?next=/chart');
      return;
    }
    track(EVENTS.checkoutStarted, { plan, chartId });
    setShowCheckout(true);
  }

  if (!open) return null;

  const trialLabel = PRICING.trialDays === 1 ? '24hr' : `${PRICING.trialDays} days`;
  const price = plan === 'weekly' ? PRICING.weekly.amount : PRICING.annual.amount;
  const cadence = plan === 'weekly' ? '/week' : '/year';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/[0.14] p-4 backdrop-blur-[6px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-title"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-[560px] rounded-[14px] border-[1.5px] border-brass-deep/50 bg-[#fbf8f1] shadow-[0_30px_80px_-20px_rgba(15,18,21,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        {showCheckout ? (
          /* ── STEP 2: Embedded Stripe checkout ── */
          <div className="p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCheckout(false)}
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label text-ink/50 hover:text-ink"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-label text-ink/45">
                  Due today
                </span>
                <span className="font-serif text-[22px] text-ledger-mid">$0.00</span>
              </div>
            </div>

            <div className="mt-4 rounded-[10px] border bg-white p-1 rule">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ fetchClientSecret }}
              >
                <EmbeddedCheckout className="embedded-checkout" />
              </EmbeddedCheckoutProvider>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
              {[`${trialLabel} free trial`, 'Cancel anytime', `Then ${price}${cadence}`].map((t) => (
                <span key={t} className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-label text-ink/45">
                  <span className="font-bold text-ledger-mid" aria-hidden>✓</span> {t}
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* ── STEP 1: Plan selection + disclosure ── */
          <div className="p-7 sm:p-9">
            <h2 id="trial-title" className="font-serif text-[32px] font-normal leading-tight">
              See what&rsquo;s holding you back.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink/72">
              Your 7-section reading is written and waiting. Start your {trialLabel} free
              trial to read every section — blind spots, timing, the pattern that keeps
              costing you.
            </p>

            {/* Plan selector */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <PlanCard
                selected={plan === 'weekly'}
                onSelect={() => setPlan('weekly')}
                title="Weekly"
                body={`${trialLabel} free, then ${PRICING.weekly.amount}/wk`}
              />
              <PlanCard
                selected={plan === 'annual'}
                onSelect={() => setPlan('annual')}
                title="Yearly"
                badge="Save 81%"
                body={`${PRICING.annual.amount}/yr, billed once`}
              />
            </div>

            {/* Timeline */}
            <div className="mt-5 rounded-[10px] border bg-white/70 p-5 rule">
              <p className="font-mono text-[10px] uppercase tracking-label text-brass-deep">
                What happens
              </p>
              <ol className="mt-4 space-y-4">
                <Step filled day="Now" meta="$0.00" body="Full reading unlocks. You're not charged." />
                <Step day={`After ${trialLabel}`} meta={`${price}${cadence}`} body="Billing starts only if you stay. Cancel in two taps." />
              </ol>
            </div>

            <div className="mt-6 flex items-baseline justify-between">
              <span className="font-serif text-[22px]">Due now</span>
              <span className="font-serif text-[26px] text-ledger-mid">$0.00</span>
            </div>

            <button type="button" onClick={proceed} className="cta mt-4 w-full">
              Continue to checkout <span aria-hidden>→</span>
            </button>

            {error && (
              <p role="alert" className="mt-3 text-center text-sm text-oxblood">{error}</p>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
              {['No charge today', 'Cancel in 2 taps'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label text-ink/50">
                  <span className="font-bold text-ledger-mid" aria-hidden>✓</span> {t}
                </span>
              ))}
            </div>

            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-label text-ink/45">
              Secure checkout via Stripe
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mx-auto mt-4 block px-4 py-2 text-[14px] text-ink/50 underline underline-offset-4 hover:text-ink"
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  selected,
  onSelect,
  title,
  body,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  body: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative rounded-[10px] border-2 p-4 text-left transition-all ${
        selected ? 'border-ledger bg-ledger/[0.06]' : 'border-ink/10 bg-white/70 hover:border-ink/25'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-serif text-[19px]">{title}</span>
        {selected ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ledger text-[11px] font-bold text-paper" aria-hidden>
            ✓
          </span>
        ) : badge ? (
          <span className="shrink-0 rounded-full bg-ledger px-2 py-0.5 font-mono text-[9px] uppercase tracking-label text-paper">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-[14px] leading-snug text-ink/65">{body}</p>
    </button>
  );
}

function Step({
  day,
  meta,
  body,
  filled = false,
}: {
  day: string;
  meta: string;
  body: string;
  filled?: boolean;
}) {
  return (
    <li className="flex gap-3.5">
      <span
        aria-hidden
        className={`mt-1 h-[14px] w-[14px] shrink-0 rounded-full border-2 border-ledger ${
          filled ? 'bg-ledger' : 'bg-transparent'
        }`}
      />
      <div>
        <p className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="text-[15px] font-semibold">{day}</span>
          <span className="font-mono text-[11px] text-brass-deep">{meta}</span>
        </p>
        <p className="mt-0.5 text-[14px] leading-relaxed text-ink/65">{body}</p>
      </div>
    </li>
  );
}
