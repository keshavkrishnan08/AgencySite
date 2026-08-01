import { readFileSync } from 'node:fs';

/**
 * Subscription-compliance gates.
 *
 * The FTC's June 2026 action against Genesis Tech — which named Obrio/Nebula,
 * this product's direct competitor — turned on three things: marketing a paid
 * auto-renewal as "free", hiding the recurring terms until after billing
 * details were taken, and omitting cancellation from the site. These checks
 * exist so none of the three can quietly reappear in a refactor.
 */
const read = (p: string) => readFileSync(p, 'utf8');
let bad = 0;
const ok = (m: string) => console.log(`ok    ${m}`);
const fail = (m: string) => { bad++; console.log(`FAIL  ${m}`); };

// 1. Terms disclosed BEFORE billing details are collected. ROSCA requires the
//    disclosure to be unavoidable, not behind a link.
const modal = read('src/components/TrialModal.tsx');
modal.includes('What happens next') && modal.includes('Billing starts')
  ? ok('trial terms are disclosed in the checkout modal, before card entry')
  : fail('checkout does not disclose the recurring charge before billing details');
modal.includes('Due today') && modal.includes('$0.00')
  ? ok('the amount due today is stated explicitly')
  : fail('the amount due today is not stated');
/^(?!.*\bfree\b.*forever).*$/s.test(modal) && !/no charge ever/i.test(modal)
  ? ok('checkout does not describe a paid auto-renewal as free-forever')
  : fail('checkout overstates what is free');

// 2. Cancellation is a named action, reachable, and deep-linked.
const settings = read('src/components/SettingsPanel.tsx');
/Cancel (my trial|subscription)/.test(settings)
  ? ok('settings offers a named cancel action, not just "manage billing"')
  : fail('there is no explicitly labelled cancel action');
settings.includes('mailto')
  ? ok('a human fallback exists if the portal fails')
  : fail('no fallback route to cancel if the billing portal errors');

const portal = read('src/app/api/portal/route.ts');
portal.includes('subscription_cancel')
  ? ok('cancel intent deep-links into Stripe’s cancellation flow')
  : fail('cancel drops the user on a dashboard to hunt for it');
portal.includes('nothing to cancel')
  ? ok('users with no subscription get a plain answer, not an error')
  : fail('cancelling can dead-end on an error');

read('src/components/Chrome.tsx').includes('Cancel subscription')
  ? ok('cancellation is linked from the global footer')
  : fail('cancellation is not reachable outside the account screen');

// 3. Notice before a trial converts. Promised in the modal; required in CA.
modal.includes('We email you before anything is billed')
  ? ok('the modal promises pre-billing notice')
  : ok('no pre-billing promise made in the modal');
const cronExists = (() => { try { read('src/app/api/cron/trial-reminder/route.ts'); return true; } catch { return false; } })();
cronExists
  ? ok('a trial-ending notice cron exists to honour that promise')
  : fail('the modal promises a pre-billing email that nothing sends');
if (cronExists) {
  const cron = read('src/app/api/cron/trial-reminder/route.ts');
  cron.includes('CRON_SECRET') ? ok('trial-reminder cron requires CRON_SECRET') : fail('trial-reminder cron is unauthenticated');
  cron.includes('email_events') ? ok('trial notice is idempotent, so a retry cannot double-send') : fail('trial notice can double-send');
}
JSON.parse(read('vercel.json')).crons.some((c: { path: string }) => c.path === '/api/cron/trial-reminder')
  ? ok('trial-reminder cron is scheduled in vercel.json')
  : fail('trial-reminder cron exists but is never scheduled');

console.log(bad ? `\n${bad} BILLING COMPLIANCE FAILURE(S)` : '\nBILLING COMPLIANCE OK');
process.exit(bad ? 1 : 0);
