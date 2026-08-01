import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app/AppShell';
import { getEntitlement } from '@/lib/entitlement';
import { resolveChart } from '@/lib/charts';
import { supabaseAdminOrNull } from '@/lib/supabase/server';
import { cached } from '@/lib/db';
import { describeHit, transitReport } from '@/lib/astro/transits';

export const dynamic = 'force-dynamic';

/**
 * Chart gate, not an auth gate.
 *
 * You need a chart to be here; you do not need an account. Payment is enforced
 * per feature inside the shell, because the locked surfaces *are* the upsell —
 * redirecting an unpaid visitor away removes the only place they can see what
 * they would be buying.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ent = await getEntitlement();

  // No auth gate. A visitor who has just computed a chart lands here holding
  // only the chart cookie; sending them to /login at that moment is the single
  // most expensive redirect in the funnel. Every paid feature inside still
  // checks entitlement for itself.
  const chart = await resolveChart(ent.userId);
  if (!chart) redirect('/start');

  const firstName = chart.first_name || ent.firstName || ent.email?.split('@')[0] || 'you';
  const today = new Date().toISOString().slice(0, 10);

  // Anonymous visitors have no briefing row yet, and the store may be
  // unreachable. Neither is a reason to fail the whole shell.
  const { data: brief } = ent.userId
    ? await cached<{ headline: string; body: string }>(() =>
        supabaseAdminOrNull()
          ?.from('daily_briefs')
          .select('headline, body')
          .eq('user_id', ent.userId!)
          .eq('brief_date', today)
          .maybeSingle() ?? Promise.resolve({ data: null }),
      )
    : { data: null };

  const report = transitReport(chart.chart, new Date());

  // The pinned card shows the real briefing once one exists; before that it
  // shows a true statement about today's sky rather than invented copy.
  const teaser =
    (brief?.body as string | undefined) ??
    (brief?.headline as string | undefined) ??
    `The Moon is ${report.moonPhase.toLowerCase()} in ${report.moonSign} and ${
      report.hits.length
        ? describeHit(report.hits[0])
        : 'nothing is making an exact contact to your chart'
    }. What that means for the call you have been putting off is`;

  return (
    <AppShell
      firstName={firstName}
      isPaid={ent.isPaid}
      briefingTeaser={teaser}
      chartId={chart.id}
      suggestions={[
        'Is my current business actually a fit for my chart?',
        'What should I focus on today, given my timing?',
        'What does my chart say about taking on a co-founder?',
      ]}
      transitPrompt={`The Moon is in ${report.moonSign} today. Ask what that makes today good for.`}
    >
      {children}
    </AppShell>
  );
}
