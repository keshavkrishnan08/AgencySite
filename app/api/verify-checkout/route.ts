import { NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Confirms a Checkout Session actually resulted in payment before the client
   grants access. Never trust the ?upgraded=1 redirect alone — a user who
   cancels (or anyone typing the URL) must NOT get in. */
export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ paid: false, configured: false });

  let sessionId = "";
  try {
    ({ sessionId } = await req.json());
  } catch {
    return NextResponse.json({ paid: false });
  }
  if (!sessionId) return NextResponse.json({ paid: false });

  try {
    const s = await getStripe().checkout.sessions.retrieve(sessionId);
    // Paid one-time OR an active/trialing subscription both count as "in".
    const paid =
      s.payment_status === "paid" ||
      s.payment_status === "no_payment_required" ||
      (s.status === "complete" && s.payment_status !== "unpaid");
    return NextResponse.json({ paid, email: s.customer_details?.email ?? null });
  } catch {
    return NextResponse.json({ paid: false });
  }
}
