import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Durable funnel events.
 *
 * PostHog is where you'll actually analyse the funnel. This is the copy you
 * own: ad blockers eat roughly a fifth of pixel traffic in this demographic,
 * and that fifth is not random — it skews to the exact cautious, older users
 * we're targeting. Losing them silently would bias every conversion rate you
 * make budget decisions from.
 *
 * Accepts a small batch so the client can flush on unload without firing a
 * request per event. Always returns 200: analytics must never surface an error
 * to a user mid-funnel. */

const MAX_BATCH = 20;

const str = (v: unknown, max = 200): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false });
  }

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ ok: true, stored: false });

  const raw = Array.isArray(body?.events) ? body.events : [body];
  const ua = req.headers.get("user-agent")?.slice(0, 300) ?? null;

  const rows = raw
    .slice(0, MAX_BATCH)
    .map((e: any) => {
      const name = str(e?.name, 80);
      if (!name) return null;
      const attr = e?.attribution ?? {};
      // Cap the blob so a runaway client can't write megabytes per event.
      // Drop keys rather than truncating the JSON string, which would produce
      // unparseable output.
      let props: Record<string, unknown> = {};
      if (e?.props && typeof e.props === "object" && !Array.isArray(e.props)) {
        let budget = 4000;
        for (const [k, v] of Object.entries(e.props).slice(0, 30)) {
          const val = typeof v === "string" ? v.slice(0, 500) : v;
          const cost = k.length + JSON.stringify(val ?? null).length + 4;
          if (cost > budget) break;
          budget -= cost;
          props[k.slice(0, 60)] = val;
        }
      }
      return {
        name,
        anon_id: str(e?.anonId, 80),
        email: str(e?.email, 200)?.toLowerCase() ?? null,
        props,
        path: str(e?.path, 200),
        referrer: str(attr.referrer, 300),
        utm_source: str(attr.utm_source, 120),
        utm_campaign: str(attr.utm_campaign, 160),
        user_agent: ua,
      };
    })
    .filter(Boolean);

  if (!rows.length) return NextResponse.json({ ok: true, stored: false });

  try {
    const { error } = await db.from("events").insert(rows);
    if (error) throw error;
    return NextResponse.json({ ok: true, stored: true, count: rows.length });
  } catch {
    return NextResponse.json({ ok: true, stored: false });
  }
}
