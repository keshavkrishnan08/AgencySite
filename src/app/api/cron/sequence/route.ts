import { NextResponse } from 'next/server';
import { sendSequenceEmail, type SequenceKind } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase/server';
import { provider } from '@/lib/ai/provider';
import type { Chart } from '@/lib/astro/reading';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Day offset → which email in the sequence is due. */
const SCHEDULE: { day: number; kind: SequenceKind }[] = [
  { day: 0, kind: 'day0' },
  { day: 1, kind: 'day1' },
  { day: 2, kind: 'day2' },
  { day: 3, kind: 'day3' },
  { day: 5, kind: 'day5' },
  { day: 7, kind: 'day7' },
];

/** Generate a cheap, chart-specific insight for the day1 "discovery" email. */
async function generateInsight(chart: Chart, firstName: string): Promise<string | undefined> {
  const p = provider();
  if (!p) return undefined;
  try {
    return await p.generate<string>({
      maxTokens: 300,
      effort: 'low',
      system: `You write one short, specific insight about this person's birth chart for an email. Two sentences maximum. Sound like an advisor who just noticed something in the data, not a mystic. Never predict events. Never use "energy", "vibration", "manifest", or "universe". Reference specific placements.`,
      user: `${firstName}'s chart: ${chart.sunSign} Sun, ${chart.moonSign} Moon, ${chart.risingSign ?? 'unknown'} Rising, Life Path ${chart.lifePath}, ${chart.chinese.label}. ${chart.archetype.name}: ${chart.archetype.oneLine}. Write one unusual insight about this combination.`,
    });
  } catch {
    return undefined;
  }
}

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

/**
 * Runs daily. Sends whichever sequence email is due for each free lead, once.
 * The unique constraint on (chart_id, kind) is what makes a double-run safe.
 */
export async function GET(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const now = Date.now();
  const results: Record<string, number> = {};
  let errors = 0;

  for (const { day, kind } of SCHEDULE) {
    // Charts created in the 24h window that lands them exactly `day` days ago.
    const windowEnd = new Date(now - day * 86_400_000);
    const windowStart = new Date(now - (day + 1) * 86_400_000);

    const { data: charts } = await admin
      .from('charts')
      .select('id, email, first_name, chart, user_id')
      .not('email', 'is', null)
      .gte('created_at', windowStart.toISOString())
      .lt('created_at', windowEnd.toISOString())
      .limit(200);

    if (!charts?.length) {
      results[kind] = 0;
      continue;
    }

    // Skip anyone who has since converted — nothing sours a new customer like
    // still being sold to.
    const userIds = charts.map((r) => r.user_id).filter(Boolean) as string[];
    const paid = new Set<string>();
    if (userIds.length) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, subscription_status')
        .in('id', userIds);
      for (const p of profiles ?? []) {
        if (['trialing', 'weekly', 'annual'].includes(p.subscription_status)) {
          paid.add(p.id);
        }
      }
    }

    let sent = 0;
    for (const r of charts) {
      if (r.user_id && paid.has(r.user_id)) continue;

      const { error: claim } = await admin
        .from('email_events')
        .insert({ chart_id: r.id, email: r.email!, kind });
      if (claim) continue; // already sent

      try {
        const insight = kind === 'day1'
          ? await generateInsight(r.chart as Chart, r.first_name)
          : undefined;

        await sendSequenceEmail(kind, {
          to: r.email!,
          firstName: r.first_name,
          chart: r.chart as Chart,
          chartId: r.id,
          uniqueInsight: insight,
        });
        sent++;
      } catch (e) {
        errors++;
        console.error(`[cron:sequence] ${kind} to ${r.email} failed`, e);
        // Release the claim so tomorrow's run retries it.
        await admin
          .from('email_events')
          .delete()
          .eq('chart_id', r.id)
          .eq('kind', kind);
      }
    }
    results[kind] = sent;
  }

  return NextResponse.json({ ok: true, sent: results, errors });
}
