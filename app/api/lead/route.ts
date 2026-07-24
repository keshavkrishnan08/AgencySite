import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Presale capture. One row per email in public.leads, first-touch attribution
   preserved: a repeat submit updates the profile fields but never overwrites
   the campaign that originally brought them in, because that's the number the
   ad spend is judged on.

   Writes with the service role, so the browser never touches the table. */

const str = (v: unknown, max = 200): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
};

// Deliberately permissive: rejecting a real buyer over a regex costs more than
// storing one bad row.
const looksLikeEmail = (s: string) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(s);

export async function POST(req: Request) {
  const limited = await rateLimit(req);
  if (limited) return limited;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const email = str(body?.email, 200)?.toLowerCase();
  if (!email || !looksLikeEmail(email)) {
    return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
  }

  const db = supabaseAdmin();
  if (!db) {
    // Locally, accept so the flow stays testable without a database.
    // In production, FAIL LOUDLY. A presale page that smiles and drops the
    // email is the worst possible failure: you'd keep paying for ads while
    // every lead evaporates. Better a visible error the moment it's wrong.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, stored: false, error: "Lead storage is not configured." },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, stored: false });
  }

  const attr = body?.attribution ?? {};
  const incoming = {
    email,
    name: str(body?.name, 120),
    situation: str(body?.situation, 40),
    target_role: str(body?.targetRole, 120),
    interview_gap: str(body?.interviewGap, 20),
    source: str(body?.source, 40) ?? "landing",
    intent: str(body?.intent, 20) ?? "waitlist",
    quoted_price_cents: Number.isFinite(body?.quotedPriceCents) ? Number(body.quotedPriceCents) : null,
    anon_id: str(body?.anonId, 80),
    utm_source: str(attr.utm_source, 120),
    utm_medium: str(attr.utm_medium, 120),
    utm_campaign: str(attr.utm_campaign, 160),
    utm_content: str(attr.utm_content, 160),
    fbclid: str(attr.fbclid, 300),
    referrer: str(attr.referrer, 300),
    landing_path: str(attr.landing_path, 200),
  };

  try {
    const { data: existing } = await db
      .from("leads")
      .select("id, utm_campaign, utm_source, source, landing_path, referrer, fbclid, utm_medium, utm_content")
      .eq("email", email)
      .maybeSingle();

    if (!existing) {
      const { error } = await db.from("leads").insert(incoming);
      if (error) throw error;
      return NextResponse.json({ ok: true, stored: true, created: true });
    }

    // Repeat submit: refresh who they are, keep where they came from.
    const patch: Record<string, unknown> = {};
    for (const k of ["name", "situation", "target_role", "interview_gap", "intent", "quoted_price_cents", "anon_id"] as const) {
      if (incoming[k] !== null && incoming[k] !== undefined) patch[k] = incoming[k];
    }
    // Backfill attribution only where it was previously blank.
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid", "referrer", "landing_path", "source"] as const) {
      if (!(existing as any)[k] && incoming[k]) patch[k] = incoming[k];
    }
    if (Object.keys(patch).length) {
      const { error } = await db.from("leads").update(patch).eq("id", (existing as any).id);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true, stored: true, created: false });
  } catch (e: any) {
    // Never fail the user's submit over a DB hiccup — they gave us their email.
    return NextResponse.json({ ok: true, stored: false, error: e?.message ?? "store failed" });
  }
}
