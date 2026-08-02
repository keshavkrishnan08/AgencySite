import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getEntitlement } from '@/lib/entitlement';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Stripe billing portal.
 *
 * `intent: 'cancel'` deep-links into Stripe's cancellation flow rather than
 * dropping the user on a dashboard to find it themselves — cancelling has to
 * be as easy as subscribing was.
 *
 * `intent: 'upgrade'` deep-links into the plan-switch flow. An existing
 * subscriber cannot go through Checkout at all — /api/checkout bounces anyone
 * already on `weekly`, `annual` or `trialing` back to /updates — so a weekly
 * → annual move has to modify the live subscription instead of opening a
 * second one. Stripe prorates the switch and never re-grants the free trial.
 */
export async function POST(request: Request) {
  const ent = await getEntitlement();
  if (!ent.userId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin()
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', ent.userId)
    .single();

  if (!profile?.stripe_customer_id) {
    // Never dead-end someone trying to cancel. If there is no Stripe customer
    // there is nothing to charge them, and saying so plainly is the honest
    // answer — a bare error here reads as an obstruction.
    return NextResponse.json(
      { error: 'You have no active subscription, so there is nothing to cancel.' },
      { status: 400 },
    );
  }

  const intent = await request
    .json()
    .then((b: { intent?: string }) => b.intent)
    .catch(() => undefined);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  // Try to deep-link into the specific flow. If the subscription ID is
  // invalid or missing, fall back to the generic billing portal — never
  // dead-end the user with an error when they're trying to cancel.
  try {
    const flowData =
      intent === 'cancel' && ent.subscriptionId
        ? {
            flow_data: {
              type: 'subscription_cancel' as const,
              subscription_cancel: { subscription: ent.subscriptionId },
              after_completion: {
                type: 'redirect' as const,
                redirect: { return_url: `${site}/settings?cancelled=1` },
              },
            },
          }
        : intent === 'upgrade' && ent.subscriptionId
          ? {
              flow_data: {
                type: 'subscription_update' as const,
                subscription_update: { subscription: ent.subscriptionId },
                after_completion: {
                  type: 'redirect' as const,
                  redirect: { return_url: `${site}/settings?upgraded=1` },
                },
              },
            }
          : {};

    const session = await stripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${site}/settings`,
      ...flowData,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    // Deep-link failed (invalid subscription ID, etc.) — open generic portal.
    const session = await stripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${site}/settings`,
    });
    return NextResponse.json({ url: session.url });
  }
}
