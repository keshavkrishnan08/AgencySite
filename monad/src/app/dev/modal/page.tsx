'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { TrialModal } from '@/components/TrialModal';

/** Dev-only visual check for the trial modal. 404s in production. */
export default function DevModal() {
  if (process.env.NODE_ENV === 'production') notFound();
  const [open, setOpen] = useState(true);
  return (
    <div className="min-h-dvh bg-paper p-8">
      <button type="button" onClick={() => setOpen(true)} className="cta">
        Open trial modal
      </button>
      <TrialModal open={open} onClose={() => setOpen(false)} chartId="dev" authed={false} />
    </div>
  );
}
