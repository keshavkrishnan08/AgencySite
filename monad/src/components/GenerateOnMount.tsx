'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Fires a one-off generation on mount, then refreshes the server component.
 * Generation takes 30–60s, which cannot happen inside a page render without
 * blowing the request timeout.
 */
export function GenerateOnMount({
  endpoint,
  title,
  stages,
}: {
  endpoint: string;
  title: string;
  stages: string[];
}) {
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setStage((s) => Math.min(s + 1, stages.length - 1)), 6000);
    return () => clearInterval(t);
  }, [stages.length]);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    (async () => {
      try {
        const res = await fetch(endpoint, { method: 'POST' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? 'Generation failed.');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Generation failed.');
      }
    })();
  }, [endpoint, router]);

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="font-serif text-2xl">That didn&rsquo;t work.</p>
        <p className="mt-3 text-[15px] text-ink/60">{error}</p>
        <button type="button" onClick={() => window.location.reload()} className="cta mt-7">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-20 text-center">
      <svg viewBox="0 0 100 100" className="h-16 w-16 animate-spin [animation-duration:8s]" aria-hidden>
        <circle cx="50" cy="50" r="45" fill="none" stroke="#c2a05b" strokeOpacity="0.25" strokeWidth="1" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="#c2a05b" strokeWidth="1.6" strokeDasharray="22 261" strokeLinecap="round" />
      </svg>
      <h1 className="mt-7 font-serif text-2xl" dangerouslySetInnerHTML={{ __html: title }} />
      <p key={stage} className="eyebrow mt-3 animate-fade-up">{stages[stage]}</p>
    </div>
  );
}
