import { supabaseServer } from './supabase/server';

export const PAID_STATUSES = ['trialing', 'weekly', 'annual'] as const;

export interface Entitlement {
  userId: string | null;
  email: string | null;
  firstName: string | null;
  status: string;
  isPaid: boolean;
  expiresAt: string | null;
  trialEndsAt: string | null;
  oracleCredits: number;
  /** Needed to deep-link Stripe's cancellation flow. */
  subscriptionId: string | null;
}

export const ANONYMOUS: Entitlement = {
  userId: null,
  email: null,
  firstName: null,
  status: 'anonymous',
  isPaid: false,
  expiresAt: null,
  trialEndsAt: null,
  oracleCredits: 0,
  subscriptionId: null,
};

/**
 * The single gate for paid content. Checks the status column *and* the expiry,
 * so a lapsed subscription whose webhook never landed still loses access rather
 * than staying unlocked forever.
 */
export async function getEntitlement(): Promise<Entitlement> {
  const supabase = await supabaseServer();

  // A blip talking to the auth service must degrade to "signed out", not throw —
  // otherwise the marketing page 500s whenever Supabase hiccups.
  let user: { id: string; email?: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return ANONYMOUS;
  }
  if (!user) return ANONYMOUS;

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'email, first_name, subscription_status, subscription_expiry, trial_ends_at, oracle_credits, stripe_subscription_id',
    )
    .eq('id', user.id)
    .single();

  const status = profile?.subscription_status ?? 'free';
  const expiry = profile?.subscription_expiry ?? null;
  const notExpired = !expiry || new Date(expiry).getTime() > Date.now();

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    firstName: profile?.first_name ?? null,
    status,
    isPaid: (PAID_STATUSES as readonly string[]).includes(status) && notExpired,
    expiresAt: expiry,
    trialEndsAt: profile?.trial_ends_at ?? null,
    oracleCredits: profile?.oracle_credits ?? 0,
    subscriptionId: profile?.stripe_subscription_id ?? null,
  };
}
