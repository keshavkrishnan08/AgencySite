import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { syncSubscription } from "@/lib/billing";
import { stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Reconciliation sweep — the durability backstop for missed webhooks.
 *
 * Webhooks are the primary path (Stripe retries a failed delivery for ~3 days),
 * but if delivery is down longer, or an event slips, a row can go stale. This
 * re-reads Stripe's current truth for every subscription that could still change
 * (active/trialing/past_due) and rewrites the row via the same syncSubscription
 * the webhook uses. Idempotent, safe to run repeatedly.
 *
 * Called daily by a Vercel Cron (see vercel.json). Vercel adds
 * `Authorization: Bearer $CRON_SECRET` to cron requests when CRON_SECRET is set;
 * we require it so the endpoint isn't publicly triggerable. */

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured (dev) -> allow
  const auth = req.headers.get("authorization") || "";
  const custom = req.headers.get("x-cron-secret") || "";
  return auth === `Bearer ${secret}` || custom === secret;
}

async function reconcile(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ ok: true, skipped: "stripe not configured" });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ ok: true, skipped: "no db" });

  // Only the statuses that can still transition. canceled/unpaid are terminal.
  const { data } = await db
    .from("subscriptions")
    .select("stripe_customer_id")
    .in("status", ["active", "trialing", "past_due"])
    .not("stripe_customer_id", "is", null)
    .limit(1000);

  const ids = Array.from(
    new Set((data || []).map((r) => r.stripe_customer_id as string).filter(Boolean))
  );

  let ok = 0;
  let failed = 0;
  const CONCURRENCY = 4; // gentle on Stripe's rate limit
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((id) => syncSubscription(id)));
    for (const r of results) (r.status === "fulfilled" ? ok++ : failed++);
  }

  return NextResponse.json({ ok: true, reconciled: ok, failed, total: ids.length });
}

export async function GET(req: Request) {
  return reconcile(req);
}
export async function POST(req: Request) {
  return reconcile(req);
}
