"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, ArrowUp, Loader2 } from "lucide-react";
import { encodedContext } from "@/lib/context";
import { getProfile, isPremium } from "@/lib/store";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/* The always-on coach.
 *
 * A floating button on every app page opens a small chat that already knows the
 * person — it ships the mega-context line with every request, so the very first
 * message can be specific to their role and weak spot. Deliberately compact:
 * short answers, quick prompts, and a client-side hourly cap that mirrors the
 * server limiter so heavy users get a friendly ceiling instead of a hard 429. */

type Turn = { role: "user" | "assistant"; content: string };

const STORE_KEY = "pp:coachchat";
const LOG_KEY = "pp:coachchat:log";
const HOURLY_CAP = 30;

const GREETING =
  "Hi, I'm your coach. I can see where you are in your prep. Ask me anything, or tell me what's worrying you about the interview.";

const QUICK = [
  "What should I work on first?",
  "How do I explain my gap?",
  "I'm nervous. Help.",
  "Predict my questions",
];

function loadTurns(): Turn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Turn[]) : [];
  } catch {
    return [];
  }
}

function recentSends(): number[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    const cutoff = Date.now() - 3_600_000;
    return arr.filter((t) => t > cutoff);
  } catch {
    return [];
  }
}

export function CoachChat() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(HOURLY_CAP);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTurns(loadTurns());
    setRemaining(Math.max(0, HOURLY_CAP - recentSends().length));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(turns.slice(-40)));
    } catch {
      /* ignore quota */
    }
  }, [turns]);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [open, turns, busy]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || busy) return;

    const sends = recentSends();
    if (sends.length >= HOURLY_CAP) {
      setTurns((t) => [
        ...t,
        { role: "user", content: msg },
        {
          role: "assistant",
          content:
            "We've chatted a lot this hour. Give it a little while and I'll be right here. In the meantime, the fastest thing you can do is run a quick practice session.",
        },
      ]);
      setInput("");
      setRemaining(0);
      return;
    }

    const next = [...turns, { role: "user" as const, content: msg }];
    setTurns(next);
    setInput("");

    // Non-premium users get a stock nudge instead of AI coaching
    if (!isPremium()) {
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: "I'd love to help — coaching is available with your subscription. It's less than a glass of water per day. Start your free trial to unlock unlimited coaching, scored practice, and your full progress dashboard.",
        },
      ]);
      return;
    }

    setBusy(true);
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify([...sends, Date.now()]));
    } catch {
      /* ignore */
    }
    setRemaining(Math.max(0, HOURLY_CAP - sends.length - 1));
    track("tool:chat_send", { turn: next.filter((t) => t.role === "user").length });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": getProfile().email || "",
        },
        body: JSON.stringify({ messages: next.slice(-10), context: encodedContext() }),
      });
      const data = await res.json();
      if (res.status === 429 || data?.rateLimited) {
        setTurns((t) => [
          ...t,
          { role: "assistant", content: "I need a quick breather, too many messages at once. Try again in a moment." },
        ]);
      } else {
        setTurns((t) => [...t, { role: "assistant", content: data?.reply || "Say that again for me?" }]);
      }
    } catch {
      setTurns((t) => [
        ...t,
        { role: "assistant", content: "I couldn't reach the coach just now. Check your connection and try once more." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) track("tool:chat_open", {});
        }}
        aria-label={open ? "Close coach" : "Open coach"}
        className="fixed bottom-5 right-5 z-40 grid h-13 w-13 place-items-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6"
        style={{ height: 52, width: 52, background: "var(--primary)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={22} />
            </motion.span>
          ) : (
            <motion.span key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles size={22} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed bottom-20 right-4 z-40 flex w-[calc(100vw-2rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border lg:bottom-24 lg:right-6"
            style={{
              height: "min(560px, calc(100vh - 8rem))",
              borderColor: "var(--border)",
              background: "var(--surface)",
              boxShadow: "0 12px 40px -12px rgba(15,23,42,0.28)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "var(--primary-soft)" }}>
                  <Sparkles size={15} className="text-primary-ink" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-ink">Your coach</p>
                  <p className="text-2xs text-ink-3">Ask me anything</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-bg-sunk hover:text-ink" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <Bubble role="assistant">{GREETING}</Bubble>
              {turns.map((t, i) => (
                <Bubble key={i} role={t.role}>
                  {t.content}
                </Bubble>
              ))}
              {busy && (
                <div className="flex items-center gap-2 pl-1 text-ink-3">
                  <Loader2 size={15} className="animate-spin" />
                  <span className="text-xs">Thinking…</span>
                </div>
              )}
              {turns.length === 0 && !busy && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => void send(q)}
                      className="rounded-full border px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:text-ink"
                      style={{ borderColor: "var(--border-strong)" }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t px-3 py-3" style={{ borderColor: "var(--border)" }}>
              <div
                className="flex items-end gap-2 rounded-xl border px-3 py-2"
                style={{ borderColor: "var(--border-strong)", background: "var(--bg)" }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  rows={1}
                  placeholder="Ask your coach…"
                  className="max-h-24 flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
                />
                <button
                  onClick={() => void send(input)}
                  disabled={!input.trim() || busy}
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white transition-opacity",
                    !input.trim() || busy ? "opacity-40" : "hover:opacity-90"
                  )}
                  style={{ background: "var(--primary)" }}
                  aria-label="Send"
                >
                  <ArrowUp size={16} />
                </button>
              </div>
              <p className="mt-1.5 px-1 text-2xs text-ink-3">
                {remaining <= 5 ? `${remaining} messages left this hour` : "Coaching, not a guarantee. Be specific for the best help."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const me = role === "user";
  return (
    <div className={cn("flex", me ? "justify-end" : "justify-start")}>
      <div
        className={cn("max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed", me ? "text-white" : "text-ink")}
        style={
          me
            ? { background: "var(--primary)", borderBottomRightRadius: 6 }
            : { background: "var(--bg-sunk)", borderBottomLeftRadius: 6 }
        }
      >
        {children}
      </div>
    </div>
  );
}
