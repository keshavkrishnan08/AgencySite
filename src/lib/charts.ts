import { cookies } from 'next/headers';
import type { Chart } from './astro/reading';
import { supabaseAdmin, supabaseServer } from './supabase/server';
import { recallChart } from './charts-ephemeral';

export const CHART_COOKIE = 'monad_chart';

export interface ChartRow {
  id: string;
  user_id: string | null;
  access_token: string;
  email: string | null;
  first_name: string;
  birth_date: string;
  birth_time: string | null;
  birth_time_known: boolean;
  birth_place: string;
  birth_tz: string;
  birth_utc: string;
  archetype: string;
  sun_sign: string;
  moon_sign: string;
  rising_sign: string | null;
  midheaven_sign: string | null;
  life_path: number;
  chinese_sign: string;
  chart: Chart;
  created_at: string;
}

/** Parses the anonymous chart cookie into its id and secret. */
export async function chartCookie(): Promise<{ id: string; token: string } | null> {
  const raw = (await cookies()).get(CHART_COOKIE)?.value;
  if (!raw) return null;
  // The value is percent-encoded on the way out in some runtimes, so the
  // separator can arrive as %3A. Decode before splitting or every lookup misses.
  const [id, token] = decodeURIComponent(raw).split(':');
  return id && token ? { id, token } : null;
}

/**
 * Fetch a chart the caller is entitled to see: either they own it, or they
 * hold the secret token issued when it was computed. A bare id is never enough.
 */
export async function getChart(id: string): Promise<ChartRow | null> {
  // A database blip must surface as "not found", never as a 500 — a stack
  // trace on the reading page is the worst possible moment to leak one.
  let data: ChartRow | null = null;
  try {
    const res = await supabaseAdmin()
      .from('charts')
      .select('*')
      .eq('id', id)
      .maybeSingle<ChartRow>();
    data = res.data;
  } catch {
    data = null;
  }

  // Not in the database: it may be an ephemeral row from a degraded write.
  if (!data) {
    const cookie = await chartCookie();
    return recallChart(id, cookie?.id === id ? cookie.token : undefined);
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && data.user_id === user.id) return data;

  const cookie = await chartCookie();
  if (cookie && cookie.id === data.id && cookie.token === data.access_token) return data;

  return null;
}

/** The chart a signed-in user should see: their most recent. */
export async function getCurrentChart(userId: string): Promise<ChartRow | null> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from('charts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<ChartRow>();
  if (data) return data;

  // Not claimed yet — adopt the one in the cookie.
  const cookie = await chartCookie();
  if (!cookie) return null;
  const { data: anon } = await admin
    .from('charts')
    .select('*')
    .eq('id', cookie.id)
    .eq('access_token', cookie.token)
    .maybeSingle<ChartRow>();
  if (!anon) return null;

  await admin.from('charts').update({ user_id: userId }).eq('id', anon.id);
  return { ...anon, user_id: userId };
}

/**
 * The chart to render in the app shell, for a signed-in user OR an anonymous
 * visitor holding the cookie issued when their chart was computed.
 *
 * The shell is deliberately reachable before signup: someone who has just given
 * their birth data should land in the product with the locked surfaces visible,
 * not on a login wall. Entitlement is still checked per feature.
 */
export async function resolveChart(userId: string | null): Promise<ChartRow | null> {
  if (userId) {
    const owned = await getCurrentChart(userId);
    if (owned) return owned;
  }

  const cookie = await chartCookie();
  if (!cookie) return null;
  return getChart(cookie.id);
}

/** Links the anonymous chart to a user on signup, backfilling their name. */
export async function claimChartForUser(userId: string, email: string) {
  const cookie = await chartCookie();
  if (!cookie) return;
  const admin = supabaseAdmin();

  const { data } = await admin
    .from('charts')
    .select('id, first_name, user_id, access_token')
    .eq('id', cookie.id)
    .maybeSingle();

  if (!data || data.access_token !== cookie.token || data.user_id) return;

  await admin.from('charts').update({ user_id: userId, email }).eq('id', cookie.id);
  await admin
    .from('profiles')
    .update({ first_name: data.first_name })
    .eq('id', userId)
    .is('first_name', null);
}
