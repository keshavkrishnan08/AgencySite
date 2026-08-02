'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/chart';

  // Pre-fill from the email entered during onboarding.
  const saved = typeof window !== 'undefined'
    ? (params.get('email') || localStorage.getItem('axon_email') || '')
    : '';

  const [email, setEmail] = useState(saved);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // Try sign-in first. If no account exists, sign up automatically.
    // With mailer_autoconfirm enabled, signup returns a session immediately.
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (!signInError) {
      await fetch('/api/claim', { method: 'POST' }).catch(() => {});
      router.push(next);
      router.refresh();
      return;
    }

    if (signInError.message.toLowerCase().includes('invalid login credentials')) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: localStorage.getItem('axon_name') ?? undefined } },
      });

      if (signUpError) {
        const m = signUpError.message.toLowerCase();
        if (m.includes('password')) setError('Password needs at least 6 characters.');
        else if (m.includes('email')) setError('That email address does not look right.');
        else if (m.includes('rate') || m.includes('too many')) setError('Too many attempts. Wait a minute.');
        else setError(signUpError.message);
        setBusy(false);
        return;
      }

      if (data.session) {
        await fetch('/api/claim', { method: 'POST' }).catch(() => {});
        router.push(next);
        router.refresh();
        return;
      }

      // Shouldn't reach here with autoconfirm, but handle gracefully.
      setError('Check your email to confirm, then sign in.');
      setBusy(false);
      return;
    }

    // Other sign-in errors.
    const m = signInError.message.toLowerCase();
    if (m.includes('rate') || m.includes('too many')) setError('Too many attempts. Wait a minute.');
    else setError('That password does not match this email.');
    setBusy(false);
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="font-serif text-3xl">Sign in.</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
        Enter your email and a password. If you&rsquo;re new, this creates your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-3">
        <input
          className="field"
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          autoFocus
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
          minLength={6}
          autoComplete="current-password"
          enterKeyHint="go"
          placeholder="Password (6+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Password"
        />

        {error && (
          <p role="alert" className="text-sm text-oxblood">{error}</p>
        )}

        <button type="submit" disabled={busy} className="cta w-full disabled:opacity-60">
          {busy ? 'One moment…' : 'Continue'}
          <span aria-hidden>→</span>
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] leading-relaxed text-ink/45">
        By continuing you agree to our{' '}
        <a href="/legal/terms" className="underline underline-offset-2">Terms</a>{' '}
        and{' '}
        <a href="/legal/privacy" className="underline underline-offset-2">Privacy Policy</a>.
      </p>
    </div>
  );
}
