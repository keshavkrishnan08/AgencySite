import { redirect } from 'next/navigation';
import { TimingView } from '@/components/app/TimingView';
import { getEntitlement } from '@/lib/entitlement';
import { resolveChart } from '@/lib/charts';
import { supabaseAdminOrNull } from '@/lib/supabase/server';
import { cached } from '@/lib/db';
import { INTENTS, bestDays, rankDays, worstDay, type Intent } from '@/lib/astro/bestday';
import { teaser } from '@/lib/sections';
import type { IntentResult } from '@/components/app/TimingView';
import type { OutlookWindow } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Timing' };

function startOf(period: 'week' | 'month', now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === 'month') {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
  }
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/**
 * The single timing surface.
 *
 * "Best Day" and "Weekly & Monthly Outlooks" used to be separate pages that
 * answered the same question with different resolutions, which meant whichever
 * one a user found first made the other look redundant. One page, two zoom
 * levels: pick a move and get dates, or read the shape of the week and month.
 */
export default async function TimingPage() {
  const ent = await getEntitlement();
  const chart = await resolveChart(ent.userId);
  if (!chart) redirect('/start');

  // The first window of each intent is the free sample. The rest — and the day
  // to avoid — are what the subscription buys, so the dates and the reasoning
  // never reach an unpaid browser: a CSS blur is a conversion device, not a
  // boundary, and the payload behind it was readable from view-source.
  const results = Object.fromEntries(
    INTENTS.map(({ id }) => {
      const scored = bestDays(chart.chart, id, 30);
      const best = rankDays(scored, 3).map((day, i) =>
        ent.isPaid || i === 0
          ? day
          : { ...day, date: '', headline: '', reasons: day.reasons.map((r) => teaser(r)) },
      );
      const worst = worstDay(scored);
      return [
        id,
        {
          best,
          worst:
            worst && !ent.isPaid
              ? { ...worst, date: '', reasons: worst.reasons.map((r) => teaser(r)) }
              : worst,
        } satisfies IntentResult,
      ];
    }),
  ) as Record<Intent, IntentResult>;

  // The written outlooks are an enhancement on top of the computed dates, so
  // their absence must not empty the page.
  const [week, month] = await Promise.all(
    (['week', 'month'] as const).map((p) =>
      cached<{ headline: string; summary: string; windows: unknown }>(() =>
        ent.userId
          ? supabaseAdminOrNull()
              ?.from('outlooks')
              .select('headline, summary, windows')
              .eq('user_id', ent.userId)
              .eq('period', p)
              .eq('period_start', startOf(p))
              .maybeSingle() ?? Promise.resolve({ data: null })
          : Promise.resolve({ data: null }),
      ),
    ),
  );

  const shape = (r: { data: { headline: string; summary: string; windows: unknown } | null }) =>
    r.data
      ? { headline: r.data.headline, summary: r.data.summary, windows: r.data.windows as OutlookWindow[] }
      : null;

  return (
    <TimingView
      firstName={chart.first_name}
      results={results}
      week={shape(week)}
      month={shape(month)}
    />
  );
}
