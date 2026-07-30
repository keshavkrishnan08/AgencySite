import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { emailConfigured, sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Daily drip email to leads who signed up but haven't paid.
   Called by Vercel Cron once a day. Sends a personalized nudge
   based on how many days since they signed up (day 1, 2, 3, 5, 7).
   Gated by CRON_SECRET to prevent unauthorized calls. */

const DRIP: Record<number, (name: string, role: string) => { subject: string; html: string }> = {
  1: (name, role) => ({
    subject: `${name ? name + ", your" : "Your"} interview score is waiting`,
    html: shell(`
      <p>${name ? `Hi ${name},` : "Hi,"}</p>
      <p>You signed up for Axon Careers yesterday — great first step.</p>
      <p>Most people who practice${role ? ` for ${role}` : ""} see their score jump 15+ points in the first week. The key? Just five minutes a day.</p>
      <p><a href="https://axonservices.dev/practice" style="color:#14808e;font-weight:600">Practice now (5 min)</a></p>
    `),
  }),
  2: (name, role) => ({
    subject: "The #1 mistake in interviews (and how to fix it)",
    html: shell(`
      <p>${name ? `Hi ${name},` : "Hi,"}</p>
      <p>The most common interview mistake? Giving vague answers without concrete examples.</p>
      <p>When you say "I improved the process" vs "I cut processing time by 40% in 3 months" — the second one gets you hired.</p>
      <p>Axon catches this automatically and tells you exactly where to add specifics.</p>
      <p><a href="https://axonservices.dev/practice" style="color:#14808e;font-weight:600">Try it — answer one question</a></p>
    `),
  }),
  3: (name, role) => ({
    subject: `Your ${role || "interview"} readiness score`,
    html: shell(`
      <p>${name ? `Hi ${name},` : "Hi,"}</p>
      <p>After 3 practice sessions, most users know exactly where they stand — and what to fix.</p>
      <p>Your readiness score isn't a guess. It's based on 5 real dimensions hiring managers care about: clarity, relevance, specificity, confidence, and conciseness.</p>
      <p>Where do you stand?</p>
      <p><a href="https://axonservices.dev/practice" style="color:#14808e;font-weight:600">Find out in 5 minutes</a></p>
    `),
  }),
  5: (name) => ({
    subject: "People who practice get offers 3x faster",
    html: shell(`
      <p>${name ? `Hi ${name},` : "Hi,"}</p>
      <p>Here's a stat: people who practice interview answers out loud — not just think about them — get offers 3x faster.</p>
      <p>The difference? Hearing yourself say "um" 8 times is the wake-up call that fixes it. Thinking through an answer never catches that.</p>
      <p>Your Axon account is ready. Five minutes is all it takes.</p>
      <p><a href="https://axonservices.dev/practice" style="color:#14808e;font-weight:600">Practice now</a></p>
    `),
  }),
  7: (name, role) => ({
    subject: `Last chance: your ${role || "interview"} prep is waiting`,
    html: shell(`
      <p>${name ? `Hi ${name},` : "Hi,"}</p>
      <p>It's been a week since you signed up. Your practice sessions, your score, your progress — it's all ready for you.</p>
      <p>One session. Five minutes. That's the difference between walking in nervous and walking in ready.</p>
      <p><a href="https://axonservices.dev/practice" style="color:#14808e;font-weight:600">Start your first session</a></p>
      <p style="color:#989cab;font-size:13px;margin-top:20px">This is the last reminder we'll send. You know where to find us.</p>
    `),
  }),
};

function shell(body: string) {
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1b2030;line-height:1.6">
    <p style="font-size:20px;font-weight:600;color:#0c5660;margin:0 0 16px">Axon Careers</p>
    ${body}
    <p style="color:#989cab;font-size:12px;margin-top:28px">You're getting this because you signed up on Axon Careers. <a href="https://axonservices.dev/settings" style="color:#989cab">Unsubscribe</a></p>
  </div>`;
}

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!emailConfigured()) {
    return NextResponse.json({ configured: false, message: "Resend not configured" });
  }

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ configured: false, message: "Supabase not configured" });
  }

  // Get leads who haven't converted (no converted_at) and opted into emails
  const { data: leads, error } = await db
    .from("leads")
    .select("email, name, target_role, situation, created_at, converted_at")
    .is("converted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !leads) {
    return NextResponse.json({ error: error?.message || "No leads" }, { status: 500 });
  }

  const now = Date.now();
  let sent = 0;
  let skipped = 0;

  for (const lead of leads) {
    if (!lead.email || !lead.email.includes("@")) { skipped++; continue; }

    const daysSinceSignup = Math.floor((now - new Date(lead.created_at).getTime()) / 86400000);
    const dripFn = DRIP[daysSinceSignup];
    if (!dripFn) { skipped++; continue; }

    const name = lead.name || lead.email.split("@")[0];
    const role = lead.target_role || "";
    const { subject, html } = dripFn(name, role);

    const ok = await sendEmail({ to: lead.email, subject, html });
    if (ok) sent++;
    else skipped++;
  }

  return NextResponse.json({ sent, skipped, total: leads.length });
}
