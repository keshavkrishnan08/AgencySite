import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { claimChartForUser } from '@/lib/charts';

export const runtime = 'nodejs';

/**
 * OAuth and magic-link landing point. Exchanges the code for a session and
 * explicitly forwards the session cookies onto the redirect response — without
 * this, NextResponse.redirect() drops the cookies and the user is immediately
 * signed out on the next page load.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/chart';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin));
  }

  const cookieStore = await cookies();

  // Collect cookies that the auth exchange sets so we can forward them
  // onto the redirect response.
  const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          for (const cookie of list) {
            pendingCookies.push(cookie);
            try { cookieStore.set(cookie.name, cookie.value, cookie.options); } catch {}
          }
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', url.origin));
  }

  await claimChartForUser(data.user.id, data.user.email ?? '');

  // `next` is used as a path only — never trust it as a full URL, or this
  // becomes an open redirect.
  const dest = next.startsWith('/') ? next : '/chart';
  const response = NextResponse.redirect(new URL(dest, url.origin));

  // Forward every cookie the auth exchange set onto the redirect response.
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  }

  return response;
}
