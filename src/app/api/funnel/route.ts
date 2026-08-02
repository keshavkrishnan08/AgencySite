import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const pw = new URL(request.url).searchParams.get('pw');
  if (pw !== '123456') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = supabaseAdmin();

  // All queries in parallel
  const [
    { count: totalCharts },
    { count: chartsToday },
    { count: chartsWithEmail },
    { count: chartsWithUser },
    { count: totalUsers },
    { count: usersToday },
    { count: totalReadings },
    { count: paidTrialing },
    { count: paidWeekly },
    { count: paidAnnual },
    { count: canceled },
    { count: totalBriefs },
    { count: totalChats },
    { count: totalDecisions },
    { data: recentCharts },
    { data: dailyFunnel },
  ] = await Promise.all([
    admin.from('charts').select('*', { count: 'exact', head: true }),
    admin.from('charts').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().slice(0, 10)),
    admin.from('charts').select('*', { count: 'exact', head: true }).not('email', 'is', null),
    admin.from('charts').select('*', { count: 'exact', head: true }).not('user_id', 'is', null),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().slice(0, 10)),
    admin.from('readings').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trialing'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'weekly'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'annual'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'canceled'),
    admin.from('daily_briefs').select('*', { count: 'exact', head: true }),
    admin.from('chat_messages').select('*', { count: 'exact', head: true }),
    admin.from('decisions').select('*', { count: 'exact', head: true }),
    admin.from('charts').select('first_name, email, archetype, sun_sign, created_at').order('created_at', { ascending: false }).limit(15),
    admin.from('charts').select('created_at, email, user_id').order('created_at', { ascending: false }).limit(200),
  ]);

  // Compute daily funnel from recent charts
  const days: Record<string, { charts: number; withEmail: number; claimed: number }> = {};
  for (const c of dailyFunnel ?? []) {
    const day = (c.created_at as string).slice(0, 10);
    days[day] ??= { charts: 0, withEmail: 0, claimed: 0 };
    days[day].charts++;
    if (c.email) days[day].withEmail++;
    if (c.user_id) days[day].claimed++;
  }

  return NextResponse.json({
    funnel: {
      charts_total: totalCharts ?? 0,
      charts_today: chartsToday ?? 0,
      charts_with_email: chartsWithEmail ?? 0,
      charts_claimed_by_user: chartsWithUser ?? 0,
      readings_generated: totalReadings ?? 0,
      accounts_created: totalUsers ?? 0,
      accounts_today: usersToday ?? 0,
      paid_trialing: paidTrialing ?? 0,
      paid_weekly: paidWeekly ?? 0,
      paid_annual: paidAnnual ?? 0,
      canceled: canceled ?? 0,
    },
    engagement: {
      daily_briefs: totalBriefs ?? 0,
      chat_messages: totalChats ?? 0,
      decisions_logged: totalDecisions ?? 0,
    },
    recent: recentCharts ?? [],
    daily: Object.entries(days).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14),
  });
}
