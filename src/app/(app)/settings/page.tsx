import { SettingsPanel } from '@/components/SettingsPanel';
import { AnnualUpsell } from '@/components/app/AnnualUpsell';
import { redirect } from 'next/navigation';
import { getEntitlement } from '@/lib/entitlement';
import { resolveChart } from '@/lib/charts';
import { PRICING } from '@/lib/brand';

const PLAN_LABEL: Record<string, string> = {
  trialing: `Free trial (${PRICING.trialDays} days)`,
  weekly: `Weekly · ${PRICING.weekly.amount}`,
  annual: `Annual · ${PRICING.annual.amount}`,
  past_due: 'Payment failed',
  canceled: 'Cancelled',
  free: 'Free',
};

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const ent = await getEntitlement();
  // The one screen that genuinely needs an account: it shows billing.
  if (!ent.userId) redirect('/login?next=/settings');
  const chart = await resolveChart(ent.userId);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <p className="eyebrow">Settings</p>
        <h1 className="mt-3 font-serif text-[32px] font-normal sm:text-[40px]">Your account</h1>
      </header>

      <section className="card">
        <dl className="space-y-3 text-[15px]">
          <Row k="Email" v={ent.email ?? '—'} />
          <Row k="Plan" v={PLAN_LABEL[ent.status] ?? ent.status} />
          {ent.expiresAt && (
            <Row
              k={ent.status === 'trialing' ? 'Trial ends' : 'Renews'}
              v={new Date(ent.expiresAt).toLocaleDateString()}
            />
          )}
        </dl>
      </section>

      {/* Only for people already paying weekly — offering annual to a trialist
          is the trial-to-large-charge pattern we deliberately avoid. */}
      {ent.status === 'weekly' && (
        <AnnualUpsell
          weeklySpendPerYear={`$${Math.round(Number(PRICING.weekly.amount.slice(1)) * 52)}`}
        />
      )}

      {chart && (
        <section className="card">
          <p className="eyebrow">Birth data</p>
          <dl className="mt-4 space-y-3 text-[15px]">
            <Row k="Name" v={chart.first_name} />
            <Row
              k="Born"
              v={`${chart.birth_date}${chart.birth_time ? ` · ${chart.birth_time.slice(0, 5)}` : ' · time unknown'}`}
            />
            <Row k="Place" v={chart.birth_place} />
            <Row k="Timezone" v={chart.birth_tz} />
          </dl>
          <p className="mt-4 text-[13px] leading-relaxed text-ink/50">
            Your chart is computed from this and nothing else. If any of it is
            wrong, recalculate — your reading regenerates against the new chart.
          </p>
        </section>
      )}

      <SettingsPanel
        isPaid={ent.isPaid}
        status={ent.status}
        renewsAt={ent.status === 'trialing' ? ent.trialEndsAt : ent.expiresAt}
      />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 rule">
      <dt className="shrink-0 text-ink/50">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
