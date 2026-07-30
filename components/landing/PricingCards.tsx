"use client";

import { Check } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { StartFreeButton } from "@/components/ui/StartFreeButton";
import { PLANS, PLAN_ORDER, priceParts, type PlanKey } from "@/lib/pricing";
import { perDayLabel } from "@/lib/roi";

/* The good/better/best pricing ladder, rendered from lib/pricing.ts so the
   three cards can never disagree with the amounts. Quarterly is the visually
   promoted default; annual carries the best-value badge.

   `presale` swaps the CTA from the app's Start-free button to the email form,
   so the same cards serve both the marketing site and the ad landing page. */

const CARD_FEATURES = [
  "Unlimited scored mock interviews",
  "Your full metrics and projections",
  "Both prep builders",
];

export function PricingCards({ presale = false }: { presale?: boolean }) {
  return (
    <div className="mx-auto mt-16 grid max-w-5xl items-stretch gap-6 lg:grid-cols-3">
      {PLAN_ORDER.map((key, i) => (
        <Reveal key={key} delay={0.06 * i}>
          <PlanCard plan={key} presale={presale} />
        </Reveal>
      ))}
    </div>
  );
}

function PlanCard({ plan, presale }: { plan: PlanKey; presale: boolean }) {
  const p = PLANS[plan];
  const [dollars, cents] = priceParts(plan);
  const promoted = plan === "quarterly"; // the default we steer toward

  return (
    <div
      className="relative flex h-full flex-col rounded-2xl border-2 p-8"
      style={{
        borderColor: promoted ? "var(--primary)" : "var(--border)",
        background: "var(--surface)",
        boxShadow: promoted ? "0 20px 45px -20px rgba(20,128,142,0.45)" : "0 10px 30px -20px rgba(27,32,48,0.35)",
      }}
    >
      {p.badge && (
        <span
          className="absolute -top-3 left-8 rounded-full px-3 py-1 text-2xs font-bold uppercase tracking-wider text-white"
          style={{
            background: promoted
              ? "linear-gradient(135deg, var(--primary-bright), var(--primary-ink))"
              : "linear-gradient(135deg, var(--gold), var(--gold-ink))",
          }}
        >
          {p.badge}
        </span>
      )}

      <h3 className="font-serif text-xl font-semibold" style={{ color: promoted ? "var(--primary-ink)" : "var(--ink)" }}>
        {p.toggle}
      </h3>
      <p className="mt-1.5 min-h-[2.5rem] text-sm text-ink-2">{p.pitch}</p>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="font-serif text-2xl font-semibold text-ink-3">$</span>
        <span className="font-serif text-6xl font-semibold leading-none text-ink">{dollars}</span>
        {cents !== "00" && <span className="font-serif text-2xl font-semibold text-ink-3">.{cents}</span>}
      </div>
      <p className="mt-2 text-sm text-ink-3">{p.cadence.split(" · ")[0]}</p>
      <p className="mt-1 text-sm font-semibold text-sage-ink">
        {perDayLabel(plan)} a day · {p.perMonth}
      </p>
      {p.saveAmount && p.savePct > 0 && (
        <p className="mt-1 text-xs font-medium text-gold-ink">Save {p.saveAmount} vs monthly ({p.savePct}% off)</p>
      )}

      <ul className="mt-6 space-y-2.5 border-t pt-6" style={{ borderColor: "var(--border)" }}>
        {CARD_FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-ink-2">
            <Check size={16} className="mt-0.5 shrink-0 text-primary" />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-auto !mt-7">
        <StartFreeButton
          variant={promoted ? "primary" : "secondary"}
          size="md"
          className="w-full"
          source={`pricing_${plan}`}
          showArrow={false}
          label="Practice free"
          signedInLabel="Practice free"
        />
      </div>
    </div>
  );
}
