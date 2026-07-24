import { NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Stripe webhook. Verifies the signature, then records subscription state in
 * Supabase so Premium is enforceable across devices. If Supabase isn't
 * configured the event is acknowledged and skipped (demo mode). */

/* Stripe describes a plan as {interval, interval_count}. Map that to the two
   plans we actually sell, and keep 'annual' recognized so any legacy yearly
   subscriber is still labelled correctly instead of silently reading monthly. */
function intervalLabel(recurring: { interval?: string; interval_count?: number } | undefined): string {
  const unit = recurring?.interval;
  const count = recurring?.interval_count ?? 1;
  if (unit === "year") return "annual";
  if (unit === "month" && count === 3) return "quarterly";
  if (unit === "month" && count === 12) return "annual";
  return "monthly";
}

async function emailForCustomer(customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  try {
    const cust = (await getStripe().customers.retrieve(customerId)) as any;
    return cust?.email ?? null;
  } catch {
    return null;
  }
}

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

  const db = supabaseAdmin();
  if (!db) {
    // No DB wired yet: acknowledge so Stripe stops retrying. Demo mode.
    return NextResponse.json({ received: true, persisted: false });
  }

  try {
    const obj = event.data.object as any;
    if (event.type === "checkout.session.completed") {
      const email = obj.customer_details?.email || obj.customer_email || (await emailForCustomer(obj.customer));
      // Upsert keys on stripe_subscription_id. Without one, the conflict target
      // is null and every retry would insert a duplicate row — so grant access
      // on the profile and let customer.subscription.* write the real row.
      if (email && obj.subscription) {
        await db.from("subscriptions").upsert(
          {
            email,
            stripe_customer_id: obj.customer ?? null,
            stripe_subscription_id: obj.subscription,
            status: "active",
            plan: "premium",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_subscription_id" }
        );
      }
      if (email) await db.from("profiles").update({ plan: "premium" }).eq("email", email);
    } else if (event.type.startsWith("customer.subscription.")) {
      const email = await emailForCustomer(obj.customer);
      const status = event.type === "customer.subscription.deleted" ? "canceled" : obj.status;
      const plan = status === "active" || status === "trialing" ? "premium" : "free";
      // Stripe's 2026 API moved current_period_end onto the line item; older
      // versions keep it on the subscription. Read whichever is present.
      const item = obj.items?.data?.[0];
      const periodEndUnix = obj.current_period_end ?? item?.current_period_end ?? null;
      const interval = intervalLabel(item?.price?.recurring);
      if (email) {
        await db.from("subscriptions").upsert(
          {
            email,
            stripe_customer_id: obj.customer ?? null,
            stripe_subscription_id: obj.id ?? null,
            status,
            plan,
            interval,
            current_period_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_subscription_id" }
        );
        await db.from("profiles").update({ plan }).eq("email", email);
      }
    }
  } catch (e: any) {
    return NextResponse.json({ received: true, error: e?.message }, { status: 200 });
  }

  return NextResponse.json({ received: true, persisted: true });
}
