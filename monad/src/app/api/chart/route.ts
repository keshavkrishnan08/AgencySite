import { NextResponse } from 'next/server';
import { guard } from '@/lib/ratelimit';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { buildChart } from '@/lib/astro/reading';
import { isKnownTimeZone, localToUtc } from '@/lib/astro/geo';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';
import { CHART_COOKIE } from '@/lib/charts';
import { rememberChart } from '@/lib/charts-ephemeral';

export const runtime = 'nodejs';

const Body = z.object({
  firstName: z.string().trim().min(1).max(40),
  email: z.email(),
  year: z.number().int().min(1920).max(2026),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  timeKnown: z.boolean(),
  place: z.object({
    label: z.string().min(1),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    timezone: z.string().min(1),
  }),
  utm: z.record(z.string(), z.string()).nullable().optional(),
});

/**
 * The public entry point for the whole funnel.
 *
 * Wrapped so that ANY unexpected throw — a missing service-role key, a DB
 * outage — still comes back as JSON. An unhandled throw returns Next's HTML
 * error page, and the browser's `res.json()` then fails with an internal
 * message ("The string did not match the expected pattern"), which is both
 * useless to the user and impossible to diagnose from a support email.
 */
export async function POST(request: Request) {
  try {
    return await handle(request);
  } catch (e) {
    console.error('[chart] unhandled', e);
    return NextResponse.json(
      { error: 'We could not build your chart just now. Please try again.' },
      { status: 500 },
    );
  }
}

async function handle(request: Request) {
  const limited = guard(request, 'chart', null, 'Too many charts from this connection. Try again shortly.');
  if (limited) return limited;

  let p: z.infer<typeof Body>;
  try {
    p = Body.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Please check your birth details.' }, { status: 400 });
  }

  if (!isKnownTimeZone(p.place.timezone)) {
    return NextResponse.json({ error: 'Unrecognised timezone for that place.' }, { status: 400 });
  }

  // Reject impossible calendar dates (31 February) rather than letting JS roll over.
  const daysInMonth = new Date(Date.UTC(p.year, p.month, 0)).getUTCDate();
  if (p.day > daysInMonth) {
    return NextResponse.json({ error: 'That date does not exist.' }, { status: 400 });
  }

  // No birth time: noon local keeps the day boundary stable and minimises Moon error.
  const hour = p.timeKnown && p.hour !== null ? p.hour : 12;
  const minute = p.timeKnown && p.minute !== null ? p.minute : 0;

  const birthUtc = localToUtc(p.place.timezone, p.year, p.month, p.day, hour, minute);
  if (Number.isNaN(birthUtc.getTime())) {
    return NextResponse.json({ error: 'Invalid date.' }, { status: 400 });
  }
  if (birthUtc.getTime() > Date.now()) {
    return NextResponse.json({ error: 'That birth date is in the future.' }, { status: 400 });
  }

  const chart = buildChart({
    birthUtc,
    localYear: p.year,
    localMonth: p.month,
    localDay: p.day,
    lat: p.place.lat,
    lon: p.place.lon,
    timeKnown: p.timeKnown,
  });

  // Auth is optional here — an anonymous visitor is the common case.
  let userId: string | null = null;
  try {
    const supabase = await supabaseServer();
    userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  } catch {
    userId = null;
  }

  const record = {
      user_id: userId,
      email: p.email.toLowerCase(),
      first_name: p.firstName,
      birth_date: `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`,
      birth_time: p.timeKnown ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00` : null,
      birth_time_known: p.timeKnown,
      birth_place: p.place.label,
      birth_lat: p.place.lat,
      birth_lon: p.place.lon,
      birth_tz: p.place.timezone,
      birth_utc: birthUtc.toISOString(),
      archetype: chart.archetype.name,
      sun_sign: chart.sunSign,
      moon_sign: chart.moonSign,
      rising_sign: chart.risingSign,
      midheaven_sign: chart.midheavenSign,
      life_path: chart.lifePath,
      chinese_sign: chart.chinese.label,
      chart,
      utm: p.utm ?? null,
  };

  // The chart is already computed and correct at this point — it is pure
  // astronomy and owes the database nothing. If persistence fails we keep it in
  // process rather than throwing away the visitor at the moment of highest
  // intent; the row is ephemeral and the caller is told so.
  let row: { id: string; access_token: string } | null = null;
  let persisted = true;

  try {
    // supabaseAdmin() itself throws when the service-role key is absent, so it
    // has to be constructed inside the guard, not above it.
    const res = await supabaseAdmin()
      .from('charts')
      .insert(record)
      .select('id, access_token')
      .single();
    if (res.error || !res.data) throw res.error ?? new Error('no row returned');
    row = res.data;
  } catch (e) {
    console.error('[chart] persist failed, falling back to ephemeral store', e);
    persisted = false;
    row = rememberChart({ ...record, chart });
  }

  // Lets an anonymous visitor reopen their own reading without an account.
  const jar = await cookies();
  jar.set(CHART_COOKIE, `${row.id}:${row.access_token}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });

  return NextResponse.json({
    id: row.id,
    archetype: chart.archetype.name,
    sunSign: chart.sunSign,
    persisted,
  });
}
