import { createHmac, randomUUID } from 'node:crypto';

/**
 * End-to-end test of the live Stripe webhook.
 *
 * The endpoint's rejection paths can be probed from anywhere — post junk and
 * you get a 400. Proving the *success* path needs a payload signed with the
 * real endpoint secret, which is the whole point of the signature: nobody who
 * lacks the secret can make this route do anything.
 *
 * Defaults to `invoice.paid`, which the handler acknowledges and ignores
 * (`default: break`). That exercises transport, signature verification, the
 * Supabase connection and the idempotency insert without touching anybody's
 * entitlement. Nothing here mutates a subscription.
 *
 *   STRIPE_WEBHOOK_SECRET=whsec_… npx tsx scripts/test-webhook.ts
 *   STRIPE_WEBHOOK_SECRET=whsec_… npx tsx scripts/test-webhook.ts http://localhost:3000
 */
const BASE = process.argv[2] ?? 'https://axonservices.dev';
const URL_ = `${BASE.replace(/\/$/, '')}/api/webhooks/stripe`;
const SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!SECRET) {
  console.error(
    'STRIPE_WEBHOOK_SECRET is not set.\n' +
      'Find it in the Stripe Dashboard under Developers → Webhooks → your endpoint → Signing secret.\n' +
      'It is the same value Vercel holds, and it starts with whsec_.',
  );
  process.exit(1);
}

let bad = 0;
const check = (name: string, pass: boolean, detail = '') => {
  if (!pass) bad++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(50)} ${detail}`);
};

/** Exactly how Stripe signs a webhook: HMAC-SHA256 over `timestamp.payload`. */
function sign(payload: string, secret: string, timestamp: number): string {
  const v1 = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${v1}`;
}

async function post(payload: string, header: string) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': header },
    body: payload,
  });
  const body = await res.text();
  return { status: res.status, body: body.slice(0, 200) };
}

/** A minimal but structurally real Stripe event envelope. */
function event(id: string, type: string) {
  return JSON.stringify({
    id,
    object: 'event',
    api_version: '2026-06-24.dahlia',
    created: Math.floor(Date.now() / 1000),
    livemode: true,
    type,
    data: { object: { id: `in_test_${id}`, object: 'invoice', customer: null } },
  });
}

console.log(`POST ${URL_}\n`);

const eventId = `evt_probe_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
const payload = event(eventId, 'invoice.paid');
const now = Math.floor(Date.now() / 1000);

// 1. The real thing: a correctly signed event must be accepted.
const first = await post(payload, sign(payload, SECRET, now));
check('a correctly signed event is accepted', first.status === 200, `${first.status} ${first.body}`);

// 2. Replaying the same event id must be recognised, not processed twice. A
//    webhook that is not idempotent double-grants access on Stripe's retries.
const replay = await post(payload, sign(payload, SECRET, now));
check(
  'replaying the same event id is deduplicated',
  replay.status === 200 && /duplicate/.test(replay.body),
  `${replay.status} ${replay.body}`,
);

// 3. A payload altered after signing must be refused.
const tampered = payload.replace('invoice.paid', 'invoice.paidX');
const forged = await post(tampered, sign(payload, SECRET, now));
check('a tampered payload is rejected', forged.status === 400, `${forged.status} ${forged.body}`);

// 4. An old timestamp must fall outside Stripe's replay window (default 5 min).
const stale = Math.floor(Date.now() / 1000) - 60 * 60;
const old = await post(payload, sign(payload, SECRET, stale));
check('a stale timestamp is rejected', old.status === 400, `${old.status} ${old.body}`);

// 5. Signed with the wrong secret — the case that matters if the secret in
//    Vercel ever drifts from the one on the endpoint.
const wrong = await post(payload, sign(payload, 'whsec_definitely_not_the_secret', now));
check('a wrong signing secret is rejected', wrong.status === 400, `${wrong.status} ${wrong.body}`);

console.log(
  bad
    ? `\n${bad} WEBHOOK FAILURE(S) — payments may not grant access`
    : '\nWEBHOOK IS LIVE, SIGNED AND IDEMPOTENT',
);
process.exit(bad ? 1 : 0);
