import { rateLimit } from "@/lib/ratelimit";
import { NextResponse } from "next/server";
import { getStripe, stripeConfigured, PRICES, TRIAL_DAYS, isPlanKey } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Creates a real Stripe Checkout Session (subscription) and returns its URL.
   If Stripe isn't configured, returns {configured:false} so the client can run
   the demo upgrade instead. */

export async function POST(req: Request) {
  const limited = await rateLimit(req);
  if (limited) return limited;
  if (!stripeConfigured()) {
    return NextResponse.json({ configured: false });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* default body */
  }
  const requested: unknown = body?.plan;
  // Reject an unknown plan rather than silently charging a default price.
  if (requested != null && !isPlanKey(requested)) {
    return NextResponse.json({ configured: true, error: "Unknown plan" }, { status: 400 });
  }
  const plan = isPlanKey(requested) ? requested : "monthly";
  const email: string | undefined = body?.email || undefined;

  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: PRICES[plan](), quantity: 1 }],
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
