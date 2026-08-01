import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { Glyph, Wordmark } from '@/components/Chrome';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b rule">
        <div className="mx-auto flex max-w-band items-center justify-center px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Glyph size={20} />
            <Wordmark className="text-lg" />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center px-5 py-12">
        <Suspense fallback={null}>
          <AuthForm />
        </Suspense>
      </main>
    </div>
  );
}
