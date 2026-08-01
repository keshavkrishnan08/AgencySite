import { Resend } from 'resend';
import { BRAND, DISCLAIMER, PRICING } from './brand';
import { ANIMAL_CONTENT } from './astro/chinese';
import { LIFE_PATHS } from './astro/numerology';
import type { Chart } from './astro/reading';

let cached: Resend | null = null;

function resend(): Resend {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
  cached ??= new Resend(process.env.RESEND_API_KEY);
  return cached;
}

const FROM = process.env.RESEND_FROM ?? `${BRAND.name} <hello@axon.app>`;
const SITE = BRAND.domain;

/** Inline styles only — every mail client strips <style> blocks. */
function shell(body: string, preheader: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2ede3;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2ede3;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
  <tr><td style="padding-bottom:28px;">
    <span style="font-family:Georgia,serif;font-size:21px;color:#0f1215;">${BRAND.name}<span style="color:#c2a05b;">.</span></span>
  </td></tr>
  <tr><td style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.62;color:#0f1215;">${body}</td></tr>
  <tr><td style="padding-top:36px;border-top:1px solid #c2a05b47;">
    <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#0f121577;margin:16px 0 0;">
      ${DISCLAIMER}<br>
      <a href="${SITE}/unsubscribe" style="color:#0f121577;">Unsubscribe</a>
    </p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr>
    <td style="background:#2f7050;border-radius:2px;">
      <a href="${href}" style="display:inline-block;padding:15px 32px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#f2ede3;text-decoration:none;">${label} &rarr;</a>
    </td></tr></table>`;
}

function h(text: string): string {
  return `<h1 style="font-family:Georgia,serif;font-weight:400;font-size:26px;line-height:1.2;color:#0f1215;margin:0 0 18px;">${text}</h1>`;
}

async function send(opts: { to: string; subject: string; html: string }): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping', opts.subject);
    return;
  }
  const { error } = await resend().emails.send({
    from: FROM, to: opts.to, subject: opts.subject, html: opts.html,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

export async function sendWelcomeEmail(opts: { to: string; firstName: string }) {
  await send({
    to: opts.to,
    subject: `You're in, ${opts.firstName}`,
    html: shell(
      `${h(`You&rsquo;re in, ${opts.firstName}.`)}
       <p style="margin:0 0 16px;">Your full reading is unlocked, and your first daily briefing lands tomorrow morning.</p>
       <p style="margin:0 0 16px;">Start with your blind spots. It is the section people forward to someone before they have finished reading it.</p>
       ${button(`${SITE}/reading`, 'Open my reading')}`,
      'Your full reading is unlocked.',
    ),
  });
}

export type SequenceKind = 'day0' | 'day2' | 'day3' | 'day5' | 'day7';

/**
 * The trial-ending notice.
 *
 * This is not marketing. The checkout modal promises "we email you before
 * anything is billed", California's Automatic Renewal Law requires notice
 * before a free trial converts, and ROSCA treats the gap between what the
 * buyer was told and what actually happens as the violation. It has to send
 * even to someone who has opted out of everything else.
 */
export async function sendTrialEndingEmail(ctx: {
  to: string;
  firstName: string;
  chargeDate: Date;
  amount: string;
  cadence: string;
}) {
  const when = ctx.chargeDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return send({
    to: ctx.to,
    subject: `Your free trial ends tomorrow — ${ctx.amount} on ${when}`,
    html: shell(
      `${h('Your trial ends tomorrow.')}
      <p style="margin:0 0 16px;">${ctx.firstName}, this is the heads-up we promised. Nothing has been charged yet.</p>
      <p style="margin:0 0 16px;">
        On <strong>${when}</strong> your ${BRAND.name} subscription starts at
        <strong>${ctx.amount}${ctx.cadence}</strong>. If you want to keep going, do nothing.
      </p>
      <p style="margin:0 0 16px;">
        If you would rather not, cancel before then and you will never be charged.
        It takes two taps and there is nothing to explain to anyone.
      </p>
      ${button(`${SITE}/settings`, 'Cancel my trial')}
      <p style="margin:16px 0 0;font-size:13px;color:#0f121577;">
        You are receiving this because you started a free trial. It is a billing
        notice, not marketing, so it is sent regardless of your email settings.
      </p>`,
      `Your trial ends tomorrow. ${ctx.amount} on ${when} unless you cancel.`,
    ),
  });
}

