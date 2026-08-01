'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Centre-column top bar: breadcrumb, the ⌘K ask field, sync clock, avatar.
 * The avatar is the settings entry point and is present on every screen.
 */
export function TopBar({
  label,
  initial,
  onMenu,
  onAsk,
}: {
  label: string;
  initial: string;
  onMenu: () => void;
  onAsk: () => void;
}) {
  const [now, setNow] = useState<string>('');

  // Rendered client-side only: a server-rendered clock would hydrate mismatched.
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      );
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onAsk();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAsk]);

  return (
    <header className="sticky top-0 z-30 border-b bg-shell/92 backdrop-blur-md rule">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center text-ink/60 lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <p className="hidden shrink-0 font-mono text-[10.5px] uppercase tracking-eyebrow text-ink/45 lg:block">
          {label}
        </p>

        <button
          type="button"
          onClick={onAsk}
          className="mx-auto flex h-11 w-full max-w-[420px] items-center gap-2.5 rounded-[8px] border bg-white/60 px-3.5 text-left transition-colors hover:border-ink/25 rule"
        >
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden className="shrink-0 text-brass-deep">
            <path d="M15.5 8.6c0 3.1-2.9 5.6-6.5 5.6-.85 0-1.66-.14-2.4-.4L3 15l1-2.6C2.4 11.4 1.5 10.1 1.5 8.6 1.5 5.5 4.4 3 8 3s7.5 2.5 7.5 5.6Z"
                  stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
          <span className="flex-1 truncate text-[14.5px] text-ink/40">Ask your chart anything…</span>
          <kbd className="hidden shrink-0 rounded-[4px] border px-1.5 py-0.5 font-mono text-[10px] text-ink/40 sm:block rule">
            ⌘K
          </kbd>
        </button>

        <p className="hidden shrink-0 font-mono text-[10px] uppercase tracking-label text-ink/40 xl:block">
          Synced · {now}
        </p>

        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ledger text-[15px] font-semibold text-paper transition-opacity hover:opacity-88"
        >
          {initial.slice(0, 1).toUpperCase()}
        </Link>
      </div>
    </header>
  );
}
