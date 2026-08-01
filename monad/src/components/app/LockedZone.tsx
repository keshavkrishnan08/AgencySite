'use client';

import { useShell } from './AppShell';

/**
 * Wraps any blurred region so that clicking it opens checkout.
 *
 * Someone reaching for text they cannot read is the strongest buying signal in
 * the product — a blurred block that swallows the click wastes it. This makes
 * the whole region a target, keyboard-reachable, and announced properly, while
 * the visual blur stays exactly as it was.
 */
export function LockedZone({
  children,
  label = 'Unlock to read this',
  className = '',
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const { unlock } = useShell();
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={unlock}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          unlock();
        }
      }}
      className={`group relative cursor-pointer rounded-[8px] ${className}`}
    >
      {children}
    </div>
  );
}
