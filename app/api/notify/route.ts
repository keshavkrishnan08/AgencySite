import { NextResponse } from "next/server";
import { emailConfigured, planEmail, sendEmail, welcomeEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!emailConfigured()) return NextResponse.json({ sent: false, reason: "email not configured" });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { type = "", to = "", name = "", company = "", dateLong = "" } = body ?? {};
  if (!to || !to.includes("@")) return NextResponse.json({ sent: false, reason: "no recipient" });

  const msg =
    type === "plan" ? planEmail(company, dateLong) : type === "welcome" ? welcomeEmail(name) : null;
  if (!msg) return NextResponse.json({ sent: false, reason: "unknown type" });

  const sent = await sendEmail({ to, subject: msg.subject, html: msg.html });
  return NextResponse.json({ sent });
}
