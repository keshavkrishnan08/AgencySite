"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { anonId } from "@/lib/attribution";
import { getProfile, getSessions } from "@/lib/store";
import { average } from "@/lib/utils";

/* A five-star row that only asks for words once a rating is given.
 *
 * Sits above the subscribe button. It's deliberately small and skippable —
 * nothing blocks checkout — because the point is a steady trickle of honest
 * ratings at the moment of highest intent, not a survey wall in front of the
 * money. */
export function QuickReview({
  stage = "pre_payment",
  prompt = "How's it been so far?",
  className,
}: {
  stage?: string;
  prompt?: string;
  className?: string;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async (r: number, text: string, done: boolean) => {
    const profile = getProfile();
    const sessions = getSessions();
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "review",
          rating: r,
          body: text || null,
          stage,
          email: profile.email || null,
          anonId: anonId(),
          situation: profile.situation,
          targetRole: profile.targetRole,
          sessionsDone: sessions.length,
          readiness: sessions.length ? average(sessions.slice(-5).map((s) => s.overall)) : null,
          consentPublic: true,
        }),
      });
    } catch {
      /* never block the flow */
    }
    if (done) setSent(true);
  };

  const choose = (r: number) => {
    setRating(r);
    // Save the star immediately: most people never type the words, and the
    // rating alone is the number worth having.
    void send(r, "", false);
  };

  const submit = async () => {
    setBusy(true);
    await send(rating, body.trim(), true);
    setBusy(false);
  };

  if (sent) {
    return (
      <div className={className}>
        <p className="flex items-center gap-2 rounded-xl bg-sage-soft px-4 py-3 text-sm text-sage-ink">
          <Check size={16} /> Thanks. That genuinely helps.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
        <p className="text-sm font-medium text-ink">{prompt}</p>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const lit = n <= (hover || rating);
            return (
              <button
                key={n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => choose(n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                className="rounded p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  size={22}
                  className={lit ? "text-amber" : "text-ink-3"}
                  style={{ fill: lit ? "var(--amber)" : "transparent" }}
                />
              </button>
            );
          })}
        </div>

        {rating > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={rating >= 4 ? "What worked? (optional)" : "What would make it better? (optional)"}
              className="field mt-3 min-h-[64px] resize-y bg-white text-sm"
            />
            <button
              onClick={submit}
              disabled={busy}
              className="mt-2 text-sm font-semibold text-primary-ink hover:underline disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send"}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
