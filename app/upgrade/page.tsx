"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Lock, ShieldCheck, Loader2, PartyPopper } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { getProfile, upgradeToPremium } from "@/lib/store";
import { track } from "@/lib/analytics";
import { PLANS, type PlanKey } from "@/lib/pricing";
import { QuickReview } from "@/components/feedback/QuickReview";

const INCLUDED = [
  "Unlimited scored mock interviews",
  "All five dimensions, scored on every answer",
  "A real follow-up question after each answer",
  "The Anxiety Detector on every session",
  "Your full metrics: percentile, pace, projections",
  "Estimated time to a top 1% interview",
  "Streaks, milestones and personal records",
  "Question Predictor for any job posting",
  "Practice the predicted questions, scored",
  "Gap Story Builder with unlimited revisions",
  "Example great answers for every question",
  "Speak your answers, with delivery metrics",
];

export default function UpgradePage() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "processing" | "done">("idle");
  // Default to quarterly: it matches how long a search actually takes, and the
  // pre-selected option is the single biggest lever on plan mix.
  const [plan, setPlan] = useState<PlanKey>("quarterly");
  const p = PLANS[plan];

  useEffect(() => {
    track("upgrade_view");
  }, []);

  const subscribe = async () => {
    setState("processing");
    track("upgrade_click", { plan });
    // Try real Stripe Checkout first; fall back to demo if not configured.
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: getProfile().email || undefined }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url; // real Stripe Checkout
        return;
      }
    } catch {
      /* fall through to demo */
    }
    // Demo path (no Stripe keys): optimistic local upgrade.
    setTimeout(() => {
      upgradeToPremium();
      track("upgrade_success", { plan, mode: "demo" });
      setState("done");
      setTimeout(() => router.push("/dashboard"), 1700);
    }, 1100);
  };

  return (
    <AppShell>
      <main className="container-wide max-w-5xl py-12">
        <div className="text-center">
          <PremiumBadge label="Axon Careers Premium" className="mx-auto" />
          <span className="sr-only">Axon Careers Premium</span>
          <h1 className="mt-5 text-balance font-serif text-display font-semibold text-ink">
            Everything you need to walk in ready.
          </h1>
          <p className="mx-auto mt-4 max-w-prose text-lg text-ink-2">
            The average job search runs about three months. So does the plan most people pick.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Benefits */}
          <div className="card-elevated p-8">
            <h2 className="font-serif text-xl font-semibold text-ink">What&apos;s included</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {INCLUDED.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-2">
                  <Check size={17} className="mt-0.5 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Order summary */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div
              className="rounded-2xl border-2 p-7 shadow-lg"
              style={{ borderColor: "var(--primary)", background: "var(--surface)" }}
            >
              {state === "done" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center"
                >
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage-soft text-sage-ink">
                    <PartyPopper size={30} />
                  </span>
                  <h3 className="mt-5 font-serif text-2xl font-semibold text-ink">You&apos;re Premium! 🎉</h3>
                  <p className="mt-2 text-ink-2">Everything is unlocked. Taking you to your metrics…</p>
                </motion.div>
              ) : (
                <>
                  {/* plan toggle */}
                  <div className="mb-2 flex rounded-full bg-bg-tint p-1">
                    {(Object.keys(PLANS) as PlanKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => { setPlan(key); track("ui:click", { label: "plan_toggle", plan: key }); }}
                        className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all ${
                          plan === key ? "bg-white text-ink shadow-xs" : "text-ink-2 hover:text-ink"
                        }`}
                      >
                        {PLANS[key].toggle}
                        {PLANS[key].savePct > 0 && (
                          <span className="ml-1.5 text-2xs font-bold text-sage-ink">
                            −{PLANS[key].savePct}%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="mb-5 text-center text-2xs font-medium text-ink-3">
                    🔥 Most people pick 3 months. It&apos;s how long a search takes.
                  </p>

                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-serif text-xl font-semibold text-ink">Premium</h2>
                    <span className="flex items-baseline gap-2">
                      {p.was && (
                        <span className="font-serif text-xl font-semibold text-ink-3 line-through">{p.was}</span>
                      )}
                      <span className="font-serif text-3xl font-semibold" style={{ color: "var(--primary-ink)" }}>
                        {p.price}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm text-ink-3">{p.cadence}</p>
                  <p className="mt-1 text-sm font-medium text-sage-ink">{p.perMonth}</p>

                  <div className="my-6 hairline" />

                  <div className="space-y-2 text-sm">
                    <Row label={`Premium · ${p.toggle}`} value={p.was ?? p.price} />
                    {p.saveAmount && <Row label={`You save ${p.savePct}%`} value={`-${p.saveAmount}`} />}
                    <Row label="Due today" value={p.price} bold />
                  </div>

                  {/* Nudge monthly pickers toward the plan that covers the search */}
                  {plan === "monthly" && (
                    <button
                      onClick={() => setPlan("quarterly")}
                      className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-left text-sm transition-colors hover:bg-sage-soft/40"
                      style={{ borderColor: "var(--sage)" }}
                    >
                      <span className="text-ink-2">
                        💡 Three months costs less than two.{" "}
                        <span className="font-semibold text-sage-ink">Save $9.98</span>
                      </span>
                      <span className="shrink-0 font-semibold text-sage-ink">Switch →</span>
                    </button>
                  )}

                  <Button onClick={subscribe} disabled={state === "processing"} size="lg" className="mt-6 w-full">
                    {state === "processing" ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Processing…
                      </>
                    ) : (
                      <>
                        <Lock size={16} /> Subscribe — {p.price}
                      </>
                    )}
                  </Button>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-3">
                    <ShieldCheck size={13} /> Secure checkout · powered by Stripe · cancel anytime
                  </p>

                  {/* Asked before payment, while intent is highest. Skippable,
                      and it never gates the subscribe button. */}
                  <QuickReview
                    className="mt-5"
                    stage="pre_payment"
                    prompt="How's your first scored answer been?"
                  />
                </>
              )}
            </div>
            <div className="mt-4 text-center">
              <ButtonLink href="/dashboard" variant="ghost" size="sm">
                Maybe later
              </ButtonLink>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-semibold text-ink" : "text-ink-2"}>{label}</span>
      <span className={bold ? "font-mono font-semibold text-ink" : "font-mono text-ink-2"}>{value}</span>
    </div>
  );
}
