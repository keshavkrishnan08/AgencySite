import { NextResponse } from 'next/server';
import { TRIAL_DAYS, priceIdFor, stripe, type PlanId } from '@/lib/stripe';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

async function createSession(plan: PlanId, chartId: string | null) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You need to be signed in to check out.', status: 401 as const };
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
    return { url: `${siteUrl()}/updates`, status: 200 as const };
  }

  // Reuse the Stripe customer so a lapsed subscriber keeps one billing history.
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
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
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
    success_url: `${siteUrl()}/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/chart`,
  });

  return { url: session.url, status: 200 as const };
}

/**
 * Falls back to the *cheaper* plan, not the dearer one.
 *
 * A dropped or mangled `plan` param previously sent the buyer to a $79/year
 * checkout when they had clicked $7.99/week. A billing default that resolves
 * ambiguity in our favour is a refund and a dispute, not a rounding error.
 */
function parsePlan(value: string | null): PlanId {
  return value === 'annual' ? 'annual' : 'weekly';
}

/** POST from the paywall — returns the URL for the client to redirect to. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await createSession(
      parsePlan(body.plan),
      typeof body.chartId === 'string' ? body.chartId : null,
    );
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ url: result.url });
  } catch (e) {
    console.error('[checkout]', e);
    return NextResponse.json(
      { error: 'Could not start checkout. Please try again.' },
      { status: 500 },
    );
  }
}

/**
 * GET is the post-login continuation: the paywall sends unauthenticated users
 * to /login?next=/api/checkout?... so they land straight in Stripe afterwards.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    const result = await createSession(
      parsePlan(params.get('plan')),
      params.get('chart'),
    );
    if ('error' in result || !result.url) {
      return NextResponse.redirect(new URL('/#pricing', siteUrl()));
    }
    return NextResponse.redirect(result.url);
  } catch (e) {
    console.error('[checkout:get]', e);
    return NextResponse.redirect(new URL('/#pricing', siteUrl()));
  }
}
