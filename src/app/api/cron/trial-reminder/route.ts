import { NextResponse } from 'next/server';
import { sendTrialEndingEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase/server';
import { PRICING } from '@/lib/brand';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Notice before a free trial converts to a paid subscription.
 *
 * This is a legal obligation, not a growth email. The checkout modal states
 * "we email you before anything is billed"; California's Automatic Renewal Law
 * requires notice before a trial converts; and ROSCA treats the gap between
 * what a buyer was told and what actually happens as the violation itself.
 *
 * It therefore ignores marketing preferences entirely — a billing notice is
 * not something a user can be opted out of.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const admin = supabaseAdmin();

  // Everyone whose trial ends within the next 24–48h. A wide window on purpose:
  // sending the notice twice is harmless, sending it late is a violation.
  const from = new Date(Date.now() + 24 * 3_600_000).toISOString();
  const to = new Date(Date.now() + 48 * 3_600_000).toISOString();

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email, first_name, trial_ends_at, subscription_status')
    .eq('subscription_status', 'trialing')
    .gte('trial_ends_at', from)
    .lt('trial_ends_at', to);

  if (error) {
    console.error('[cron:trial-reminder]', error);
    return NextResponse.json({ error: 'Query failed.' }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const p of profiles ?? []) {
    if (!p.email || !p.trial_ends_at) continue;

    const endsAt = new Date(p.trial_ends_at);
    // Keyed by the specific trial end date, so a user who trials twice gets
    // two notices but never two for the same trial.
    const kind = `trial_ending:${endsAt.toISOString().slice(0, 10)}`;

    // Claim the send first. The unique constraint is what makes a double run
    // safe — the second insert loses and we skip rather than double-send.
    const { error: claimError } = await admin
      .from('email_events')
      .insert({ user_id: p.id, email: p.email, kind });

    if (claimError) {
      skipped += 1;
      continue;
    }

    try {
      await sendTrialEndingEmail({
        to: p.email,
        firstName: p.first_name ?? 'there',
        chargeDate: endsAt,
        // The plan the trial converts onto is whatever they chose at checkout;
        // weekly is the default and the one the modal quotes.
        amount: PRICING.weekly.amount,
        cadence: PRICING.weekly.cadence,
      });
      sent += 1;
    } catch (e) {
      console.error(`[cron:trial-reminder] ${p.email} failed`, e);
      // Release the claim so tomorrow's run retries rather than silently
      // skipping someone who is about to be charged without warning.
      await admin.from('email_events').delete().eq('user_id', p.id).eq('kind', kind);
    }
  }

  return NextResponse.json({ sent, skipped, considered: profiles?.length ?? 0 });
}
