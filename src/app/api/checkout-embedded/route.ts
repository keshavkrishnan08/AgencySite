import { NextResponse } from 'next/server';
import { TRIAL_DAYS, priceIdFor, stripe, type PlanId } from '@/lib/stripe';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

/**
 * Creates a Stripe Embedded Checkout session that renders inside the app.
 * Returns the clientSecret for the frontend to mount the checkout form.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const plan: PlanId = body.plan === 'annual' ? 'annual' : 'weekly';
    const chartId = typeof body.chartId === 'string' ? body.chartId : null;

    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id, email, subscription_status')
      .eq('id', user.id)
      .single();

    if (
      profile &&
      ['trialing', 'weekly', 'annual'].includes(profile.subscription_status)
    ) {
      return NextResponse.json({ error: 'Already subscribed.' }, { status: 400 });
    }

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe().customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await admin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      ui_mode: 'embedded',
      line_items: [{ price: priceIdFor(plan), quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      subscription_data: {
        ...(TRIAL_DAYS > 0 ? { trial_period_days: TRIAL_DAYS } : {}),
        metadata: {
          supabase_user_id: user.id,
          plan,
          chart_id: chartId ?? '',
        },
      },
      metadata: {
        supabase_user_id: user.id,
        plan,
        chart_id: chartId ?? '',
      },
      return_url: `${siteUrl()}/welcome?session_id={CHECKOUT_SESSION_ID}`,
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (e) {
    console.error('[checkout-embedded]', e);
    return NextResponse.json(
      { error: 'Could not start checkout.' },
      { status: 500 },
    );
  }
}
