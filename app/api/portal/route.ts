import { NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Stripe Billing Portal. This is the REAL cancel / update-card / view-invoices
   surface — cancelling here fires customer.subscription.updated|deleted, which
   the webhook syncs to Supabase, so access follows Stripe's truth (with grace
   until the period ends). We never mutate the plan locally on "cancel"; that
   was the old bug (it left the Stripe subscription billing while showing free). */

export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ configured: false });

  let email = "";
  try {
    ({ email } = await req.json());
  } catch {
    /* fall through */
  }
  email = (email || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "no_email" }, { status: 400 });

  const origin =
    req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://axonservices.dev";

  // Resolve the Stripe customer: our DB first (written by the webhook), then a
  // Stripe lookup by email as a fallback.
  let customerId = "";
  const db = supabaseAdmin();
  if (db) {
    const { data } = await db
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("email", email)
      .not("stripe_customer_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    customerId = data?.stripe_customer_id || "";
  }
  if (!customerId) {
    try {
      const list = await getStripe().customers.list({ email, limit: 1 });
      customerId = list.data[0]?.id || "";
    } catch {
      /* fall through */
    }
  }
  if (!customerId) return NextResponse.json({ error: "no_customer" }, { status: 404 });

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    // Most common cause: the Billing Portal hasn't been activated in the Stripe
    // dashboard yet (Settings -> Billing -> Customer portal). Surface it clearly.
    return NextResponse.json({ error: e?.message || "portal_failed" }, { status: 500 });
  }
}
