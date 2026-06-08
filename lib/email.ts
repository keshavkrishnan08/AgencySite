import "server-only";

/* Transactional email via Resend. Key-gated: no key means no-op, so the app
   runs untouched. Recurring "your interview is in 2 days" reminders also need a
   scheduler (Vercel Cron) plus server-stored plans (Supabase). See MONETIZATION.md. */

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!emailConfigured() || !opts.to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Axon Careers <onboarding@resend.dev>",
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const SHELL = (body: string) =>
  `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1b2030;line-height:1.6">
     <p style="font-size:20px;font-weight:600;color:#0c5660;margin:0 0 16px">Axon Careers</p>
     ${body}
     <p style="color:#989cab;font-size:12px;margin-top:28px">You are getting this because you started practicing on Axon Careers. A practice tool, not a guarantee of employment.</p>
   </div>`;

export function welcomeEmail(name?: string): { subject: string; html: string } {
  return {
    subject: "Welcome to Axon Careers. Here is your first tip.",
    html: SHELL(
      `<p>${name ? `Hi ${name},` : "Hi,"}</p>
       <p>You took the first step, and that is the hard part. Here is one tip for your next session: end every story with a result, ideally a number. "Cut wait times by 30%" beats "it got better."</p>
       <p>Five minutes a day is all it takes to watch your score climb.</p>
       <p><a href="https://axoncareers.com/practice" style="color:#14808e;font-weight:600">Do a quick session</a></p>`
    ),
  };
}

export function planEmail(company: string, dateLong: string): { subject: string; html: string } {
  return {
    subject: `Your prep plan for ${company || "your interview"}`,
    html: SHELL(
      `<p>Your plan is ready.</p>
       <p>Interview at <strong>${company || "your company"}</strong> on <strong>${dateLong}</strong>. We laid out exactly what to do each day so you are never guessing.</p>
       <p><a href="https://axoncareers.com/plan" style="color:#14808e;font-weight:600">Open your plan</a></p>`
    ),
  };
}
