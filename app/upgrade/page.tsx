"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Lock, ShieldCheck, Loader2, PartyPopper, Star } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { getOnboarding, getProfile } from "@/lib/store";
import { track } from "@/lib/analytics";
import { PLANS, PLAN_ORDER, type PlanKey } from "@/lib/pricing";

const INCLUDED = [
  "Unlimited AI-scored mock interviews",
  "Feedback on all five dimensions, every answer",
  "The Anxiety Detector on every session",
  "Your readiness metrics + time to top 1%",
  "Question Predictor, Gap Story & Job Breakdown",
  "Speak your answers, with delivery coaching",
];

export default function UpgradePage() {
  const [state, setState] = useState<"idle" | "processing" | "done">("idle");
  const [plan, setPlan] = useState<PlanKey>("quarterly");
  const [pitch, setPitch] = useState<string>("");
  const p = PLANS[plan];

  useEffect(() => {
    track("upgrade_view");
    const ob = getOnboarding();
    const t = ob?.timeline;
    if (t === "this_week" || t === "two_weeks") {
      setPlan("quarterly");
      setPitch(t === "this_week"
        ? "Your interview is this week. Three months of unlimited practice covers it and the rest of your search."
        : "Your interview is days away. Three months covers this one and whatever comes next.");
    } else if (t === "none") {
      setPitch("No interview booked yet? That's the time to get ahead, most searches run about three months.");
    } else if (ob?.targetRole) {
      setPitch(`Everything you need to walk into your ${ob.targetRole} interview ready.`);
    }
  }, []);

  const [err, setErr] = useState("");
  const subscribe = async () => {
    setState("processing");
    setErr("");
    track("upgrade_click", { plan });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: getProfile().email || undefined }),
      });
      const data = await res.json();
      if (data?.url) { window.location.href = data.url; return; }
      throw new Error(data?.error || "Checkout unavailable");
    } catch {
      // No bypass: access is only ever granted by a real, completed payment
      // (confirmed server-side by the Stripe webhook). On failure, stop and retry.
      track("form:error", { form: "checkout", reason: "no_session" });
      setErr("We couldn't start secure checkout. Please try again in a moment.");
      setState("idle");
    }
  };

  return (
    <AppShell bare requirePremium={false}>
      <main className="min-h-screen bg-surface lg:grid lg:grid-cols-2">
        {/* LEFT, the pitch, on a calm tinted panel */}
        <aside className="relative hidden flex-col justify-between overflow-hidden px-12 py-14 lg:flex xl:px-16"
          style={{ background: "linear-gradient(165deg, #19a9b8 0%, #14808e 55%, #0c5660 130%)" }}>
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, #ffffff66, transparent)" }} />
          <Logo href="/dashboard" size={30} className="text-white [&_*]:text-white" />
          <div className="relative">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} className="fill-white text-white" />)}
              <span className="ml-2 text-sm text-white/85">Loved by 12,000+ job seekers</span>
            </div>
            <h2 className="mt-5 max-w-sm font-serif text-[2.4rem] font-semibold leading-tight text-white">
              Walk in ready.
            </h2>
            <p className="mt-3 max-w-sm text-white/85">{pitch || "Unlimited practice, scored, until the interview feels easy."}</p>
            <ul className="mt-8 space-y-3">
              {INCLUDED.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[0.95rem] text-white/90">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15"><Check size={12} className="text-white" /></span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative flex items-center gap-2 text-sm text-white/70"><ShieldCheck size={15} /> Private by design · cancel anytime</p>
        </aside>

        {/* RIGHT, the checkout card */}
        <div className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
          {state === "done" ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage-soft text-sage-ink"><PartyPopper size={30} /></span>
              <h3 className="mt-5 font-serif text-2xl font-semibold text-ink">You&apos;re in.</h3>
              <p className="mt-2 text-ink-2">Everything&apos;s unlocked. Taking you to your dashboard…</p>
            </motion.div>
          ) : (
            <div className="w-full max-w-md">
              <div className="lg:hidden"><Logo size={28} /></div>
              <h1 className="mt-6 font-serif text-3xl font-semibold text-ink lg:mt-0">Choose your plan</h1>
              <p className="mt-1.5 text-ink-2">Unlimited practice. Cancel anytime.</p>

              {/* plan options, stacked, selectable rows (Stripe-style) */}
              <div className="mt-7 space-y-2.5">
                {PLAN_ORDER.map((key) => {
                  const pl = PLANS[key];
                  const on = plan === key;
                  return (
                    <button
                      key={key}
                      onClick={() => { setPlan(key); track("ui:click", { label: "plan_select", plan: key }); }}
                      className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all"
                      style={{
                        borderColor: on ? "var(--primary)" : "var(--border-strong)",
                        background: on ? "var(--primary-soft)" : "var(--surface)",
                        boxShadow: on ? "0 0 0 1px var(--primary)" : "none",
                      }}
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2" style={{ borderColor: on ? "var(--primary)" : "var(--border-strong)" }}>
                        {on && <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--primary)" }} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{pl.toggle}</span>
                          {pl.savePct > 0 && <span className="rounded-full bg-sage-soft px-2 py-0.5 text-2xs font-bold text-sage-ink">Save {pl.savePct}%</span>}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-3">{pl.perMonth}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="font-serif text-lg font-semibold text-ink">{pl.price}</span>
                        {pl.was && <span className="block text-2xs text-ink-3 line-through">{pl.was}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* summary */}
              <div className="mt-6 space-y-2 border-t pt-5 text-sm" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between"><span className="text-ink-2">Premium · {p.toggle}</span><span className="font-mono text-ink">{p.was ?? p.price}</span></div>
                {p.saveAmount && <div className="flex items-center justify-between text-sage-ink"><span>You save {p.savePct}%</span><span className="font-mono">−{p.saveAmount}</span></div>}
                <div className="flex items-center justify-between border-t pt-2 font-semibold" style={{ borderColor: "var(--border)" }}><span className="text-ink">Due today</span><span className="font-mono text-ink">{p.price}</span></div>
              </div>

              <Button onClick={subscribe} disabled={state === "processing"} size="lg" className="mt-6 w-full">
                {state === "processing" ? <><Loader2 size={18} className="animate-spin" /> Redirecting to secure checkout…</> : <>Start free trial · then {p.price}</>}
              </Button>
              {err && <p className="mt-3 text-center text-sm text-coral-ink">{err}</p>}
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-3"><ShieldCheck size={13} /> Secure checkout, powered by Stripe · cancel anytime</p>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
