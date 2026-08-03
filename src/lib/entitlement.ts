import { supabaseServer } from './supabase/server';

export const PAID_STATUSES = ['trialing', 'weekly', 'annual'] as const;
export const FULL_PAID_STATUSES = ['weekly', 'annual'] as const;

export interface Entitlement {
  userId: string | null;
  email: string | null;
  firstName: string | null;
  status: string;
  /** Full paid access — briefings, timing, diagnosis, journal. */
  isPaid: boolean;
  /** Trial access — reading + 1 chat + today's timing only. */
  isTrialing: boolean;
  /** Either paid or trialing — has SOME level of access beyond free. */
  hasAccess: boolean;
  expiresAt: string | null;
  trialEndsAt: string | null;
  oracleCredits: number;
  subscriptionId: string | null;
}

export const ANONYMOUS: Entitlement = {
  userId: null,
  email: null,
  firstName: null,
  status: 'anonymous',
  isPaid: false,
  isTrialing: false,
  hasAccess: false,
  expiresAt: null,
  trialEndsAt: null,
  oracleCredits: 0,
  subscriptionId: null,
};

/**
 * Two-tier entitlement:
 *
 * Trial (24hr): full reading, 1 chat answer, today's timing.
 * Paid (weekly/annual): everything — briefings, full timing, diagnosis, journal, unlimited chat.
 *
 * This prevents the "read everything in 10 minutes and cancel" pattern.
 * The reading hooks them; the daily product is what they pay for.
 */
export async function getEntitlement(): Promise<Entitlement> {
  const supabase = await supabaseServer();

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

  const isTrialing = status === 'trialing' && notExpired;
  const isFullPaid = (FULL_PAID_STATUSES as readonly string[]).includes(status) && notExpired;
  // Canceled users keep access until expiry
  const isCanceledWithAccess = status === 'canceled' && notExpired;

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    firstName: profile?.first_name ?? null,
    status,
    isPaid: isFullPaid || isCanceledWithAccess,
    isTrialing,
    hasAccess: isTrialing || isFullPaid || isCanceledWithAccess,
    expiresAt: expiry,
    trialEndsAt: profile?.trial_ends_at ?? null,
    oracleCredits: profile?.oracle_credits ?? 0,
    subscriptionId: profile?.stripe_subscription_id ?? null,
  };
}
