'use client';

import { useEffect, useRef, useState } from 'react';

interface Msg { role: 'user' | 'assistant'; content: string }

const DAILY_LIMIT = 15;

/**
 * Right rail. Always present on desktop, a slide-over on mobile.
 *
 * The suggestion chips are the whole conversion mechanic — an empty chat box
 * gets ignored, whereas a specific question about their own chart gets tapped.
 * The last chip is transit-aware so it changes every day.
 */
export function AskPanel({
  firstName,
  isPaid,
  suggestions,
  transitPrompt,
  open,
  seed,
  onSeedConsumed,
  onClose,
  onLocked,
}: {
  firstName: string;
  isPaid: boolean;
  suggestions: string[];
  transitPrompt: string | null;
  open: boolean;
  /** A question raised from elsewhere in the app; sent as soon as it arrives. */
  seed?: string | null;
  onSeedConsumed?: () => void;
  onClose: () => void;
  onLocked: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Set when the server says the one free answer is gone. Drives the inline
  // upsell rather than a modal — the pitch belongs in the conversation.
  const [freeSpent, setFreeSpent] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(t: string) => void>(() => {});

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  // Seeded questions fire once. sendRef keeps `send` out of the dependency
  // list, which would otherwise re-fire the question on every render.
  useEffect(() => {
    if (!seed) return;
    sendRef.current(seed);
    onSeedConsumed?.();
  }, [seed, onSeedConsumed]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || busy) return;
    // Unpaid visitors are NOT blocked here — the server grants one real answer
    // and tells us when it is spent. Blocking client-side would put the
    // paywall before the value instead of immediately after it.
    if (!isPaid && freeSpent) return onLocked();

    setBusy(true);
    setError(null);
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: body }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: body }),
      });
      const json = await res.json().catch(() => null);
      if (res.status === 402) {
        setFreeSpent(true);
        // Drop the question we optimistically appended — it was never answered.
        setMessages((m) => m.slice(0, -1));
        return;
      }
      if (!res.ok || !json?.reply) {
        throw new Error(
          json?.error ??
            (res.status === 429
              ? 'That is your questions for today. It resets at midnight.'
              : 'Could not reach your chart. Try again in a moment.'),
        );
      }
      setMessages((m) => [...m, { role: 'assistant', content: json.reply }]);
      setUsed((u) => u + 1);
      if (!isPaid) setFreeSpent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not answer.');
    } finally {
      setBusy(false);
    }
  }

  sendRef.current = (t: string) => void send(t);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm xl:hidden" onClick={onClose} aria-hidden />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[312px] flex-col border-l bg-panel transition-transform duration-300 rule xl:translate-x-0 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b px-4 py-4 safe-t rule">
          <p className="flex items-center gap-2.5 font-serif text-[15.5px]">
            <svg viewBox="0 0 24 24" className="h-[19px] w-[19px] text-ledger-mid" fill="none" aria-hidden>
              <circle cx="12" cy="10" r="4.2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M12 14.2v6M9 17.6h6M8.6 4.2a4.6 4.6 0 006.8 0"
                    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Ask Your Chart
          </p>
          <p className="hidden font-mono text-[9px] uppercase tracking-label text-ink/38 sm:block">
            Remembers you
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex h-11 w-11 items-center justify-center text-ink/45 xl:hidden"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3.5 py-4">
          {messages.length === 0 ? (
            <>
              <p className="font-serif text-[16px] leading-[1.4]">
                Your chart has read the whole file, {firstName.toLowerCase()}. Ask it
                something specific.
              </p>

              <div className="mt-4 space-y-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="flex w-full items-start gap-3 rounded-[10px] border border-brass-deep/22 bg-[#ece6d9] px-3 py-2.5 text-left text-[12.5px] leading-[1.45] transition-all hover:border-ledger-mid/45 hover:bg-[#e6dfd0]"
                  >
                    <span className="mt-[3px] shrink-0 font-semibold text-ledger-mid" aria-hidden>→</span>
                    {s}
                  </button>
                ))}

                {transitPrompt && (
                  <button
                    type="button"
                    onClick={() => send(transitPrompt)}
                    className="flex w-full items-start gap-3 rounded-[10px] border border-brass-deep/22 bg-[#ece6d9] px-3 py-2.5 text-left text-[12.5px] leading-[1.45] transition-all hover:border-ledger-mid/45 hover:bg-[#e6dfd0]"
                  >
                    <span className="mt-[3px] shrink-0 text-[13px] text-ledger-mid" aria-hidden>◉</span>
                    {transitPrompt}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <p className="max-w-[92%] rounded-[20px] rounded-br-[6px] bg-ledger-mid px-3.5 py-2.5 text-[13px] leading-[1.5] text-paper">
                      {m.content}
                    </p>
                  </div>
                ) : (
                  <div key={i}>
                    <p className="mb-2.5 font-mono text-[10px] uppercase tracking-label text-ledger-mid">
                      Your chart
                    </p>
                    {m.content.split('\n').filter(Boolean).map((p, k) => (
                      <p key={k} className="mb-2 text-[13px] leading-[1.7] text-ink/85">{p}</p>
                    ))}
                  </div>
                ),
              )}

              {/* Thinking state. A spinner reads as latency; naming what it is
                  actually doing reads as work being done on your behalf. */}
              {busy && (
                <div>
                  <p className="mb-2.5 font-mono text-[10px] uppercase tracking-label text-ledger-mid">
                    Your chart
                  </p>
                  <p className="animate-drawing-pulse font-mono text-[12px] uppercase leading-[1.35] tracking-[0.12em] text-ink/60">
                    Consulting your placements
                  </p>
                </div>
              )}

              {/* The wall lands immediately after the value, inside the
                  conversation, while the answer they just read is still on
                  screen. That adjacency is the whole mechanic. */}
              {freeSpent && !isPaid && !busy && (
                <div className="rounded-[12px] border border-brass-deep/25 bg-[#eef0e6] p-5">
                  <p className="font-serif text-[15.5px] leading-snug">
                    That was your free answer for today.
                  </p>
                  <p className="mt-2 text-[13.5px] leading-[1.55] text-ink/68">
                    Your chart has more to say. Full access opens the whole
                    conversation, plus daily briefings and timing windows.
                  </p>
                  <button
                    type="button"
                    onClick={onLocked}
                    className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[8px] bg-ledger-mid text-[14.5px] font-semibold text-paper transition-all hover:bg-ledger"
                  >
                    Start 3 days free <span aria-hidden>→</span>
                  </button>
                </div>
              )}

              <div ref={endRef} />
            </div>
          )}

          {error && <p role="alert" className="mt-4 text-sm text-oxblood">{error}</p>}
        </div>

        <div className="border-t px-3.5 pb-3.5 pt-3 safe-b rule">
          <form
            className="rounded-[12px] border border-brass-deep/22 bg-[#f4efe3] px-3.5 py-3"
            onSubmit={(e) => { e.preventDefault(); void send(input); }}
          >
            <input
              className="min-h-[36px] w-full bg-transparent text-[13.5px] outline-none placeholder:text-ink/38"
              placeholder="Ask your chart anything…"
              value={input}
              maxLength={2000}
              enterKeyHint="send"
              onChange={(e) => setInput(e.target.value)}
            />
            <div className="mt-2.5 flex items-center justify-between">
              <span className="font-mono text-[11px] text-ink/45">
                <span className="text-ledger-mid">{used}</span> of{' '}
                {isPaid ? DAILY_LIMIT : 1} today
              </span>
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-ledger-mid text-[17px] text-paper shadow-[0_2px_8px_rgba(47,112,80,0.28)] transition-all hover:bg-ledger disabled:bg-ledger-mid/40 disabled:shadow-none"
              >
                →
              </button>
            </div>
          </form>

          <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-label text-ink/35">
            Grounded in your real chart · Resets at midnight
          </p>
        </div>
      </aside>
    </>
  );
}
