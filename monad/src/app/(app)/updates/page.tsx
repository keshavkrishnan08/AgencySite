import { redirect } from 'next/navigation';
import { GenerateOnMount } from '@/components/GenerateOnMount';
import {
  UpdatesView,
  type Cadence,
  type DecisionRow,
  type Entry,
} from '@/components/app/UpdatesView';
import { getEntitlement } from '@/lib/entitlement';
import { resolveChart } from '@/lib/charts';
import { supabaseAdminOrNull } from '@/lib/supabase/server';
import { describeHit, transitReport } from '@/lib/astro/transits';
import { fallbackBrief } from '@/lib/ai/fallback';
import { cached } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Updates' };

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const shift = (day: string, days: number) =>
  iso(new Date(new Date(`${day}T12:00:00Z`).getTime() + days * DAY));

function parseCadence(v: string | undefined): Cadence {
  return v === 'weekly' || v === 'monthly' ? v : 'daily';
}

/** Consecutive days ending today (or yesterday) that have a logged decision. */
function streakFrom(days: string[]): number {
  const set = new Set(days);
  const today = iso(new Date());
  let cursor = set.has(today) ? today : shift(today, -1);
  if (!set.has(cursor)) return 0;

  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = shift(cursor, -1);
  }
  return n;
}

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; cadence?: string }>;
}) {
  const params = await searchParams;
  const cadence = parseCadence(params.cadence);

  const ent = await getEntitlement();
  const chart = await resolveChart(ent.userId);
  if (!chart) redirect('/start');

  // Anonymous visitors reach this screen holding only a chart cookie: there is
  // no user id to key briefings or journal entries by, and the store may not be
  // configured at all. Both are empty states, not errors.
  const admin = supabaseAdminOrNull();
  const userId = ent.userId;
  const today = iso(new Date());

  // A hand-edited ?date= must not become a way to read someone else's rows or
  // to crash the page — validate the shape and clamp to today.
  const requested = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '') ? params.date! : today;
  const date = requested > today ? today : requested;

  let entry: Entry | null = null;
  let prevDate: string | null = null;
  let nextDate: string | null = null;

  if (cadence === 'daily') {
    const { data } = await cached<{ brief_date: string; headline: string; body: string; action: string | null }>(
      () =>
        userId
          ? admin
              ?.from('daily_briefs')
              .select('brief_date, headline, body, action')
              .eq('user_id', userId)
              .eq('brief_date', date)
              .maybeSingle() ?? Promise.resolve({ data: null })
          : Promise.resolve({ data: null }),
    );

    // Nothing for today yet: generate it inline rather than showing an
    // empty screen on the one route people open every morning.
    if (!data && date === today && userId) {
      return (
        <GenerateOnMount
          endpoint="/api/brief"
          title="Reading today&rsquo;s sky"
          stages={['Computing positions', 'Finding contacts to your chart', 'Writing your briefing']}
        />
      );
    }

    if (data) {
      entry = {
        date: data.brief_date as string,
        headline: data.headline as string,
        body: data.body as string,
        action: (data.action as string | null) ?? null,
      };
    } else if (date === today) {
      // No stored briefing and no account: this is the highest-intent screen a
      // free visitor sees, so it must show a REAL briefing computed from their
      // own chart with the move locked — not a dead "not written yet" card.
      const report = transitReport(chart.chart, new Date());
      const preview = fallbackBrief(
        chart.chart,
        report.moonSign,
        report.hits.length ? describeHit(report.hits[0]) : null,
      );
      entry = { date: today, ...preview };
    }

    const [{ data: older }, { data: newer }] = await Promise.all([
      cached<{ brief_date: string }>(() =>
        userId
          ? admin?.from('daily_briefs').select('brief_date')
              .eq('user_id', userId).lt('brief_date', date)
              .order('brief_date', { ascending: false }).limit(1).maybeSingle()
            ?? Promise.resolve({ data: null })
          : Promise.resolve({ data: null })),
      cached<{ brief_date: string }>(() =>
        userId
          ? admin?.from('daily_briefs').select('brief_date')
              .eq('user_id', userId).gt('brief_date', date)
              .order('brief_date', { ascending: true }).limit(1).maybeSingle()
            ?? Promise.resolve({ data: null })
          : Promise.resolve({ data: null })),
    ]);
    prevDate = (older?.brief_date as string | undefined) ?? null;
    nextDate = (newer?.brief_date as string | undefined) ?? null;
  } else {
    const period = cadence === 'weekly' ? 'week' : 'month';
    const { data } = await cached<{ period_start: string; headline: string; summary: string; windows: unknown }>(
      () =>
        userId
          ? admin
              ?.from('outlooks')
              .select('period_start, headline, summary, windows')
              .eq('user_id', userId)
              .eq('period', period)
              .order('period_start', { ascending: false })
              .limit(1)
              .maybeSingle() ?? Promise.resolve({ data: null })
          : Promise.resolve({ data: null }),
    );

    if (data) {
      const windows = (data.windows ?? []) as { label?: string; guidance?: string }[];
      entry = {
        date: data.period_start as string,
        headline: data.headline as string,
        body: data.summary as string,
        action: windows.length
          ? windows.map((w) => `${w.label ?? 'Window'}: ${w.guidance ?? ''}`.trim()).join('\n')
          : null,
      };
    }
  }

  const [{ data: decisions }, { data: allDays }, { data: profile }] = await Promise.all([
    cached<DecisionRow[]>(() =>
      userId
        ? admin?.from('decisions').select('id, decided_on, body')
            .eq('user_id', userId).order('decided_on', { ascending: false }).limit(12)
          ?? Promise.resolve({ data: null })
        : Promise.resolve({ data: null })),
    cached<{ decided_on: string }[]>(() =>
      userId
        ? admin?.from('decisions').select('decided_on').eq('user_id', userId)
          ?? Promise.resolve({ data: null })
        : Promise.resolve({ data: null })),
    cached<{ daily_email_opt_in: boolean }>(() =>
      userId
        ? admin?.from('profiles').select('daily_email_opt_in').eq('id', userId).maybeSingle()
          ?? Promise.resolve({ data: null })
        : Promise.resolve({ data: null })),
  ]);

  const days = (allDays ?? []).map((d) => d.decided_on);

  return (
    <UpdatesView
      firstName={chart.first_name}
      archetype={chart.chart.archetype.name}
      cadence={cadence}
      entry={entry}
      prevDate={prevDate}
      nextDate={nextDate}
      emailOptIn={Boolean(profile?.daily_email_opt_in)}
      decisions={(decisions ?? []) as DecisionRow[]}
      streak={streakFrom(days)}
      logged={days.length}
    />
  );
}
