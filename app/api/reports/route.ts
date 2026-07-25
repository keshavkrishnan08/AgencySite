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

function allowed(email: string | null): boolean {
  const list = (process.env.ADMIN_EMAILS || "").trim();
  if (!list) return true; // no allowlist configured -> owner-only deployment
  if (!email) return false;
  return list
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export async function POST(req: Request) {
  const email = req.headers.get("x-user-id");
  if (!allowed(email)) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const db = supabaseAdmin();
  if (!db) {
    // No Supabase configured (local/demo). Say so plainly instead of erroring.
    return NextResponse.json({ configured: false });
  }

  let days = 30;
  try {
    const body = await req.json();
    const d = Number(body?.days);
    if ([7, 30, 90].includes(d)) days = d;
  } catch {
    /* default 30 */
  }

  const { data, error } = await db.rpc("report_summary", { days });
  if (error) {
    return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ configured: true, report: data });
}
