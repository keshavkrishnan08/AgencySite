'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export function AuthForm() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/chart';

  // Pre-fill from URL param, or from the email saved during onboarding.
  const saved = typeof window !== 'undefined'
    ? (params.get('email') || localStorage.getItem('axon_email') || '')
    : '';

  const [email, setEmail] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const autoSent = useRef(false);

  // If we already have the email from onboarding, auto-send the magic link
  // so the user doesn't have to click anything — just check their inbox.
  useEffect(() => {
    if (autoSent.current || !saved || sent) return;
    autoSent.current = true;
    const form = document.querySelector('form');
    if (form) form.requestSubmit();
  }, [saved, sent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    let supabase: ReturnType<typeof supabaseBrowser>;
    try {
      supabase = supabaseBrowser();
    } catch {
      setError('Sign-in is not configured on this deployment yet.');
      setBusy(false);
      return;
    }

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (otpError) {
        const m = otpError.message.toLowerCase();
        if (m.includes('rate') || m.includes('too many')) {
          setError('Too many attempts. Wait a minute and try again.');
        } else if (m.includes('email')) {
          setError('That email address does not look right.');
        } else {
          setError(otpError.message);
        }
        setBusy(false);
        return;
      }

      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the link.');
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <h1 className="font-serif text-3xl">Check your email.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/60">
          We sent a sign-in link to <strong className="font-semibold text-ink">{email}</strong>.
          Click it to continue — it expires in 10 minutes.
        </p>
        <p className="mt-6 text-[13px] text-ink/45">
          Not there? Check your spam folder, or{' '}
          <button
            type="button"
            onClick={() => { setSent(false); setBusy(false); }}
            className="underline underline-offset-2 hover:text-ink"
          >
            try again
          </button>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="font-serif text-3xl">Sign in.</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
        Enter your email and we&rsquo;ll send you a sign-in link. No password needed.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-3">
        <input
          className="field"
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          autoFocus
          enterKeyHint="go"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email address"
        />

        {error && (
          <p role="alert" className="text-sm text-oxblood">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="cta w-full disabled:opacity-60">
          {busy ? 'Sending…' : 'Send sign-in link'}
          <span aria-hidden>→</span>
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] leading-relaxed text-ink/45">
        By continuing you agree to our{' '}
        <a href="/legal/terms" className="underline underline-offset-2">
          Terms
        </a>{' '}
        and{' '}
        <a href="/legal/privacy" className="underline underline-offset-2">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
