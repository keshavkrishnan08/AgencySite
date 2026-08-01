import { NextResponse } from 'next/server';
import { guard } from '@/lib/ratelimit';
import { z } from 'zod';
import { generateOutlook, ProviderUnavailable } from '@/lib/ai';
import { getEntitlement } from '@/lib/entitlement';
import { getCurrentChart } from '@/lib/charts';
import { supabaseAdmin } from '@/lib/supabase/server';
import { transitBrief, transitReport } from '@/lib/astro/transits';

export const runtime = 'nodejs';
export const maxDuration = 180;

const Body = z.object({ period: z.enum(['week', 'month']) });

/** Start of the ISO week (Monday) or the calendar month, in UTC. */
function periodStart(period: 'week' | 'month', now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === 'month') return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

export async function POST(request: Request) {
  const ent = await getEntitlement();
  if (!ent.isPaid) return NextResponse.json({ error: 'Subscription required.' }, { status: 402 });

  const limited = guard(request, 'outlook', ent.userId, 'Too many outlook requests. Try again shortly.');
  if (limited) return limited;

  let period: 'week' | 'month';
  try {
    period = Body.parse(await request.json()).period;
  } catch {
    return NextResponse.json({ error: 'Pick a period.' }, { status: 400 });
  }

  const chart = await getCurrentChart(ent.userId!);
  if (!chart) return NextResponse.json({ error: 'No chart found.' }, { status: 404 });

  const now = new Date();
  const start = periodStart(period, now);
  const startIso = start.toISOString().slice(0, 10);
  const admin = supabaseAdmin();

  const { data: existing } = await admin
    .from('outlooks')
    .select('headline, summary, windows')
    .eq('user_id', ent.userId!)
    .eq('period', period)
    .eq('period_start', startIso)
    .maybeSingle();
  if (existing) return NextResponse.json(existing);

  try {
    // Sample the sky across the period so the windows are grounded in real
    // movement rather than a single snapshot of today.
    const span = period === 'week' ? 7 : 30;
    const step = period === 'week' ? 1 : 5;
    const samples: string[] = [];
    for (let d = 0; d < span; d += step) {
      const when = new Date(start.getTime() + d * 86_400_000);
      samples.push(transitBrief(transitReport(chart.chart, when)));
    }

    const label =
      period === 'week'
        ? `week beginning ${startIso}`
        : start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    const outlook = await generateOutlook(
      chart.chart, chart.first_name, period, label, samples.join('\n\n---\n\n'),
    );

    await admin.from('outlooks').upsert(
      {
        user_id: ent.userId!,
        chart_id: chart.id,
        period,
        period_start: startIso,
        headline: outlook.headline,
        summary: outlook.summary,
        windows: outlook.windows,
      },
      { onConflict: 'user_id,period,period_start' },
    );

    return NextResponse.json(outlook);
  } catch (e) {
    if (e instanceof ProviderUnavailable) {
      return NextResponse.json(
        { error: 'The reading service is not configured yet.' },
        { status: 503 },
      );
    }
    console.error('[outlook]', e);
    return NextResponse.json({ error: 'Generation failed.' }, { status: 500 });
  }
}
