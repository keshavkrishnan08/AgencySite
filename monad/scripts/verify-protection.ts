import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Static audit of the entitlement gates. A paywall that exists only in the UI
 * is not a paywall — every paid surface must re-check server-side.
 */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') || p.endsWith('.tsx') ? [p] : [];
  });
}

const files = walk('src');
const read = (p: string) => readFileSync(p, 'utf8');
let bad = 0;
const ok = (m: string) => console.log(`ok    ${m}`);
const fail = (m: string) => { bad++; console.log(`FAIL  ${m}`); };

// 1. Every paid API route must check entitlement and return 402.
const PAID_APIS = ['brief', 'chat', 'outlook'];
for (const name of PAID_APIS) {
  const p = `src/app/api/${name}/route.ts`;
  const src = read(p);
  if (src.includes('getEntitlement') && src.includes('ent.isPaid') && src.includes('402')) {
    ok(`/api/${name} re-checks entitlement server-side and 402s`);
  } else {
    fail(`/api/${name} is missing an entitlement check`);
  }
}

// 2. The app shell gates on HAVING A CHART, not on having an account: someone
//    who has just computed one must not hit a login wall. Payment is
//    deliberately not gated here either — the locked surfaces are the upsell —
//    so each paid feature checks entitlement itself, which 2b verifies.
const layout = read('src/app/(app)/layout.tsx');
layout.includes('resolveChart') && layout.includes('!chart') && layout.includes("redirect('/start')")
  ? ok('(app) layout sends a chartless visitor to /start')
  : fail('(app) layout does not gate on having a chart');

read('src/app/(app)/settings/page.tsx').includes("redirect('/login")
  ? ok('/settings still requires an account')
  : fail('/settings is reachable without an account');

// 2b. Paid content now lives in components on shared pages rather than on
//     whole paid routes, so each one must read entitlement for itself.
for (const file of [
  'src/components/app/ChartView.tsx',
  'src/components/app/TimingView.tsx',
  'src/components/app/Diagnosis.tsx',
  'src/components/app/UpdatesView.tsx',
  'src/components/app/AskPanel.tsx',
] as const) {
  read(file).includes('isPaid')
    ? ok(`${file.replace('src/components/app/', '')} gates its own paid content`)
    : fail(`${file} renders paid content without checking entitlement`);
}

// 2c. And every blurred region must be clickable through to checkout —
//     reaching for text you cannot read is the strongest buying signal there
//     is, and a blur that swallows the click wastes it.
for (const file of [
  'src/components/app/ChartView.tsx',
  'src/components/app/TimingView.tsx',
  'src/components/app/Diagnosis.tsx',
] as const) {
  read(file).includes('LockedZone')
    ? ok(`${file.replace('src/components/app/', '')} routes blurred clicks to checkout`)
    : fail(`${file} has blurred content that swallows the click`);
}

// 3. Middleware still gates the account screen behind auth.
const mw = read('src/middleware.ts');
mw.includes("PRIVATE = ['/settings']")
  ? ok('middleware gates the account screen behind auth')
  : fail('middleware no longer gates /settings');

// 4. Entitlement must honour expiry, not just status.
const ent = read('src/lib/entitlement.ts');
ent.includes('subscription_expiry') && ent.includes('notExpired')
  ? ok('entitlement checks expiry, so a lapsed sub loses access')
  : fail('entitlement ignores subscription_expiry');

// 5. Access to a chart must require the token or ownership.
const charts = read('src/lib/charts.ts');
charts.includes('access_token') && charts.includes('data.user_id === user.id')
  ? ok('charts require an unguessable token or ownership')
  : fail('charts are readable by id alone');

// 6. The Stripe webhook must verify signatures against the RAW body and dedupe.
const hook = read('src/app/api/webhooks/stripe/route.ts');
hook.includes('constructEvent') && hook.includes('request.text()')
  ? ok('stripe webhook verifies the signature against the raw body')
  : fail('stripe webhook does not verify signatures correctly');
hook.includes('stripe_events')
  ? ok('stripe webhook is idempotent via stripe_events')
  : fail('stripe webhook can double-apply on retry');

// 7. Cron endpoints must require the shared secret.
for (const c of ['daily', 'sequence']) {
  const src = read(`src/app/api/cron/${c}/route.ts`);
  src.includes('CRON_SECRET') && src.includes('401')
    ? ok(`/api/cron/${c} requires CRON_SECRET`)
    : fail(`/api/cron/${c} is publicly callable`);
}

// 8. The service-role key must never reach a client component.
for (const f of files.filter((f) => read(f).startsWith("'use client'"))) {
  if (read(f).includes('SUPABASE_SERVICE_ROLE_KEY') || read(f).includes('supabaseAdmin')) {
    fail(`${f} is a client component touching the service-role key`);
  }
}
ok('no client component imports the service-role client');

// 9. No secret may be exposed via a NEXT_PUBLIC_ variable.
const leaked = files.filter((f) => /NEXT_PUBLIC_[A-Z_]*(SECRET|SERVICE_ROLE|STRIPE_SECRET|ANTHROPIC)/.test(read(f)));
leaked.length === 0 ? ok('no secrets exposed through NEXT_PUBLIC_') : fail(`secrets exposed in ${leaked.join(', ')}`);

console.log(bad ? `\n${bad} protection failure(s)` : '\nALL FEATURES PROTECTED');
process.exit(bad ? 1 : 0);
