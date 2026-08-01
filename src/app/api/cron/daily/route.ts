import { NextResponse } from 'next/server';
import { generateDailyBrief } from '@/lib/ai';
import { sendDailyBriefEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase/server';
import { transitBrief, transitReport } from '@/lib/astro/transits';
import type { Chart } from '@/lib/astro/reading';

export const runtime = 'nodejs';
export const maxDuration = 300;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

/** Generates and emails the daily briefing to every active subscriber. */
export async function GET(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const { data: subs } = await admin
    .from('profiles')
    .select('id, email, first_name, marketing_opt_in')
    .in('subscription_status', ['trialing', 'weekly', 'annual'])
    .limit(500);

  let generated = 0;
  let emailed = 0;
  let errors = 0;

  for (const s of subs ?? []) {
    try {
      const { data: existing } = await admin
        .from('daily_briefs')
        .select('id')
        .eq('user_id', s.id)
        .eq('brief_date', today)
        .maybeSingle();
      if (existing) continue;

      const { data: chartRow } = await admin
        .from('charts')
        .select('id, first_name, chart')
        .eq('user_id', s.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!chartRow) continue;

      const chart = chartRow.chart as Chart;
      const report = transitReport(chart, new Date());
      const brief = await generateDailyBrief(
        chart,
        chartRow.first_name,
        today,
        transitBrief(report),
      );

      await admin.from('daily_briefs').upsert(
        {
          user_id: s.id,
          chart_id: chartRow.id,
          brief_date: today,
          headline: brief.headline,
          body: brief.body,
          action: brief.action,
          transits: report,
        },
        { onConflict: 'user_id,brief_date' },
      );
      generated++;

      if (s.email && s.marketing_opt_in) {
        await sendDailyBriefEmail({
          to: s.email,
          firstName: s.first_name ?? chartRow.first_name,
          headline: brief.headline,
          body: brief.body,
          action: brief.action,
        });
        emailed++;
      }
    } catch (e) {
      errors++;
      console.error('[cron:daily] failed for', s.id, e);
    }
  }

  return NextResponse.json({ ok: true, generated, emailed, errors });
}
