import Stripe from 'stripe';

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  cached ??= new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-07-29.dahlia',
    typescript: true,
  });
  return cached;
}

export const PLANS = {
  weekly: {
    id: 'weekly' as const,
    label: 'Weekly',
    price: '$7.99',
    cadence: '/week',
    priceIdEnv: 'STRIPE_PRICE_ID_WEEKLY',
    blurb: 'Full access, billed weekly.',
  },
  annual: {
    id: 'annual' as const,
    label: 'Annual',
    price: '$78.99',
    cadence: '/year',
    priceIdEnv: 'STRIPE_PRICE_ID_ANNUAL',
    blurb: 'Full access, billed once a year.',
    badge: 'SAVE 81%',
    popular: true,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function priceIdFor(plan: PlanId): string {
  const key = PLANS[plan].priceIdEnv;
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not set`);
  return value;
}

/** Free-trial length in days. 0 disables the trial. */
export const TRIAL_DAYS = Number(process.env.STRIPE_TRIAL_DAYS ?? 3);

/** Maps a Stripe subscription to our profile columns. */
export function statusFromSubscription(
  sub: Stripe.Subscription,
  plan: PlanId | null,
): { status: string; expiry: string | null } {
  const periodEnd =
    sub.items.data[0]?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    null;
  const expiry = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  switch (sub.status) {
    case 'trialing':
      return { status: 'trialing', expiry };
    case 'active':
      return { status: plan ?? 'weekly', expiry };
    case 'past_due':
    case 'unpaid':
      return { status: 'past_due', expiry };
    default:
      return { status: 'canceled', expiry };
  }
}
