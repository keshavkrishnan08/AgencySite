'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

/** Supabase returns developer strings; the form has to say what to do next. */
function humanise(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'That password does not match this email.';
  if (m.includes('password should be')) return 'Passwords need at least 8 characters.';
  if (m.includes('email address') && m.includes('invalid')) return 'That email address does not look right.';
  if (m.includes('rate') || m.includes('too many')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('fetch') || m.includes('network')) return 'Could not reach the sign-in service. Check your connection.';
  return message;
}

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/chart';

  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    let supabase: ReturnType<typeof supabaseBrowser>;
    try {
      supabase = supabaseBrowser();
    } catch {
      // Missing public keys: the button must say so rather than sit dead.
      setError('Sign-in is not configured on this deployment yet.');
      setBusy(false);
      return;
    }

    // Try sign-in first; fall back to sign-up. One field set, one button —
    // asking a cold visitor to pick "log in or register" costs conversions.
    let signIn: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
    try {
      signIn = await supabase.auth.signInWithPassword({ email, password });
    } catch (e) {
      setError(humanise(e instanceof Error ? e.message : 'network'));
      setBusy(false);
      return;
    }

    if (!signIn.error) {
      await fetch('/api/claim', { method: 'POST' }).catch(() => {});
      router.push(next);
      router.refresh();
      return;
    }

    if (signIn.error.message.toLowerCase().includes('invalid login credentials')) {
      const signUp = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (signUp.error) {
        setError(humanise(signUp.error.message));
        setBusy(false);
        return;
      }

      if (signUp.data.session) {
        await fetch('/api/claim', { method: 'POST' }).catch(() => {});
        router.push(next);
        router.refresh();
        return;
      }

      setNotice(
        'Check your email to confirm your address, then come back and sign in.',
      );
      setBusy(false);
      return;
    }

    setError(humanise(signIn.error.message));
    setBusy(false);
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="font-serif text-3xl">Welcome back.</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
        Your email and a password. If you have not been here before, this
        creates your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-3">
        <input
          className="field"
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          enterKeyHint="next"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email address"
        />
        <input
          className="field"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          enterKeyHint="go"
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Password"
        />

        {error && (
          <p role="alert" className="text-sm text-oxblood">
            {error}
          </p>
        )}
        {notice && <p className="text-sm text-ledger">{notice}</p>}

        <button type="submit" disabled={busy} className="cta w-full disabled:opacity-60">
          {busy ? 'One moment…' : 'Continue'}
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

