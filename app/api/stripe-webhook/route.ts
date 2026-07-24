import { NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { syncSubscription } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Stripe webhook. Hardened per Stripe's own guidance:
 *   1. Verify the signature on the RAW body before doing anything.
 *   2. Dedupe by event.id (at-least-once delivery) via public.stripe_events.
 *   3. Never hand-patch per event type — funnel every relevant event through
 *      ONE syncSubscription(customerId), which re-reads the current truth from
 *      Stripe. This kills out-of-order and split-brain races: event order stops
 *      mattering because we always write Stripe's current state.
 *   4. Return 2xx fast; Stripe retries with backoff for up to 3 days.
 * If Supabase isn't configured the event is acknowledged and skipped (demo). */

// The tight allowlist we act on. Everything routes to a customer resync.
const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "invoice.payment_action_required",
]);

export async function POST(req: Request) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ received: false, reason: "stripe not configured" }, { status: 200 });
  }

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text(); // RAW body — never req.json(), it breaks the HMAC
  let event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig as string, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch (e: any) {
    return NextResponse.json({ error: `Webhook signature failed: ${e?.message}` }, { status: 400 });
  }

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ received: true, persisted: false }); // demo mode

  // ── Idempotency: insert event.id; if it's already there, we've handled it. ──
  try {
    const { error: dupErr } = await db
      .from("stripe_events")
      .insert({ id: event.id, type: event.type });
    if (dupErr) {
      // Unique-violation → already processed. Any other error → log id/type only.
      const code = (dupErr as any).code;
      if (code === "23505") return NextResponse.json({ received: true, duplicate: true });
      // Non-duplicate insert failure: proceed anyway (don't drop the event).
    }
  } catch {
    /* ignore ledger hiccups; better to process than to drop */
  }

  if (!HANDLED.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  // ── Resolve the customer id from whatever object this event carries, then
  //    resync that customer's subscription from Stripe (source of truth). ──
  try {
    const obj = event.data.object as any;
    const customerId: string | null =
      typeof obj.customer === "string" ? obj.customer : obj.customer?.id ?? null;

    if (customerId) {
      await syncSubscription(customerId);
    }
  } catch (e: any) {
    // Log id/type only — never the payload (may carry PII/card data).
    console.error(`stripe-webhook sync failed for ${event.id} (${event.type}): ${e?.message}`);
    // Still 2xx so Stripe doesn't hammer retries; a reconciliation sweep or the
    // next event for this customer will correct the row.
    return NextResponse.json({ received: true, synced: false });
  }

  return NextResponse.json({ received: true, synced: true });
}
