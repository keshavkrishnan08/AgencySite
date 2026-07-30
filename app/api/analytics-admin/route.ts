import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Hyper-detailed conversion analytics API for the owner.
   Password-gated via REPORTS_PASSWORD. Uses direct Supabase queries
   against the events, leads, and subscriptions tables. */

async function query(db: any, sql: string) {
  // Use the Supabase admin client to run raw SQL via the REST API
  const { data, error } = await db.rpc("report_query", { q: sql });
  if (error) throw error;
  return data;
}

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}

  const pw = process.env.REPORTS_PASSWORD;
  if (!pw || body?.password !== pw) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ configured: false });

  const days = [1, 7, 30, 90].includes(Number(body?.days)) ? Number(body.days) : 7;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  try {
    // Run all queries in parallel using the events table directly
    const eventsQuery = db.from("events").select("*").gte("created_at", since);
    const leadsQuery = db.from("leads").select("*").order("created_at", { ascending: false }).limit(20);
    const subsQuery = db.from("subscriptions").select("*").order("updated_at", { ascending: false }).limit(10);

    const [eventsRes, leadsRes, subsRes] = await Promise.all([
      eventsQuery, leadsQuery, subsQuery,
    ]);

    const events = eventsRes.data || [];
    const leads = leadsRes.data || [];
    const subs = subsRes.data || [];

    // Process events client-side for full flexibility
    const uniqueVisitors = new Set(events.map((e: any) => e.anon_id));
    const pageviews = events.filter((e: any) => e.name === "page:view");
    const identified = new Set(events.filter((e: any) => e.email).map((e: any) => e.email));

    // Totals
    const totals = {
      total_events: events.length,
      unique_visitors: uniqueVisitors.size,
      pageviews: pageviews.length,
      identified_users: identified.size,
    };

    // Funnel (unique anon_ids at each step)
    const funnelEvent = (name: string) => new Set(events.filter((e: any) => e.name === name).map((e: any) => e.anon_id)).size;
    const funnel = {
      land: funnelEvent("page:view"),
      cta_click: funnelEvent("landing_cta_click"),
      onboard_start: funnelEvent("onboarding:step_view"),
      onboard_answer: funnelEvent("onboarding:answer"),
      onboard_done: funnelEvent("onboarding_complete"),
      account_created: funnelEvent("account_created"),
      session_started: funnelEvent("session_started"),
      first_scored: funnelEvent("practice:scored"),
      session_complete: funnelEvent("session_complete"),
      upgrade_view: funnelEvent("upgrade_view"),
      upgrade_click: funnelEvent("upgrade_click"),
      upgrade_success: funnelEvent("upgrade_success"),
    };

    // Pages
    const pageMap = new Map<string, { views: number; visitors: Set<string> }>();
    pageviews.forEach((e: any) => {
      const p = pageMap.get(e.path) || { views: 0, visitors: new Set() };
      p.views++;
      p.visitors.add(e.anon_id);
      pageMap.set(e.path, p);
    });
    const pages = Array.from(pageMap.entries())
      .map(([path, d]) => ({ path, views: d.views, visitors: d.visitors.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 30);

    // Top events
    const eventMap = new Map<string, { count: number; users: Set<string> }>();
    events.forEach((e: any) => {
      const d = eventMap.get(e.name) || { count: 0, users: new Set() };
      d.count++;
      d.users.add(e.anon_id);
      eventMap.set(e.name, d);
    });
    const topEvents = Array.from(eventMap.entries())
      .map(([name, d]) => ({ name, count: d.count, users: d.users.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40);

    // Daily breakdown
    const dailyMap = new Map<string, { events: number; views: number; visitors: Set<string>; cta_clicks: Set<string>; onboards: Set<string>; accounts: Set<string> }>();
    events.forEach((e: any) => {
      const day = e.created_at.slice(0, 10);
      const d = dailyMap.get(day) || { events: 0, views: 0, visitors: new Set(), cta_clicks: new Set(), onboards: new Set(), accounts: new Set() };
      d.events++;
      if (e.name === "page:view") { d.views++; d.visitors.add(e.anon_id); }
      if (e.name === "landing_cta_click") d.cta_clicks.add(e.anon_id);
      if (e.name === "onboarding_complete") d.onboards.add(e.anon_id);
      if (e.name === "account_created") d.accounts.add(e.anon_id);
      dailyMap.set(day, d);
    });
    const daily = Array.from(dailyMap.entries())
      .map(([day, d]) => ({ day, events: d.events, views: d.views, visitors: d.visitors.size, cta_clicks: d.cta_clicks.size, onboards: d.onboards.size, accounts: d.accounts.size }))
      .sort((a, b) => a.day.localeCompare(b.day));

    // Hourly heatmap
    const hourlyMap = new Map<number, { views: number; clicks: number }>();
    for (let i = 0; i < 24; i++) hourlyMap.set(i, { views: 0, clicks: 0 });
    events.forEach((e: any) => {
      const hour = new Date(e.created_at).getHours();
      const d = hourlyMap.get(hour)!;
      if (e.name === "page:view") d.views++;
      if (e.name === "landing_cta_click") d.clicks++;
    });
    const hourly = Array.from(hourlyMap.entries()).map(([hour, d]) => ({ hour, ...d })).sort((a, b) => a.hour - b.hour);

    // Devices
    const deviceMap = new Map<string, { visitors: Set<string>; cta_clicks: number }>();
    pageviews.forEach((e: any) => {
      const ua = (e.user_agent || "").toLowerCase();
      const device = ua.includes("mobile") || ua.includes("android") || ua.includes("iphone") ? "Mobile" : ua.includes("tablet") || ua.includes("ipad") ? "Tablet" : "Desktop";
      const d = deviceMap.get(device) || { visitors: new Set(), cta_clicks: 0 };
      d.visitors.add(e.anon_id);
      deviceMap.set(device, d);
    });
    events.filter((e: any) => e.name === "landing_cta_click").forEach((e: any) => {
      const ua = (e.user_agent || "").toLowerCase();
      const device = ua.includes("mobile") || ua.includes("android") || ua.includes("iphone") ? "Mobile" : ua.includes("tablet") || ua.includes("ipad") ? "Tablet" : "Desktop";
      const d = deviceMap.get(device);
      if (d) d.cta_clicks++;
    });
    const devices = Array.from(deviceMap.entries())
      .map(([device, d]) => ({ device, visitors: d.visitors.size, cta_clicks: d.cta_clicks }))
      .sort((a, b) => b.visitors - a.visitors);

    // Referrers
    const refMap = new Map<string, Set<string>>();
    pageviews.forEach((e: any) => {
      const ref = e.referrer || "(direct)";
      const s = refMap.get(ref) || new Set();
      s.add(e.anon_id);
      refMap.set(ref, s);
    });
    const referrers = Array.from(refMap.entries())
      .map(([referrer, s]) => ({ referrer, visitors: s.size }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 15);

    // UTM Sources
    const utmMap = new Map<string, { visitors: Set<string>; cta_clicks: number; onboards: number; accounts: number }>();
    events.forEach((e: any) => {
      const key = `${e.utm_source || "(none)"}|${e.utm_campaign || "(none)"}`;
      const d = utmMap.get(key) || { visitors: new Set(), cta_clicks: 0, onboards: 0, accounts: 0 };
      d.visitors.add(e.anon_id);
      if (e.name === "landing_cta_click") d.cta_clicks++;
      if (e.name === "onboarding_complete") d.onboards++;
      if (e.name === "account_created") d.accounts++;
      utmMap.set(key, d);
    });
    const utmSources = Array.from(utmMap.entries())
      .map(([key, d]) => {
        const [source, campaign] = key.split("|");
        return { source, campaign, visitors: d.visitors.size, cta_clicks: d.cta_clicks, onboards: d.onboards, accounts: d.accounts };
      })
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 20);

    // Drop-offs (last event per user)
    const lastEvents = new Map<string, { name: string; path: string }>();
    [...events].sort((a: any, b: any) => a.created_at.localeCompare(b.created_at)).forEach((e: any) => {
      lastEvents.set(e.anon_id, { name: e.name, path: e.path || "" });
    });
    const dropoffMap = new Map<string, number>();
    lastEvents.forEach(({ name, path }) => {
      const key = `${name}|||${path}`;
      dropoffMap.set(key, (dropoffMap.get(key) || 0) + 1);
    });
    const dropoffs = Array.from(dropoffMap.entries())
      .map(([key, exits]) => {
        const [name, path] = key.split("|||");
        return { name, path, exits };
      })
      .sort((a, b) => b.exits - a.exits)
      .slice(0, 20);

    // Session journeys (multi-event users, funnel events only)
    const funnelNames = new Set(["page:view", "landing_cta_click", "onboarding:step_view", "onboarding_complete", "account_created", "session_started", "session_complete", "upgrade_view", "upgrade_click", "upgrade_success", "page:exit"]);
    const journeyMap = new Map<string, { journey: string[]; first: string; last: string }>();
    [...events]
      .filter((e: any) => funnelNames.has(e.name))
      .sort((a: any, b: any) => a.created_at.localeCompare(b.created_at))
      .forEach((e: any) => {
        const d = journeyMap.get(e.anon_id) || { journey: [] as string[], first: e.created_at, last: e.created_at };
        d.journey.push(e.name);
        d.last = e.created_at;
        journeyMap.set(e.anon_id, d);
      });
    const sessionFlow = Array.from(journeyMap.entries())
      .filter(([, d]) => d.journey.length >= 2)
      .map(([anon_id, d]) => ({ anon_id, journey: d.journey, events: d.journey.length, first_seen: d.first, last_seen: d.last }))
      .sort((a, b) => b.first_seen.localeCompare(a.first_seen))
      .slice(0, 50);

    return NextResponse.json({
      configured: true, days,
      report: {
        totals, funnel, pages, topEvents, daily, hourly,
        devices, referrers, utmSources, leadDetails: leads,
        sessionFlow, dropoffs, subscriptions: subs,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ configured: true, error: err?.message || "query failed" }, { status: 500 });
  }
}
