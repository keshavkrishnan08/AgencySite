import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { statusFromSubscription, stripe, type PlanId } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email';

export const runtime = 'nodejs';

/**
 * Stripe webhook. Everything that grants or revokes paid access flows through
 * here — the client is never trusted to report a successful payment.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  }

  // Signature verification needs the exact raw body — never re-serialise it.
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch (e) {
    console.error('[stripe-webhook] signature verification failed', e);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // Stripe retries on any non-2xx, and can deliver the same event twice.
  // The primary key on stripe_events makes replays a no-op.
  const { error: dupe } = await admin
    .from('stripe_events')
    .insert({ id: event.id, type: event.type });
  if (dupe) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // One-time oracle/team credit top-up.
        if (session.mode === 'payment' && session.metadata?.kind === 'credits') {
          const userId = session.metadata.supabase_user_id;
          const credits = Number(session.metadata.credits ?? 10);
          if (userId && Number.isFinite(credits)) {
            const { data: profile } = await admin
              .from('profiles')
              .select('oracle_credits')
              .eq('id', userId)
              .single();
            await admin
              .from('profiles')
              .update({ oracle_credits: (profile?.oracle_credits ?? 0) + credits })
              .eq('id', userId);
          }
          break;
        }

        if (session.mode !== 'subscription' || !session.subscription) break;
        const sub = await stripe().subscriptions.retrieve(
          session.subscription as string,
        );
        await applySubscription(sub, session.metadata ?? {});
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await applySubscription(event.data.object, event.data.object.metadata ?? {});
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : null;
        if (customerId) {
          await admin
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('stripe_customer_id', customerId);
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    // Roll back the idempotency marker so Stripe's retry can actually retry.
    await admin.from('stripe_events').delete().eq('id', event.id);
    console.error(`[stripe-webhook] handler failed for ${event.type}`, e);
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function applySubscription(
  sub: Stripe.Subscription,
  metadata: Record<string, string>,
) {
  const admin = supabaseAdmin();
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  // Prefer the id we stamped on the subscription; fall back to the customer
  // lookup so a subscription created in the Stripe dashboard still resolves.
  let userId = sub.metadata?.supabase_user_id || metadata.supabase_user_id || null;
  if (!userId) {
    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    userId = data?.id ?? null;
  }
  if (!userId) {
    console.error('[stripe-webhook] no user for customer', customerId);
    return;
  }

  const plan = resolvePlan(sub, metadata);
  const { status, expiry } = statusFromSubscription(sub, plan);

  const { data: before } = await admin
    .from('profiles')
    .select('subscription_status, email, first_name')
    .eq('id', userId)
    .single();

  await admin
    .from('profiles')
    .update({
      subscription_status: status,
      subscription_expiry: expiry,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      trial_ends_at: sub.trial_end
        ? new Date(sub.trial_end * 1000).toISOString()
        : null,
    })
    .eq('id', userId);

  const nowPaid = ['trialing', 'weekly', 'annual'].includes(status);
  const wasPaid = ['trialing', 'weekly', 'annual'].includes(
    before?.subscription_status ?? 'free',
  );

  if (nowPaid && !wasPaid && before?.email) {
    await sendWelcomeEmail({
      to: before.email,
      firstName: before.first_name ?? 'there',
    }).catch((e) => console.error('[stripe-webhook] welcome email failed', e));
  }
}

function resolvePlan(
  sub: Stripe.Subscription,
  metadata: Record<string, string>,
): PlanId {
  const fromMeta = sub.metadata?.plan || metadata.plan;
  if (fromMeta === 'weekly' || fromMeta === 'annual') return fromMeta;

  // No metadata (e.g. created in the dashboard) — infer from the interval.
  const interval = sub.items.data[0]?.price?.recurring?.interval;
  return interval === 'year' ? 'annual' : 'weekly';
}
