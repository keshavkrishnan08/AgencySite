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

export function welcomeEmail(name?: string, role?: string): { subject: string; html: string } {
  return {
    subject: name ? `${name}, your interview prep is ready` : "Your interview prep is ready",
    html: SHELL(
      `<p>${name ? `Hi ${name},` : "Hi,"}</p>
       <p>You just created your Axon Careers account${role ? ` for <strong>${role}</strong>` : ""}. Here's why that matters:</p>
       <div style="background:#f7f3e9;border-radius:12px;padding:20px;margin:16px 0">
         <p style="margin:0 0 8px;font-weight:600;color:#0c5660">The data on interview practice:</p>
         <p style="margin:4px 0;font-size:14px">• People who practice out loud get offers <strong>3x faster</strong></p>
         <p style="margin:4px 0;font-size:14px">• <strong>92%</strong> of interview failures come from 5 fixable mistakes</p>
         <p style="margin:4px 0;font-size:14px">• The average person practices <strong>zero times</strong> before walking in</p>
         <p style="margin:4px 0;font-size:14px">• A 30-min interview can change your salary by <strong>$20,000+/year</strong></p>
       </div>
       <p>You already did the hardest part — starting. Your first practice session takes 5 minutes and you'll see your score instantly.</p>
       <p><a href="https://axonservices.dev/practice?autostart=1&count=3" style="display:inline-block;background:#14808e;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin:8px 0">Start your first practice →</a></p>
       <p style="font-size:13px;color:#989cab">One tip: end every answer with a result. "Cut wait times by 30%" beats "it got better." That one change can move your score 10+ points.</p>`
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
