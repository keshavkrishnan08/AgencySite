import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/** Request-scoped client that reads and refreshes the user's auth cookies. */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Middleware handles the refresh, so this is safe to swallow.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. Bypasses RLS entirely — only ever construct this inside
 * a server route that has already established who the caller is.
 */
export function supabaseAdmin() {
  const client = supabaseAdminOrNull();
  if (!client) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return client;
}

/**
 * The same client, returning null instead of throwing when unconfigured.
 *
 * Read paths use this. A page that renders a *cached* row must not 500 the
 * whole screen because the cache is unreachable — it should render without the
 * cached part. Writes keep using `supabaseAdmin()`, where failing loudly is
 * correct.
 */
export function supabaseAdminOrNull() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
