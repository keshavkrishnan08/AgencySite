import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { claimChartForUser } from '@/lib/charts';

export const runtime = 'nodejs';

/** OAuth and email-confirmation landing point. Exchanges the code for a session. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/chart';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin));
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', url.origin));
  }

  await claimChartForUser(data.user.id, data.user.email ?? '');

  // `next` is used as a path only — never trust it as a full URL, or this
  // becomes an open redirect.
  const dest = next.startsWith('/') ? next : '/chart';
  return NextResponse.redirect(new URL(dest, url.origin));
}
