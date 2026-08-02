'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AskPanel } from './AskPanel';
import { TrialModal } from '../TrialModal';
import { navLabel } from '@/lib/nav';

interface ShellApi {
  isPaid: boolean;
  /** Raise the trial modal. Every locked surface in the app calls this. */
  unlock: () => void;
  /** Open the ask panel, optionally seeded with a question. */
  ask: (question?: string) => void;
}

const ShellContext = createContext<ShellApi>({
  isPaid: false,
  unlock: () => {},
  ask: () => {},
});

export const useShell = () => useContext(ShellContext);

/**
 * Three-column app shell.
 *
 * Desktop: fixed left rail, fluid centre, fixed right rail.
 * Below xl the right rail becomes a slide-over; below lg the left rail does too.
 * The trial modal lives here so any locked surface, at any depth, can raise it
 * without prop-drilling or mounting a second copy.
 */
export function AppShell({
  firstName,
  isPaid,
  authed,
  briefingTeaser,
  suggestions,
  transitPrompt,
  chartId,
  children,
}: {
  firstName: string;
  isPaid: boolean;
  authed: boolean;
  briefingTeaser: string | null;
  suggestions: string[];
  transitPrompt: string | null;
  chartId?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [trial, setTrial] = useState(false);

  const unlock = useCallback(() => {
    setAskOpen(false);
    setTrial(true);
  }, []);

  const ask = useCallback((question?: string) => {
    setSeed(question ?? null);
    setAskOpen(true);
  }, []);

  return (
    <ShellContext.Provider value={{ isPaid, unlock, ask }}>
      <div className="min-h-dvh bg-shell">
        <Sidebar
          isPaid={isPaid}
          briefingTeaser={briefingTeaser}
          open={menu}
          onClose={() => setMenu(false)}
          onAsk={() => { setMenu(false); ask(); }}
        />

        {/* The rails are fixed, so the centre column is offset by padding. */}
        <div className="lg:pl-[216px] xl:pr-[312px]">
          <TopBar
            label={navLabel(pathname)}
            initial={firstName}
            onMenu={() => setMenu(true)}
            onAsk={() => ask()}
          />
          <main id="main" className="px-4 py-7 sm:px-8 sm:py-9">{children}</main>
        </div>

        <AskPanel
          firstName={firstName}
          isPaid={isPaid}
          suggestions={suggestions}
          transitPrompt={transitPrompt}
          open={askOpen}
          seed={seed}
          onSeedConsumed={() => setSeed(null)}
          onClose={() => setAskOpen(false)}
          onLocked={unlock}
        />

        <TrialModal open={trial} onClose={() => setTrial(false)} chartId={chartId} authed={authed} />
      </div>
    </ShellContext.Provider>
  );
}

/* ------------------------------------------------------------ lock affordances */

/** Full-width unlock button. */
export function LockedCta({ label = 'Unlock full access' }: { label?: string }) {
  const { unlock } = useShell();
  return (
    <button type="button" onClick={unlock} className="cta-sm w-full sm:w-auto">
      {label} <span aria-hidden>→</span>
    </button>
  );
}

/** Small inline lock, e.g. "See my window →". */
export function LockedInline({ label }: { label: string }) {
  const { unlock } = useShell();
  return (
    <button
      type="button"
      onClick={unlock}
      className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-ledger-mid transition-colors hover:text-ledger"
    >
      <LockGlyph /> {label} <span aria-hidden>→</span>
    </button>
  );
}

/**
 * Seeds the ask panel with a specific question — the highest-converting nudge
 * in the product, because a named question gets tapped and an empty box doesn't.
 *
 * `prominent` is the hero variant: green outline, heavier text.
 */
export function AskChip({
  label,
  question,
  prominent = false,
  tone = 'light',
}: {
  label: string;
  question?: string;
  prominent?: boolean;
  tone?: 'light' | 'dark';
}) {
  const { ask } = useShell();

  const base =
    'inline-flex min-h-[42px] items-center gap-2.5 rounded-full border px-4 text-left leading-snug transition-colors';
  const skin = prominent
    ? 'border-ledger-mid bg-white text-[14.5px] font-medium text-ledger hover:bg-ledger/[0.05]'
    : tone === 'dark'
      ? 'border-paper/30 bg-transparent text-[14.5px] text-paper hover:bg-paper/10'
      : 'bg-white/60 text-[14.5px] hover:border-ledger/40 hover:bg-white rule';

  return (
    <button type="button" onClick={() => ask(question ?? label)} className={`${base} ${skin}`}>
      <ChatGlyph />
      {label}
    </button>
  );
}

function ChatGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden className="shrink-0">
      <path
        d="M15.5 8.6c0 3.1-2.9 5.6-6.5 5.6-.85 0-1.66-.14-2.4-.4L3 15l1-2.6C2.4 11.4 1.5 10.1 1.5 8.6 1.5 5.5 4.4 3 8 3s7.5 2.5 7.5 5.6Z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockGlyph() {
  return (
    <svg width="11" height="13" viewBox="0 0 11 13" fill="none" aria-hidden className="shrink-0">
      <rect x="0.75" y="5.25" width="9.5" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 5.25V3.5a2.5 2.5 0 015 0v1.75" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
