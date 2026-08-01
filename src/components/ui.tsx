'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EVENTS, track } from './Analytics';
import { StartFlow } from './StartFlow';

/**
 * Primary call to action.
 *
 * `modal` opens the birth-data flow in a popup over the landing page instead of
 * navigating away — the reference's behaviour. Keeping the marketing context
 * behind the form is worth real conversion: a full page change costs intent.
 */
export function Cta({
  href = '/start',
  children,
  variant = 'primary',
  location,
  className = '',
  modal = false,
}: {
  href?: string;
  children: React.ReactNode;
  variant?: 'primary' | 'pill' | 'ghost';
  location: string;
  className?: string;
  modal?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const cls = variant === 'pill' ? 'cta-pill' : variant === 'ghost' ? 'cta-ghost' : 'cta';

  if (modal) {
    return (
      <>
        <button
          type="button"
          className={`${cls} ${className}`}
          onClick={() => {
            track(EVENTS.ctaClick, { location });
            setOpen(true);
          }}
        >
          {children}
        </button>
        <StartModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <Link href={href} className={`${cls} ${className}`} onClick={() => track(EVENTS.ctaClick, { location })}>
      {children}
    </Link>
  );
}

export function Accordion({ items }: { items: { q: string; a: React.ReactNode }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="border-t rule">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="font-serif text-lg font-normal sm:text-xl">{item.q}</span>
              <span
                aria-hidden
                className={`shrink-0 text-brass-deep transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
            </button>
            <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] pb-6' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <div className="max-w-measure text-[15px] leading-relaxed text-ink/68">{item.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Tabbed reading preview. Panel copy renders in serif so it reads as output. */
export function Tabs({ tabs }: { tabs: { key: string; label: string; body: string }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="no-bar -mx-5 flex gap-2 overflow-x-auto px-5 pb-3 sm:mx-0 sm:justify-center sm:px-0" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            // Fully rounded, 22px gutters, 1.84px tracking — the reference's
            // pill, not a rounded rectangle.
            className={`flex min-h-[44px] shrink-0 items-center rounded-full border px-[22px] font-mono text-[11.5px] uppercase tracking-[0.16em] transition-colors ${
              i === active
                ? 'border-ledger bg-ledger text-paper'
                : 'border-brass-deep/40 text-ink/60 hover:border-brass-deep/75'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-[3px] border bg-white/40 p-6 sm:p-10 rule">
        <p className="eyebrow">The reading · {tabs[active].label}</p>
        <p className="mt-4 font-serif text-[18.5px] leading-relaxed text-ink/85 sm:text-xl">
          {tabs[active].body}
        </p>
      </div>
    </div>
  );
}

/**
 * Dark green top bar: free trial + no card + bonus.
 *
 * Measured off the reference: #22382d, IBM Plex Mono 12px / 1.2px tracking,
 * the lead clause in brass at weight 600, the rest in paper, one line.
 */
export function AnnouncementBar({
  lead,
  children,
}: {
  lead: string;
  children: React.ReactNode;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="relative bg-ledger text-paper safe-t">
      <div className="mx-auto flex max-w-[1060px] items-center justify-center gap-3.5 px-11 py-2.5">
        <p className="text-center font-mono text-[10.5px] uppercase leading-[1.5] tracking-[0.1em] sm:text-[12px]">
          <b className="font-semibold text-brass">{lead}</b> {children}
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setHidden(true)}
        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[18px] leading-none text-paper/60 hover:text-paper"
      >
        &times;
      </button>
    </div>
  );
}


/**
 * The birth-data flow as an overlay. Dimmed and blurred behind, escape closes,
 * body scroll locked — the same treatment /start gives it as a full page, so
 * the two entry points behave identically.
 *
 * Portalled to <body> on purpose. The nav CTA lives inside a header carrying
 * `backdrop-blur`, and backdrop-filter establishes a containing block: rendered
 * in place, `fixed inset-0` would resolve against the 72px header instead of
 * the viewport, and the modal would open as a sliver.
 */
function StartModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-ink/80 backdrop-blur-[6px]"
      role="dialog"
      aria-modal="true"
      aria-label="Read your chart"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex min-h-full items-start justify-center p-4 sm:items-center"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="w-full max-w-[560px]">
          <StartFlow />
          <button
            type="button"
            onClick={onClose}
            className="mx-auto mt-4 flex min-h-[44px] items-center px-4 text-[15px] text-paper/60 underline underline-offset-4 hover:text-paper"
          >
            Not now
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
