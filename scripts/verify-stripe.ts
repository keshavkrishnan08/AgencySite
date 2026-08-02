import Stripe from 'stripe';
import { PRICING } from '../src/lib/brand';
import { PLANS, TRIAL_DAYS } from '../src/lib/stripe';

/**
 * The live Stripe account must agree with what the app tells people.
 *
 * This exists because the paywall advertised "$79/year" while Stripe charged
 * $78.99 — a number nobody would notice in review and every customer sees on
 * their statement. Quoting a price you don't charge is the kind of small
 * discrepancy that turns into a chargeback argument you lose.
 *
 * Reads only. Skips cleanly when there is no key, so it is safe in CI.
 *
 *   STRIPE_SECRET_KEY=sk_live_… npx tsx scripts/verify-stripe.ts
 */
let bad = 0;
const check = (name: string, pass: boolean, detail = '') => {
  if (!pass) bad++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(58)} ${detail}`);
};

/* ------------------------------------------------- offline: copy coherence */

// The trial is granted by the Checkout Session, not by the price — Stripe has
// no settable trial field on a Price in the current API — so the only thing
// keeping the offer honest is that every plan badge says so.
check(
  'every plan badge discloses the trial',
  TRIAL_DAYS === 0 ||
    [PRICING.weekly.badge, PRICING.annual.badge].every((b) => /free/i.test(b)),
  `trial=${TRIAL_DAYS}d · "${PRICING.weekly.badge}" / "${PRICING.annual.badge}"`,
);

check(
  'brand copy and plan copy quote the same prices',
  PRICING.weekly.amount === PLANS.weekly.price && PRICING.annual.amount === PLANS.annual.price,
  `${PRICING.weekly.amount}/${PLANS.weekly.price} · ${PRICING.annual.amount}/${PLANS.annual.price}`,
);

/* ------------------------------------------------------- live: the account */

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.log('\nskip  live gates (set STRIPE_SECRET_KEY to run them)');
} else {
  const stripe = new Stripe(key);
  const money = (cents: number) =>
    cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;

  const wanted: [keyof typeof PLANS, string, string][] = [
    ['weekly', 'axon_weekly', 'week'],
    ['annual', 'axon_annual', 'year'],
  ];

  const seen: Stripe.Price[] = [];

  for (const [plan, lookupKey, interval] of wanted) {
    const envId = process.env[PLANS[plan].priceIdEnv];
    const found = await stripe.prices
      .list({ lookup_keys: [lookupKey], limit: 1, expand: ['data.product'] })
      .then((r) => r.data[0]);

    if (!found) {
      check(`${plan}: a price is published under "${lookupKey}"`, false);
      continue;
    }
    seen.push(found);

    check(`${plan}: price is active`, found.active, found.id);
    check(`${plan}: bills every ${interval}`, found.recurring?.interval === interval, found.recurring?.interval ?? 'not recurring');
    check(
      `${plan}: charges what the app advertises`,
      money(found.unit_amount ?? -1) === PLANS[plan].price,
      `stripe ${money(found.unit_amount ?? -1)} vs copy ${PLANS[plan].price}`,
    );
    check(
      `${plan}: the env var points at this price`,
      !envId || envId === found.id,
      envId ? (envId === found.id ? envId : `${PLANS[plan].priceIdEnv}=${envId} ≠ ${found.id}`) : `${PLANS[plan].priceIdEnv} unset locally`,
    );
  }

  // Both prices must share one product, one currency and one tax behaviour or
  // Stripe refuses to offer the annual upsell at checkout.
  if (seen.length === 2) {
    const productOf = (p: Stripe.Price) =>
      typeof p.product === 'string' ? p.product : p.product.id;
    check(
      'both plans sit on one product (required for checkout upsell)',
      productOf(seen[0]) === productOf(seen[1]),
      `${productOf(seen[0])} / ${productOf(seen[1])}`,
    );
    check('both plans share a currency', seen[0].currency === seen[1].currency, seen[0].currency);
    check(
      'both plans share a tax behaviour',
      seen[0].tax_behavior === seen[1].tax_behavior,
      seen[0].tax_behavior ?? 'unspecified',
    );
  }

  // A live $0 recurring price is a way to give the product away by accident.
  const free = await stripe.prices.list({ active: true, limit: 100 });
  const zero = free.data.filter((p) => p.type === 'recurring' && p.unit_amount === 0);
  check('no active $0 recurring price exists', zero.length === 0, zero.map((p) => p.id).join(', ') || 'none');
}

console.log(bad ? `\n${bad} STRIPE MISMATCH(ES)` : '\nSTRIPE MATCHES THE APP');
process.exit(bad ? 1 : 0);
