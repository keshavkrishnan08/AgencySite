import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Server-side Supabase admin client (service role), used by the Stripe webhook
   to record subscriptions and by subscription lookups. Env-gated: when keys are
   absent, supabaseAdmin() returns null and callers fall back to the demo path.
   Run supabase/schema.sql first. */

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let client: SupabaseClient | null = null;
export function supabaseAdmin(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false } }
    );
  }
  return client;
}

/** Look up whether an email currently has an active paid subscription. */
export async function isEmailPremium(email: string): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db || !email) return false;
  const { data } = await db
    .from("subscriptions")
    .select("status")
    .eq("email", email)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  return Boolean(data);
}
