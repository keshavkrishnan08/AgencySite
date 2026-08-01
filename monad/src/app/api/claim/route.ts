import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { claimChartForUser } from '@/lib/charts';

export const runtime = 'nodejs';

/** Attaches the anonymous reading in the cookie to the now-signed-in user. */
export async function POST() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  await claimChartForUser(user.id, user.email ?? '');
  return NextResponse.json({ ok: true });
}
