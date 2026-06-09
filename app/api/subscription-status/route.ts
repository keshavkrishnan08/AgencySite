import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { subscriptionStatus } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Authoritative subscription check for the signed-in account. The client uses
   this to reconcile access: keep premium while inside the paid period, drop it
   once the subscription has truly ended. Reads the email from x-user-id. */
export async function POST(req: Request) {
  const limited = await rateLimit(req);
  if (limited) return limited;
  const email = (req.headers.get("x-user-id") || "").trim().slice(0, 200);
  if (!email) return NextResponse.json({ premium: false, status: "none", until: null });
  const s = await subscriptionStatus(email);
  return NextResponse.json(s);
}
