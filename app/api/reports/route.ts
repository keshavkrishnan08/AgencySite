import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* The in-app Reports page's data source. Returns the whole page-by-page report
   in one call via the report_summary() SQL rollup — totals, pageviews per path,
   top events, the Land -> Subscribe funnel, and a daily series.

   This is OUR first-party analytics, read from public.events (the copy the
   client fans out to alongside Mixpanel/Vercel/Meta). It works with no paid
   plan and no ad-blocker loss.

   Optional gate: if ADMIN_EMAILS is set, only those emails (passed in the
   x-user-id header, same as subscription-status) get data. Unset => open, so it
   works out of the box for a single-owner deployment. */

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  // Password-gated: this is the owner-only analytics surface, split out from the
  // app. Set REPORTS_PASSWORD in the environment; the standalone /reports page
  // sends it. If unset, deny (fail closed) rather than expose data.
  const pw = process.env.REPORTS_PASSWORD;
  if (!pw || body?.password !== pw) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  if (!db) {
    // No Supabase configured (local/demo). Say so plainly instead of erroring.
    return NextResponse.json({ configured: false });
  }

  let days = 30;
  const d = Number(body?.days);
  if ([7, 30, 90].includes(d)) days = d;

  const { data, error } = await db.rpc("report_summary", { days });
  if (error) {
    return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ configured: true, report: data });
}
