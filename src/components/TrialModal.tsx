'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EVENTS, track } from './Analytics';
import { PRICING } from '@/lib/brand';

type PlanId = 'weekly' | 'annual';

/**
 * The trial modal.
 *
 * The "what happens next" timeline is the whole point: it states, before the
 * card is taken, exactly what is charged and when. Undisclosed trial billing is
 * the single biggest driver of chargebacks in this category, and chargebacks
 * are what get a Stripe account frozen.
 */
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock the page behind the modal and restore scroll on close.
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
    if (open) track(EVENTS.paywallViewed, { chartId });
  }, [open, chartId]);

  if (!open) return null;

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const today = new Date();
  const reminder = new Date(today.getTime() + (PRICING.trialDays - 1) * 86_400_000);
  const billing = new Date(today.getTime() + PRICING.trialDays * 86_400_000);
  const price = plan === 'weekly' ? PRICING.weekly.amount : PRICING.annual.amount;

  async function start() {
    setBusy(true);
    setError(null);
    track(EVENTS.checkoutStarted, { plan, chartId });

    // No chart yet: the card cannot be taken before there is something to
    // unlock, so send them to build one. The terms they just read still hold.
    if (!chartId && !authed) {
      router.push(`/start?plan=${plan}`);
      return;
    }

    if (!authed) {
      // Store checkout intent so it auto-triggers after sign-in.
      // The magic link redirect chain is too fragile to carry the plan
      // through email → callback → checkout in one hop.
      try { localStorage.setItem('axon_checkout', JSON.stringify({ plan, chartId })); } catch {}
      router.push('/login?next=/chart');
      return;
    }
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, chartId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) {
        throw new Error(json?.error ?? 'Could not open checkout. Try again in a moment.');
      }
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed.');
      setBusy(false);
    }
  }

  return (
    <div
      // The app stays visible behind the modal, blurred rather than blacked
      // out — seeing the thing you are buying sitting right there converts
      // better than a dark scrim that hides it.
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/[0.14] p-4 backdrop-blur-[6px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-title"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-[520px] rounded-[14px] border-[1.5px] border-brass-deep/50 bg-[#fbf8f1] p-7 shadow-[0_30px_80px_-20px_rgba(15,18,21,0.45)] sm:p-9"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="trial-title" className="font-serif text-[34px] font-normal leading-tight">
          Unlock your timing
        </h2>
        <p className="mt-3 text-[16px] leading-relaxed text-ink/72">
          You&rsquo;ve seen how you&rsquo;re wired. Start your trial to see{' '}
          <strong className="font-semibold text-ink">when to move</strong>, updated daily.
        </p>

        {/* Plan selector */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <PlanCard
            selected={plan === 'weekly'}
            onSelect={() => setPlan('weekly')}
            title="Weekly"
            body={`${PRICING.trialDays} days free, then ${PRICING.weekly.amount}/wk`}
          />
          <PlanCard
            selected={plan === 'annual'}
            onSelect={() => setPlan('annual')}
            title="Yearly"
            badge="Save 81%"
            body={`${PRICING.annual.amount}/yr, billed once`}
          />
        </div>

        {/* The disclosure timeline */}
        <div className="mt-5 rounded-[10px] border bg-white/70 p-5 rule">
          <p className="font-mono text-[10px] uppercase tracking-label text-brass-deep">
            What happens next
          </p>

          <ol className="mt-4 space-y-5">
            <Step
              filled
              day="Today"
              meta={`${fmt(today)} · $0.00`}
              body="Full access unlocks now. Every briefing, your timing windows, Ask Your Chart. You're not charged."
            />
            <Step
              day={`Day ${PRICING.trialDays}`}
              meta={`${fmt(reminder)} · Reminder`}
              body="Your last free day. We email you before anything is billed. No surprise charges."
            />
            <Step
              day={`Day ${PRICING.trialDays + 1}`}
              meta={`${fmt(billing)} · ${price}`}
              body="Billing starts, only if you stayed. Cancel in two taps anytime before."
            />
          </ol>
        </div>

        <div className="mt-6 flex items-baseline justify-between">
          <span className="font-serif text-[22px]">Due today</span>
          <span className="font-serif text-[26px] text-ledger-mid">$0.00</span>
        </div>

        <button type="button" onClick={start} disabled={busy} className="cta mt-4 w-full">
          {busy ? 'Opening checkout…' : `Start ${PRICING.trialDays} days free`}
          <span aria-hidden>→</span>
        </button>

        {error && (
          <p role="alert" className="mt-3 text-center text-sm text-oxblood">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
          {['No charge today', 'Cancel in 2 taps'].map((t) => (
            <span key={t} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label text-ink/50">
              <span className="font-bold text-ledger-mid" aria-hidden>✓</span> {t}
            </span>
          ))}
        </div>

        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-label text-ink/45">
          🔒 Secure via Stripe
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mx-auto mt-4 block px-4 py-2 text-[15px] text-ink/55 underline underline-offset-4 hover:text-ink"
        >
          Not now
        </button>
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
        className={`mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-ledger ${
          filled ? 'bg-ledger' : 'bg-transparent'
        }`}
      />
      <div>
        <p className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="text-[16px] font-semibold">{day}</span>
          <span className="font-mono text-[12px] text-brass-deep">{meta}</span>
        </p>
        <p className="mt-1 text-[14.5px] leading-relaxed text-ink/68">{body}</p>
      </div>
    </li>
  );
}
