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

const INCLUDED = [
  "Unlimited practice sessions",
  "Full 5-dimension scoring & detailed feedback",
  "Progress dashboard with charts and trends",
  "Gap Story Builder. Unlimited revisions",
  "Company Research Briefing",
  "Question Predictor",
  "Anxiety Detector with trend tracking",
  "Interview Day pressure simulation",
  "Salary Negotiation practice",
  "Post-Interview Debrief & scoring",
  "Example great answers for every question",
  "Weekly progress reports by email",
];

export default function UpgradePage() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "processing" | "done">("idle");
  const [interval, setIntervalPlan] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    track("upgrade_view");
  }, []);

  const subscribe = async () => {
    setState("processing");
    track("upgrade_click", { interval });
    // Try real Stripe Checkout first; fall back to demo if not configured.
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: interval, email: getProfile().email || undefined }),
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
      track("upgrade_success", { interval, mode: "demo" });
      setState("done");
      setTimeout(() => router.push("/dashboard"), 1700);
    }, 1100);
  };

  const price = interval === "annual" ? "$79" : "$9.99";
  const cadence = interval === "annual" ? "per year" : "per month";
  const sub = interval === "annual" ? "Just $6.58/mo, billed yearly. Save 34%" : "Billed monthly · cancel anytime";

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
            Less than a coffee a day. One better answer could be worth the job itself.
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
            <div className="mt-7 rounded-xl bg-bg-sunk p-5">
              <p className="text-[0.95rem] italic leading-relaxed text-ink-2">
                &ldquo;I practiced my gap answer nine times. On the tenth it sounded like I&apos;d been saying it
                my whole life. I got the job.&rdquo;
              </p>
              <p className="mt-2 text-sm font-semibold text-primary-ink">Rachel, returning to work after 4 years</p>
            </div>
          </div>

          {/* Order summary */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border-2 p-7 shadow-lg" style={{ borderColor: "var(--primary)", background: "var(--surface)" }}>
              {state === "done" ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage-soft text-sage-ink">
                    <PartyPopper size={30} />
                  </span>
                  <h3 className="mt-5 font-serif text-2xl font-semibold text-ink">You&apos;re Premium! 🎉</h3>
                  <p className="mt-2 text-ink-2">Every tool is unlocked. Taking you to your dashboard…</p>
                </motion.div>
              ) : (
                <>
                  {/* billing interval toggle */}
                  <div className="mb-5 flex rounded-full bg-bg-tint p-1">
                    {(["monthly", "annual"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setIntervalPlan(opt)}
                        className={`flex-1 rounded-full px-4 py-2 text-sm font-medium capitalize transition-all ${
                          interval === opt ? "bg-white text-ink shadow-xs" : "text-ink-2 hover:text-ink"
                        }`}
                      >
                        {opt}
                        {opt === "annual" && <span className="ml-1.5 text-2xs font-bold text-sage-ink">−34%</span>}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-baseline justify-between">
                    <h2 className="font-serif text-xl font-semibold text-ink">Axon Careers Premium</h2>
                    <span className="font-serif text-3xl font-semibold" style={{ color: "var(--primary-ink)" }}>
                      {price}
                    </span>
                  </div>
                  <p className="text-sm text-ink-3">{cadence} · {sub}</p>

                  <div className="my-6 hairline" />

                  <div className="space-y-2 text-sm">
                    <Row label="7-day free trial" value="$0.00" />
                    <Row label={interval === "annual" ? "Then per year" : "Then per month"} value={price} />
                    <Row label="Due today" value="$0.00" bold />
                  </div>

                  <Button onClick={subscribe} disabled={state === "processing"} size="lg" className="mt-6 w-full">
                    {state === "processing" ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Processing…
                      </>
                    ) : (
                      <>
                        <Lock size={16} /> Start 7-day free trial
                      </>
                    )}
                  </Button>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-3">
                    <ShieldCheck size={13} /> Secure checkout · powered by Stripe · cancel anytime
                  </p>
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
