'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Glyph, Wordmark } from '../Chrome';
import { LockGlyph } from './AppShell';
import { PRICING } from '@/lib/brand';

const NAV = [
  { href: '/updates', label: 'Updates', icon: SunIcon },
  { href: '/chart', label: 'My Chart', icon: TargetIcon },
  { href: '/timing', label: 'Timing', icon: CalendarIcon },
  { href: '/stuck', label: "Why You're Stuck", icon: KnotIcon },
];

/**
 * Left rail. Fixed on desktop, a slide-over on mobile.
 *
 * The locked briefing card is pinned to the bottom on purpose: it is the
 * highest-intent upsell surface in the product, visible on every screen, and
 * it shows real teaser text rather than a generic "upgrade" prompt.
 */
export function Sidebar({
  isPaid,
  briefingTeaser,
  open,
  onClose,
  onAsk,
}: {
  isPaid: boolean;
  briefingTeaser: string | null;
  open: boolean;
  onClose: () => void;
  onAsk: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[216px] flex-col border-r bg-shell transition-transform duration-300 rule lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 pb-4 pt-6 safe-t">
          <Link href="/chart" className="flex min-h-[44px] items-center gap-2" onClick={onClose}>
            <Glyph size={22} />
            <Wordmark />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`mb-1 flex min-h-[42px] items-center gap-3 rounded-[8px] px-3 text-[14px] transition-colors ${
                  active
                    ? 'border border-ledger/25 bg-ledger/[0.07] font-medium text-ink'
                    : 'text-ink/70 hover:bg-ink/[0.04] hover:text-ink'
                }`}
              >
                <Icon active={active} />
                {item.label}
              </Link>
            );
          })}

          <p className="mb-2 mt-7 px-3 font-mono text-[10px] uppercase tracking-eyebrow text-ink/38">
            Always on
          </p>

          {/* Not a route: the panel is persistent, so this focuses it. */}
          <button
            type="button"
            onClick={onAsk}
            className="flex min-h-[46px] w-full items-center gap-3 rounded-[8px] px-3 text-left text-[15px] text-ink/70 transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            <ChatIcon />
            <span className="flex-1">Ask Your Chart</span>
            <span className="h-[7px] w-[7px] rounded-full bg-ledger-mid" aria-hidden />
          </button>
        </nav>

        {/* Pinned upsell — real teaser copy, tail obscured. */}
        {!isPaid && (
          <div className="mx-2.5 mb-2.5 overflow-hidden rounded-[12px] bg-[#2e4739] text-paper shadow-[0_8px_22px_-10px_rgba(34,56,45,0.42)]">
            <div className="px-3.5 pb-3.5 pt-3">
              <p className="flex items-center justify-between gap-2 whitespace-nowrap font-mono text-[7.5px] uppercase tracking-[0.12em] text-paper/55">
                <span>Today&rsquo;s briefing</span>
                <span className="flex shrink-0 items-center gap-1">
                  <LockGlyph /> Locked
                </span>
              </p>

              {/* Real teaser copy, tail dissolved into the card. A hard clip
                  reads as broken; a fade reads as more behind the wall. */}
              <div className="relative mt-2 max-h-[64px] overflow-hidden">
                <p className="font-serif text-[14px] leading-[1.38]">
                  {briefingTeaser ??
                    'Move first today. Your chart favors the bold ask before noon, the one you have been sitting on waiting for a better moment to'}
                </p>
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to bottom, transparent 24%, rgba(46,71,57,0.78) 68%, #2e4739 100%)',
                  }}
                />
              </div>

              <Link
                href="/updates"
                onClick={onClose}
                className="mt-3 flex min-h-[38px] w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] bg-paper px-2 text-[12px] font-semibold text-ink transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.22)]"
              >
                Read today&rsquo;s briefing <span aria-hidden>→</span>
              </Link>
            </div>

            {/* The price sits on its own darker plinth so it reads as a
                footnote to the offer, not part of the button. */}
            <p className="bg-black/12 px-2 py-2 text-center font-mono text-[7px] uppercase leading-[1.6] tracking-[0.1em] text-paper/50">
              A new one every morning · from{' '}
              {PRICING.annual.amount === '$79' ? '$6.58/mo' : PRICING.weekly.amount.replace('.99', '/wk')}
            </p>
          </div>
        )}

      </aside>
    </>
  );
}

/* --------------------------------------------------------------- icons */

function SunIcon({ active }: { active?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden
         className={active ? 'text-ledger' : 'text-ink/45'}>
      <circle cx="9" cy="9" r="3.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.5 3.5l1.4 1.4M13.1 13.1l1.4 1.4M14.5 3.5l-1.4 1.4M4.9 13.1l-1.4 1.4"
            stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function TargetIcon({ active }: { active?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden
         className={active ? 'text-ledger' : 'text-ink/45'}>
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="9" cy="9" r="2.2" fill="currentColor" />
    </svg>
  );
}



function CalendarIcon({ active }: { active?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden
         className={active ? 'text-ledger' : 'text-ink/45'}>
      <rect x="2" y="3.5" width="14" height="12.5" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 7.5h14M6 2v3M12 2v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="9" cy="11.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

function KnotIcon({ active }: { active?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden
         className={active ? 'text-ledger' : 'text-ink/45'}>
      <path d="M3 3c4.5 3.4 7.5 6.1 12 12M15 3C10.5 6.4 7.5 9.1 3 15"
            stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="9" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden className="text-ink/45">
      <path d="M15.5 8.6c0 3.1-2.9 5.6-6.5 5.6-.85 0-1.66-.14-2.4-.4L3 15l1-2.6C2.4 11.4 1.5 10.1 1.5 8.6 1.5 5.5 4.4 3 8 3s7.5 2.5 7.5 5.6Z"
            stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
