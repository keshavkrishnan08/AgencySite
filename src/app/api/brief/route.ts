import { NextResponse } from 'next/server';
import { guard } from '@/lib/ratelimit';
import { generateDailyBrief } from '@/lib/ai';
import { getEntitlement } from '@/lib/entitlement';
import { getCurrentChart } from '@/lib/charts';
import { supabaseAdmin } from '@/lib/supabase/server';
import { transitBrief, transitReport } from '@/lib/astro/transits';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  const ent = await getEntitlement();
  if (!ent.isPaid) return NextResponse.json({ error: 'Subscription required.' }, { status: 402 });

  const limited = guard(request, 'brief', ent.userId, 'Too many briefing requests. Try again in a little while.');
  if (limited) return limited;

  const chart = await getCurrentChart(ent.userId!);
  if (!chart) return NextResponse.json({ error: 'No chart found.' }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);
  const admin = supabaseAdmin();

  const { data: existing } = await admin
    .from('daily_briefs')
    .select('headline, body, action')
    .eq('user_id', ent.userId!)
    .eq('brief_date', today)
    .maybeSingle();
  if (existing) return NextResponse.json(existing);

  try {
    const report = transitReport(chart.chart, new Date());
    const brief = await generateDailyBrief(chart.chart, chart.first_name, today, transitBrief(report));

    await admin.from('daily_briefs').upsert(
      {
        user_id: ent.userId!,
        chart_id: chart.id,
        brief_date: today,
        headline: brief.headline,
        body: brief.body,
        action: brief.action,
        transits: report,
      },
      { onConflict: 'user_id,brief_date' },
    );
    return NextResponse.json(brief);
  } catch (e) {
    console.error('[brief]', e);
    return NextResponse.json({ error: 'Generation failed.' }, { status: 500 });
  }
}
