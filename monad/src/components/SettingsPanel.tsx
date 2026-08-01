'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { BRAND } from '@/lib/brand';

/**
 * Account actions.
 *
 * Cancellation is a named, primary action — not a step buried inside a
 * "manage billing" portal. ROSCA and the state auto-renewal laws require
 * cancelling to be as easy to find and complete as subscribing was, and the
 * FTC's June 2026 action against a competitor in this exact category turned
 * specifically on "omitting cancellation options from its websites and apps".
 */
export function SettingsPanel({
  isPaid,
  status,
  renewsAt,
}: {
  isPaid: boolean;
  status: string;
  renewsAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'cancel' | 'billing' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openPortal(intent: 'cancel' | 'billing') {
    setBusy(intent);
    setError(null);
    try {
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) {
        throw new Error(
          json?.error ?? 'Could not open billing. Email us and we will cancel it for you.',
        );
      }
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open billing.');
      setBusy(null);
    }
  }

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push('/');
    router.refresh();
  }

  const trialing = status === 'trialing';

  return (
    <section className="space-y-6">
      {isPaid && (
        <div className="card">
          <p className="eyebrow">Cancel</p>
          <p className="mt-2.5 text-[15.5px] leading-relaxed text-ink/80">
            {trialing
              ? 'Cancel before your trial ends and you will never be charged. Nothing to explain, no retention call.'
              : 'Cancel any time. You keep access until the end of the period you have already paid for.'}
          </p>
          {renewsAt && (
            <p className="mt-2 font-mono text-[11px] uppercase tracking-label text-brass-deep">
              {trialing ? 'First charge' : 'Renews'} ·{' '}
              {new Date(renewsAt).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          )}

          <button
            type="button"
            onClick={() => openPortal('cancel')}
            disabled={busy !== null}
            className="cta-ghost mt-4 w-full disabled:opacity-50"
          >
            {busy === 'cancel' ? 'Opening…' : trialing ? 'Cancel my trial' : 'Cancel subscription'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {isPaid && (
          <button
            type="button"
            onClick={() => openPortal('billing')}
            disabled={busy !== null}
            className="cta-ghost w-full disabled:opacity-50"
          >
            {busy === 'billing' ? 'Opening…' : 'Update card or download invoices'}
          </button>
        )}

        <Link href="/start" className="cta-ghost w-full">
          Recalculate my chart
        </Link>

        <button
          type="button"
          onClick={signOut}
          className="w-full py-3 font-mono text-[11px] uppercase tracking-label text-ink/50 hover:text-ink"
        >
          Sign out
        </button>
      </div>

      {error && (
        <p role="alert" className="text-center text-sm text-oxblood">
          {error}
        </p>
      )}

      <p className="text-center text-[13px] leading-relaxed text-ink/45">
        Cancelling stops all future charges immediately. Deleting your account in
        the billing portal removes your birth data and every reading with it. If
        anything here does not work,{' '}
        <a
          href={`mailto:${BRAND.supportEmail}?subject=Cancel my subscription`}
          className="underline underline-offset-2"
        >
          email us
        </a>{' '}
        and we will cancel it for you.
      </p>
    </section>
  );
}
