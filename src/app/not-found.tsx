import type { Metadata } from 'next';
import Link from 'next/link';
import { Glyph, Wordmark } from '@/components/Chrome';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: false },
};

/**
 * The 404. Its CTA used to point at /calculate — a route that has never
 * existed — so the page that catches broken links was itself a broken link.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-16 text-center">
      <Link href="/" className="flex min-h-[44px] items-center gap-2">
        <Glyph size={22} />
        <Wordmark />
      </Link>

      <h1 className="mt-10 font-serif text-4xl">Nothing here.</h1>
      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink/60">
        This page does not exist, or the chart belongs to someone else. Charts
        are private to whoever calculated them.
      </p>

      <Link href="/start" className="cta mt-8">
        Read my chart — free <span aria-hidden>→</span>
      </Link>

      {/* Someone who already has an account needs a way back in, not a signup. */}
      <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
        <Link
          href="/chart"
          className="flex min-h-[44px] items-center font-mono text-[10.5px] uppercase tracking-label text-ink/55 transition-colors hover:text-ink"
        >
          Go to my chart
        </Link>
        <a
          href={`mailto:${BRAND.supportEmail}`}
          className="flex min-h-[44px] items-center font-mono text-[10.5px] uppercase tracking-label text-ink/55 transition-colors hover:text-ink"
        >
          Contact support
        </a>
      </div>
    </div>
  );
}
