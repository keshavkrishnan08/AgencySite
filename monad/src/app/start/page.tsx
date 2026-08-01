import type { Metadata } from 'next';
import Link from 'next/link';
import { StartFlow } from '@/components/StartFlow';
import { Glyph, Wordmark } from '@/components/Chrome';

export const metadata: Metadata = {
  title: 'Read your chart',
  robots: { index: false, follow: false },
};

/**
 * The modal sits over a dimmed, blurred page — the same treatment the
 * reference uses. Keeps the marketing context visible without letting it
 * compete for attention.
 */
export default function StartPage() {
  return (
    <div className="relative min-h-dvh bg-ink/95">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10]">
        <div className="h-full w-full bg-[radial-gradient(circle_at_50%_20%,#c2a05b_0%,transparent_60%)]" />
      </div>

      <div className="relative flex min-h-dvh flex-col">
        <header className="flex items-center justify-center py-5">
          <Link href="/" className="flex min-h-[44px] items-center gap-2 opacity-80 transition-opacity hover:opacity-100">
            <Glyph size={20} />
            <Wordmark className="text-lg text-paper" />
          </Link>
        </header>

        <main className="flex flex-1 items-start justify-center px-4 pb-12 sm:items-center sm:pb-16">
          <StartFlow />
        </main>
      </div>
    </div>
  );
}
