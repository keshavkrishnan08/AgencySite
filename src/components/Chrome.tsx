import Link from 'next/link';
import { BRAND, DISCLAIMER } from '@/lib/brand';
import { Cta } from './ui';

/** Fraunces wordmark with the brass full stop. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-serif text-[22px] font-medium ${className}`}>
      {BRAND.name}
      <span className="text-brass">{BRAND.punctuation}</span>
    </span>
  );
}

/** Mercury sigil — small enough to read as a mark, not an illustration. */
export function Glyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className="text-brass-deep">
      <circle cx="12" cy="10" r="4.2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M12 14.2v6M9 17.6h6M8.6 4.2a4.6 4.6 0 006.8 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Nav({ authed = false }: { authed?: boolean }) {
  return (
    // Not sticky itself: the landing page pins it together with the
    // announcement bar in one chrome block, the way the reference does.
    <header className="border-b bg-paper/92 backdrop-blur-md rule">
      {/* Three columns spread apart, capped at 1060px — the reference's exact
          measure. Without the cap the nav drifts to the right edge on wide
          screens and the wordmark ends up stranded on its own. */}
      <div className="mx-auto grid max-w-[1060px] grid-flow-col items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="flex min-h-[44px] items-center gap-3">
          <Glyph />
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {[
            ['#how-it-works', 'How It Works'],
            ['#pricing', 'Pricing'],
            ['#faq', 'FAQ'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="flex min-h-[44px] items-center font-mono text-[11.5px] uppercase tracking-nav text-ink/65 transition-colors hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-6">
          <Link
            href={authed ? '/chart' : '/login'}
            className="flex min-h-[44px] items-center font-mono text-[11.5px] uppercase tracking-nav text-ink/65 transition-colors hover:text-ink"
          >
            {authed ? 'Dashboard' : 'Log in'}
          </Link>

          <Cta modal variant="pill" location="nav">
            Start free <span aria-hidden>→</span>
          </Cta>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink px-5 pb-10 pt-16 text-paper sm:px-8">
      <div className="mx-auto max-w-band">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <Wordmark className="text-paper" />
            <p className="mt-3 text-sm text-paper/55">{BRAND.strapline}</p>
          </div>

          <div className="flex gap-14">
            <div>
              <p className="eyebrow text-brass">Company</p>
              <ul className="mt-3 space-y-1 text-sm text-paper/65">
                <li><a href={`mailto:${BRAND.supportEmail}`} className="inline-block py-3 hover:text-paper">Contact</a></li>
                {/* Cancellation has to be reachable from any page, not only
                    from inside a signed-in account screen. */}
                <li><Link href="/settings" className="inline-block py-3 hover:text-paper">Cancel subscription</Link></li>
                <li><Link href="/legal/terms" className="inline-block py-3 hover:text-paper">Terms</Link></li>
                <li><Link href="/legal/privacy" className="inline-block py-3 hover:text-paper">Privacy</Link></li>
                <li><Link href="/legal/refunds" className="inline-block py-3 hover:text-paper">Refunds</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-paper/10 pt-6">
          <p className="max-w-3xl text-xs leading-relaxed text-paper/40">
            {DISCLAIMER} © {new Date().getFullYear()} {BRAND.name}.
          </p>
        </div>
      </div>
    </footer>
  );
}
