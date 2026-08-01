'use client';

import { LockedCta } from './AppShell';
import { LockedZone } from './LockedZone';

/**
 * The standard locked block: real first line, then a gradient-obscured tail.
 *
 * The teaser is genuine copy from the section being sold, not lorem — the whole
 * reason this converts is that the visible sentence is specific enough to prove
 * the rest is worth paying for.
 */
export function Locked({
  teaser,
  label = 'Unlock full access',
  tone = 'light',
}: {
  teaser: string;
  label?: string;
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';

  return (
    <div className={`rounded-[10px] border p-5 sm:p-6 ${dark ? 'border-paper/15 bg-ledger text-paper' : 'bg-white/55 rule'}`}>
      <LockedZone label={label} className="relative max-h-[132px] overflow-hidden">
        <p className={`text-[16.5px] leading-[1.75] ${dark ? 'text-paper/90' : 'text-ink/85'}`}>
          {teaser}
        </p>
        {/* Two decoy lines under the fade: the block has to look like it
            continues, or the gradient reads as an empty state. */}
        <p aria-hidden className={`locked-text mt-4 text-[16.5px] leading-[1.75] ${dark ? 'text-paper' : 'text-ink'}`}>
          The pattern underneath this is consistent enough that you can plan
          around it, and it is the part you have never been shown in language
          that names the cost.
        </p>
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24"
          style={{
            background: dark
              ? 'linear-gradient(to bottom, rgba(34,56,45,0) 0%, #22382d 88%)'
              : 'linear-gradient(to bottom, rgba(250,248,240,0) 0%, #faf8f0 88%)',
          }}
        />
      </LockedZone>

      <div className="mt-4">
        <LockedCta label={label} />
      </div>

      <p className={`mt-3 font-mono text-[10px] uppercase tracking-label ${dark ? 'text-paper/50' : 'text-ink/45'}`}>
        3 days free · Cancel in 2 taps
      </p>
    </div>
  );
}
