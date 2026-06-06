import { NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Stripe webhook. Verifies the signature, then reacts to subscription events.
 *
 * PERSISTENCE: to gate Premium for real customers you MUST record subscription
 * state in a database keyed by customer/email (the localStorage flag in this
 * demo only lives in the buyer's browser). Wire a Supabase update where marked.
 * See MONETIZATION.md. */

export async function POST(req: Request) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ received: false, reason: "stripe not configured" }, { status: 200 });
  }

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig as string, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch (e: any) {
    return NextResponse.json({ error: `Webhook signature failed: ${e?.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      // const sub = event.data.object;
      // TODO(persistence): mark this customer/email as plan=premium in your DB.
      break;
    }
    case "customer.subscription.deleted": {
      // TODO(persistence): downgrade this customer/email to plan=free in your DB.
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
