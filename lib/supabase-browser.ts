"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Browser Supabase client (publishable/anon key) for real auth. Env-gated:
   until NEXT_PUBLIC_SUPABASE_ANON_KEY is set, this returns null and the app
   falls back to the local demo profile, so nothing breaks before go-live. */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function authConfigured(): boolean {
  return Boolean(URL && ANON);
}

let client: SupabaseClient | null = null;
export function supabaseBrowser(): SupabaseClient | null {
  if (!authConfigured()) return null;
  if (!client) {
    client = createClient(URL as string, ANON as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
