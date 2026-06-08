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

export interface SubStatus {
  premium: boolean;
  status: string; // active | trialing | canceled | past_due | none ...
  until: string | null; // current_period_end ISO
}

/* Authoritative access for an account, straight from the subscription row.
   Access if the sub is active/trialing OR still inside the paid period (so a
   canceled-at-period-end user keeps access until their time runs out, then is
   kicked). status "none" means no subscription row exists at all. */
export async function subscriptionStatus(email: string): Promise<SubStatus> {
  const db = supabaseAdmin();
  if (!db || !email) return { premium: false, status: "none", until: null };
  const { data } = await db
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("email", email)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { premium: false, status: "none", until: null };
  const active = data.status === "active" || data.status === "trialing";
  const withinPeriod = data.current_period_end ? new Date(data.current_period_end) > new Date() : false;
  return { premium: active || withinPeriod, status: data.status, until: data.current_period_end ?? null };
}

/** Back-compat: boolean access for an email. */
export async function isEmailPremium(email: string): Promise<boolean> {
  return (await subscriptionStatus(email)).premium;
}
