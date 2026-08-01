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

        <div className="flex-1" />

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
