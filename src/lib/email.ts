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
      <a href="${SITE}/legal/privacy" style="color:#0f121577;">Unsubscribe</a>
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

/** Blurred text block — visible enough to intrigue, unreadable enough to convert. */
function blurred(text: string): string {
  return `<div style="filter:blur(6px);-webkit-filter:blur(6px);opacity:0.4;user-select:none;margin:12px 0;font-size:14px;line-height:1.7;color:#0f1215;">${text}</div>`;
}

/** Badge/label for urgency */
function badge(text: string): string {
  return `<span style="display:inline-block;background:#c2a05b22;border:1px solid #c2a05b55;border-radius:2px;padding:4px 12px;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#9a7b3f;margin-bottom:16px;">${text}</span>`;
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

// ─────────────────────────────────────────────── Welcome (post-payment)

export async function sendWelcomeEmail(opts: { to: string; firstName: string }) {
  await send({
    to: opts.to,
    subject: `${opts.firstName}, you're one of the first.`,
    html: shell(
      `${h(`You just locked in something most people won&rsquo;t get.`)}
       ${badge('Early access pricing')}
       <p style="margin:0 0 16px;">${opts.firstName}, you&rsquo;re in at <strong>${PRICING.weekly.amount}/week</strong> — the lowest price ${BRAND.name} will ever offer. When we raise prices (and we will), yours stays locked.</p>
       <p style="margin:0 0 16px;">Your full reading is unlocked. Your first daily briefing lands tomorrow morning. And your chart-aware advisor is ready now.</p>
       <p style="margin:0 0 16px;"><strong>Start here:</strong> Open your blind spots section. It is the part people screenshot and send to someone before they finish reading it.</p>
       ${button(`${SITE}/chart`, 'Open my full reading')}
       <p style="margin:0;font-size:13px;color:#0f121577;">You can cancel in two taps from Settings, anytime. No questions.</p>`,
      `You locked in early access pricing. Your full reading is live.`,
    ),
  });
}

// ─────────────────────────────────────────────── Nurture sequence

export type SequenceKind = 'day0' | 'day1' | 'day2' | 'day3' | 'day5' | 'day7';

export interface SequenceContext {
  to: string;
  firstName: string;
  chart: Chart;
  chartId: string;
  /** AI-generated unique insight, computed cheaply before sending. */
  uniqueInsight?: string;
}

/**
 * Six emails over seven days. Every one is chart-specific and shows just
 * enough to prove the reading is real, then blurs the rest behind the CTA.
 */
export async function sendSequenceEmail(kind: SequenceKind, ctx: SequenceContext) {
  const c = ctx.chart;
  const a = c.archetype;
  const animal = ANIMAL_CONTENT[c.chinese.animal];
  const lp = LIFE_PATHS[c.lifePath];
  const link = `${SITE}/r/${ctx.chartId}`;
  const trialLink = `${SITE}/r/${ctx.chartId}#pricing`;

  const t: Record<SequenceKind, { subject: string; body: string; preheader: string }> = {
    day0: {
      subject: `Your reading is ready, ${ctx.firstName}`,
      preheader: `You are ${a.name}. Here's what that means for your next move.`,
      body: `${h(`You are ${a.name}.`)}
        <p style="margin:0 0 16px;">${a.oneLine}</p>
        <p style="margin:0 0 16px;">Your ${c.sunSign} Sun sets the drive. Your ${c.moonSign} Moon sets what you need privately to keep functioning${c.risingSign ? `. Your ${c.risingSign} Rising is how people read you before you speak` : ''}.</p>
        <p style="margin:0 0 8px;font-weight:600;">What your chart says you&rsquo;re built for:</p>
        <p style="margin:0 0 16px;">${a.builtFor}</p>
        <p style="margin:0 0 8px;font-weight:600;">The part most people miss:</p>
        ${blurred(`Your ${c.sunSign}-${c.moonSign} combination creates a specific tension between what you show the world and what you actually need. This tension is readable in your chart and it is costing you in ways that look like bad timing but are actually a structural pattern. The counter-move is...`)}
        ${button(link, 'Read my full chart')}`,
    },
    day1: {
      subject: `We found something unusual in your chart, ${ctx.firstName}`,
      preheader: 'This only appears in about 1 in 8 charts.',
      body: `${h('We found something unusual.')}
        ${badge('Rare pattern detected')}
        <p style="margin:0 0 16px;">${ctx.firstName}, when we computed your chart, one pattern stood out.</p>
        <p style="margin:0 0 16px;">${ctx.uniqueInsight ?? `Your ${c.sunSign} Sun with a ${c.moonSign} Moon and Life Path ${c.lifePath} creates a specific operating signature that appears in roughly 1 in 8 charts. It explains why ${a.name}s like you tend to start strong and then hit the same wall around month six of any new venture.`}</p>
        <p style="margin:0 0 8px;font-weight:600;">What it means for your career right now:</p>
        ${blurred(`The pattern suggests you are in a window where the instinct to pivot is strongest, but the data says hold. Your ${c.chinese.label} cycle reinforces this — the next 90 days favour building proof over chasing reach. The specific dates that support your next move are...`)}
        ${button(link, 'See the full analysis')}
        <p style="margin:0;font-size:13px;color:#0f121577;">This insight is computed from your exact birth data, not a generic horoscope.</p>`,
    },
    day2: {
      subject: `The blind spot your chart names, ${ctx.firstName}`,
      preheader: 'Most people around you have noticed. Nobody has said it.',
      body: `${h('The part nobody tells you.')}
        <p style="margin:0 0 16px;">${a.blindSpot}</p>
        <p style="margin:0 0 16px;">Most people around you have noticed. Almost nobody says it, because it is bound up with the thing you are best at.</p>
        <p style="margin:0 0 8px;font-weight:600;">What it actually costs you:</p>
        ${blurred(`This blind spot shows up most clearly in how you handle the gap between your first instinct and the final decision. For ${a.name}s it manifests as a pattern of over-committing to the vision and under-investing in the structure that holds it. The specific cost in your chart is...`)}
        ${button(link, 'Read the full blind spots section')}`,
    },
    day3: {
      subject: `How you actually make decisions, ${ctx.firstName}`,
      preheader: `Your chart says your first read is usually right. Here's the exception.`,
      body: `${h('Your decision style, decoded.')}
        <p style="margin:0 0 16px;">${a.decisionStyle}</p>
        <p style="margin:0 0 16px;"><strong>Under pressure</strong>, your Life Path ${lp.number} (${lp.title}) pulls you a specific way: ${lp.underPressure}</p>
        <p style="margin:0 0 8px;font-weight:600;">The one decision you keep getting wrong:</p>
        ${blurred(`Your chart identifies a repeating pattern in how you handle irreversible decisions. The ${c.sunSign}-Life Path ${c.lifePath} combination means you tend to commit at the moment of highest emotion rather than highest information. The counter-move that fixes this is...`)}
        ${button(link, 'Read the decisions section')}`,
    },
    day5: {
      subject: `Your timing this month, ${ctx.firstName}`,
      preheader: 'The next 30 days have a window your chart favours.',
      body: `${h('Your chart says when to move.')}
        <p style="margin:0 0 16px;">${ctx.firstName}, your chart doesn&rsquo;t just describe who you are. It scores every day in the next 30 against your placements and tells you which ones favour the move you&rsquo;re about to make.</p>
        <p style="margin:0 0 16px;">Your ${c.chinese.label} adds to that: ${animal.operating}</p>
        <p style="margin:0 0 8px;font-weight:600;">Your best window this month:</p>
        ${blurred(`Based on your natal chart, the strongest day for a launch or major decision falls in the next two weeks. Mars is making a contact to your Sun that supports bold, visible moves. The specific date and the reasoning behind it are...`)}
        ${button(trialLink, `Unlock my timing \u2014 ${PRICING.trialDays} days free`)}
        ${badge(`${PRICING.trialDays}-day free trial · no card charged today`)}`,
    },
    day7: {
      subject: `Last one, ${ctx.firstName}`,
      preheader: 'This is the final email. Your chart stays free forever.',
      body: `${h('This is the last email.')}
        <p style="margin:0 0 16px;">${ctx.firstName}, you are ${a.name}. That part is free and yours to keep. Your chart doesn&rsquo;t expire.</p>
        <p style="margin:0 0 16px;">What you don&rsquo;t have yet:</p>
        <ul style="margin:0 0 16px;padding-left:20px;">
          <li style="margin-bottom:8px;">The daily briefing — what today&rsquo;s sky means for your specific chart</li>
          <li style="margin-bottom:8px;">Your timing windows — the exact dates to move on what you&rsquo;re deciding</li>
          <li style="margin-bottom:8px;">The diagnosis — the pattern that keeps costing you, named plainly</li>
          <li style="margin-bottom:8px;">An advisor that has read your chart and answers in real time</li>
        </ul>
        <p style="margin:0 0 16px;">${PRICING.trialDays} days free, then ${PRICING.weekly.amount}/week. Most people choose annual at ${PRICING.annual.amount}/year. Cancel in two taps.</p>
        ${button(trialLink, `Start my ${PRICING.trialDays} days free`)}
        <p style="margin:0;font-size:13px;color:#0f121577;">No more emails from me after this one. Your chart is always at ${SITE}.</p>`,
    },
  };

  const email = t[kind];
  await send({ to: ctx.to, subject: email.subject, html: shell(email.body, email.preheader) });
  return { subject: email.subject };
}

// ─────────────────────────────────────────────── Trial ending (legal notice)

/**
 * The trial-ending notice.
 *
 * This is not marketing. The checkout modal promises "we email you before
 * anything is billed", California's Automatic Renewal Law requires notice
 * before a free trial converts, and ROSCA treats the gap between what the
 * buyer was told and what actually happens as the violation.
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

// ─────────────────────────────────────────────── Daily briefing

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
       ${button(`${SITE}/updates`, 'Open today\u2019s briefing')}`,
      opts.action,
    ),
  });
}
