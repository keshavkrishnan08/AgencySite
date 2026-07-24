"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { anonId, attribution } from "@/lib/attribution";
import { identify, track } from "@/lib/analytics";
import { PLANS } from "@/lib/pricing";

/* Presale capture.
 *
 * The ad spend is buying one number: does this audience hand over an email at
 * a price you can afford. So this asks for the email and nothing else, then
 * asks the price question separately — after they've already committed, when
 * a second question is cheap. Two steps convert better than one long form and
 * give you a far more useful list. */

type Phase = "email" | "intent" | "done";

export function PresaleForm({
  source = "landing",
  className,
  compact = false,
  cta = "Get early access",
}: {
  source?: string;
  className?: string;
  /** Stack the input above the button, for narrow columns like pricing cards. */
  compact?: boolean;
  cta?: string;
}) {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const price = PLANS.quarterly;

  const send = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        source,
        anonId: anonId(),
        attribution: attribution(),
        ...payload,
      }),
    });
    // Throw on a real failure so the user is asked to retry rather than being
    // told they're on a list they never made it onto.
    if (!res.ok) throw new Error("lead not stored");
    return res.json().catch(() => ({}));
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value)) {
      setError("That email doesn't look right.");
      track("form:error", { form: "presale", source, reason: "invalid_email" });
      return;
    }
    setError("");
    setBusy(true);
    try {
      identify(value);
      await send({ intent: "waitlist" });
      track("lead_captured", { source });
      setPhase("intent");
    } catch {
      setError("Something went wrong. Try again?");
    } finally {
      setBusy(false);
    }
  };

  const submitIntent = async (intent: "presale_yes" | "presale_maybe") => {
    setBusy(true);
    try {
      await send({ intent, quotedPriceCents: price.amountCents });
      track("presale_intent", { intent, source, value: price.amountCents / 100 });
      track("presale:answered", { intent, source });
      setPhase("done");
    } finally {
      setBusy(false);
    }
  };

  if (phase === "done") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={className}
      >
        <div className="rounded-2xl border-2 p-6 text-center" style={{ borderColor: "var(--sage)", background: "var(--sage-soft)" }}>
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white/70">
            <Check size={22} className="text-sage-ink" />
          </span>
          <p className="mt-3 font-serif text-lg font-semibold text-sage-ink">You&apos;re on the list.</p>
          <p className="mt-1 text-sm text-ink-2">
            We&apos;ll email you the moment it opens, with founding-member pricing held for you.
          </p>
        </div>
      </motion.div>
    );
  }

  if (phase === "intent") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={className}
      >
        <div className="rounded-2xl border-2 p-6" style={{ borderColor: "var(--primary)", background: "var(--primary-soft)" }}>
          <p className="text-2xs font-semibold uppercase tracking-wider text-primary-ink">One last thing</p>
          <p className="mt-1.5 font-serif text-lg font-semibold text-ink">
            It&apos;s {price.price} for three months. {price.perMonth}. Would you pay that?
          </p>
          <p className="mt-1 text-sm text-ink-2">
            Honest answers only. It decides what we build next.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => submitIntent("presale_yes")} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : null} Yes, I&apos;d pay that
            </Button>
            <Button variant="secondary" onClick={() => submitIntent("presale_maybe")} disabled={busy}>
              Not sure yet
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submitEmail} className={className}>
      <div className={compact ? "flex flex-col gap-2.5" : "flex flex-col gap-2.5 sm:flex-row"}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address"
          onFocus={() => track("presale:email_focus", { source })}
          className={compact ? "field w-full" : "field flex-1"}
          required
        />
        <Button
          type="submit"
          size={compact ? "md" : "lg"}
          disabled={busy}
          className={compact ? "w-full" : "shrink-0"}
        >
          {busy ? (
            <>
              <Loader2 size={compact ? 16 : 18} className="animate-spin" /> Saving…
            </>
          ) : (
            <>
              {cta} <ArrowRight size={compact ? 15 : 18} />
            </>
          )}
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-coral-ink">{error}</p>
      ) : (
        <p className={compact ? "mt-2 text-2xs text-ink-3" : "mt-2 text-xs text-ink-3"}>
          No spam, no sharing. One email when it opens, and founding-member pricing.
        </p>
      )}
    </form>
  );
}