export interface SequenceContext {
  to: string;
  firstName: string;
  chart: Chart;
  chartId: string;
}

/**
 * Five emails over seven days to leads who have not converted. Personalised
 * from the chart — a generic drip against cold paid traffic is wasted spend.
 * This only works because the email is captured at step 2 of /start.
 */
export async function sendSequenceEmail(kind: SequenceKind, ctx: SequenceContext) {
  const c = ctx.chart;
  const a = c.archetype;
  const animal = ANIMAL_CONTENT[c.chinese.animal];
  const lp = LIFE_PATHS[c.lifePath];
  const link = `${SITE}/r/${ctx.chartId}`;

  const t: Record<SequenceKind, { subject: string; body: string }> = {
    day0: {
      subject: `Your reading, ${ctx.firstName} — ${a.name}`,
      body: `${h(`You are ${a.name}.`)}
        <p style="margin:0 0 16px;">${a.oneLine}</p>
        <p style="margin:0 0 16px;"><strong>Built for:</strong> ${a.builtFor}</p>
        <p style="margin:0 0 16px;">Your ${c.sunSign} Sun sets the drive, your ${c.moonSign} Moon sets what you need privately to keep functioning${c.risingSign ? `, and your ${c.risingSign} Rising is how the market reads you before you speak` : ''}.</p>
        ${button(link, 'Read my full chart')}`,
    },
    day2: {
      subject: `The blind spot in your chart, ${ctx.firstName}`,
      body: `${h('The part nobody tells you.')}
        <p style="margin:0 0 16px;">${a.blindSpot}</p>
        <p style="margin:0 0 16px;">Most people around you have noticed. Almost nobody says it, because it is bound up with the thing you are good at.</p>
        ${button(link, 'See the full section')}`,
    },
    day3: {
      subject: `How ${a.name}s should actually decide`,
      body: `${h('Your decision process.')}
        <p style="margin:0 0 16px;">${a.decisionStyle}</p>
        <p style="margin:0 0 16px;"><strong>Under pressure</strong>, your life path ${lp.number} pulls you a specific way: ${lp.underPressure}</p>
        ${button(link, 'Read the decisions section')}`,
    },
    day5: {
      subject: `Who you need beside you`,
      body: `${h('The hire your chart implies.')}
        <p style="margin:0 0 16px;">${a.hire}</p>
        <p style="margin:0 0 16px;">Your ${c.chinese.label} adds to that: ${animal.operating} You work well beside ${animal.pairsWith.join(' and ')}, and reliably grind against ${animal.clashesWith}.</p>
        ${button(link, 'See what keeps costing you')}`,
    },
    day7: {
      subject: 'Last one from me',
      body: `${h('Closing the loop.')}
        <p style="margin:0 0 16px;">${ctx.firstName}, you already know you are ${a.name}. That part is free and yours to keep.</p>
        <p style="margin:0 0 16px;">Full access adds the daily briefing, your timing windows, and an advisor who has read your chart — ${PRICING.trialDays} days free, then ${PRICING.annual.amount}/year, which is what most members choose.</p>
        ${button(link, `Start my ${PRICING.trialDays} days free`)}
        <p style="margin:0;color:#0f1215aa;font-size:14px;">No more emails from me after this one.</p>`,
    },
  };

  await send({ to: ctx.to, subject: t[kind].subject, html: shell(t[kind].body, a.oneLine) });
  return { subject: t[kind].subject };
}

export async function sendDailyBriefEmail(opts: {
  to: string; firstName: string; headline: string; body: string; action: string;
}) {
  await send({
    to: opts.to,
    subject: opts.headline,
    html: shell(
      `${h(opts.headline)}
       <p style="margin:0 0 20px;">${opts.body}</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:3px solid #c2a05b;background:#0f12150a;">
         <tr><td style="padding:16px 18px;">
           <p style="margin:0 0 6px;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#9a7b3f;">Today&rsquo;s move</p>
           <p style="margin:0;font-size:15px;">${opts.action}</p>
         </td></tr>
       </table>
       ${button(`${SITE}/updates`, 'Open today&rsquo;s briefing')}`,
      opts.action,
    ),
  });
}
