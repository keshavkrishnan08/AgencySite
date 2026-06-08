import { NextResponse } from "next/server";
import { getStripe, stripeConfigured, PRICES, TRIAL_DAYS } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Creates a real Stripe Checkout Session (subscription) and returns its URL.
   If Stripe isn't configured, returns {configured:false} so the client can run
   the demo upgrade instead. */

export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ configured: false });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* default body */
  }
  const plan = body?.plan === "annual" ? "annual" : "monthly";
  const email: string | undefined = body?.email || undefined;

  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: plan === "annual" ? PRICES.annual() : PRICES.monthly(), quantity: 1 }],
      customer_email: email,
      allow_promotion_codes: true,
      subscription_data: TRIAL_DAYS > 0 ? { trial_period_days: TRIAL_DAYS } : undefined,
      success_url: `${origin}/dashboard?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/upgrade?canceled=1`,
      metadata: { product: "axon_premium", plan },
    });
    return NextResponse.json({ configured: true, url: session.url });
  } catch (e: any) {
    return NextResponse.json({ configured: true, error: e?.message || "Checkout failed" }, { status: 500 });
  }
}
