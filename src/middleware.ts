import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session on every request and gates the paid routes
 * behind authentication. Payment status is *not* checked here — that needs a
 * database read, so it lives in the (paid) layout where it happens once.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // This call refreshes the session if the access token has expired.
  // The refreshed tokens are written to `response` via setAll above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // Authentication only. Entitlement is checked per feature inside the app,
  // because the locked surfaces are what sell the subscription.
  // Only the account screen truly needs an account. The rest of the shell is
  // reachable with a chart cookie alone and gates its paid parts inline.
  const PRIVATE = ['/settings'];
  if (!user && PRIVATE.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    const redirect = NextResponse.redirect(url);
    // Forward any refreshed session cookies onto the redirect.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/chart';
    url.search = '';
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image files.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
