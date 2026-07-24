/* Agent-based model: 1,000 users arriving from Meta ads, walked through the
 * CURRENT Axon Careers funnel at the CURRENT pricing.
 *
 *   ad impression → click → landing → onboarding → email gate (lead) →
 *   plan/ROI → create account → first scored answer → hard paywall →
 *   subscribe (monthly / 3-month / yearly)
 *
 * Six personas (weights + behaviours carried from scripts/campaign-abm.mjs,
 * this repo's own calibrated model). Each agent has intent, patience, trust,
 * and price-sensitivity that gate each step. Deterministic (seeded), so the
 * numbers are reproducible.
 *
 *   node scripts/abm-1000.mjs
 *   USERS=1000 CPM=14 node scripts/abm-1000.mjs
 */

// ---- ad economics ----
const USERS = Number(process.env.USERS || 1000);   // people who CLICK and land
const CPM = Number(process.env.CPM || 14);          // Meta, US, 35-55 interest targeting
// Blended CTR from the persona mix below drives CPC; we derive impressions from it.

// ---- pricing (must match lib/pricing.ts) ----
const PRICE = { monthly: 18.97, quarterly: 49.97, annual: 119 };
const MONTHS = { monthly: 1, quarterly: 3, annual: 12 };
const AI_COGS_MO = 1.44;                             // Claude+Stripe fee / user / mo
const fee = (g) => g * 0.029 + 0.30;                 // Stripe per charge
const CHURN = Number(process.env.CHURN || 0.22);     // monthly churn (job seekers)

// ---- personas: weight, ctr, and 0-1 traits ----
const MINDS = [
  { id: "Anxious returner",    w: .26, ctr: .018, intent: .72, patience: .62, trust: .55, price: .65 },
  { id: "Pragmatic switcher",  w: .18, ctr: .014, intent: .70, patience: .66, trust: .62, price: .50 },
  { id: "Skeptical veteran",   w: .20, ctr: .013, intent: .66, patience: .55, trust: .38, price: .55 },
  { id: "Eager climber",       w: .12, ctr: .012, intent: .80, patience: .70, trust: .68, price: .35 },
  { id: "Budget-tight parent", w: .12, ctr: .015, intent: .68, patience: .50, trust: .50, price: .85 },
  { id: "Casual scroller",     w: .12, ctr: .009, intent: .30, patience: .40, trust: .45, price: .60 },
];

// seeded RNG (no Math.random, reproducible)
let _s = 12345;
const rnd = () => (_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const chance = (p) => rnd() < p;
const pickMind = () => { let r = rnd(), c = 0; for (const m of MINDS) { c += m.w; if (r <= c) return m; } return MINDS[0]; };

// blended CTR → CPC, and impressions needed to buy USERS clicks
const blendedCTR = MINDS.reduce((s, m) => s + m.w * m.ctr, 0);
const CPC = CPM / 1000 / blendedCTR;
const impressions = USERS / blendedCTR;
const spend = (impressions / 1000) * CPM;

// ---- funnel step probabilities, gated by persona traits ----
// Each returns whether the agent advances. Tuned to the current product:
// onboarding is a 15-step quiz (some drop), email gate before the plan reveal,
// account, then ONE free scored answer, then the hard paywall.
const step = {
  // land -> start the onboarding quiz
  onbStart: (m) => chance(0.86 * (0.6 + 0.4 * m.intent)),
  // finish the quiz (15 taps). Longer flow, but one-tap screens + progress bar.
  onbFinish: (m) => chance(0.72 * (0.5 + 0.5 * m.patience)),
  // email gate: trade an email to see the plan (high — it's the value moment)
  emailGate: (m) => chance(0.80 * (0.55 + 0.45 * m.trust)),
  // create an account after the plan/ROI
  account: (m) => chance(0.74 * (0.5 + 0.5 * m.intent)),
  // run the first (free) scored answer — the activation aha
  firstAnswer: (m) => chance(0.82 * (0.5 + 0.5 * m.intent)),
  // hit the paywall and convert. Price sensitivity + trust + intent gate it.
  subscribe: (m) => chance(0.30 * (0.35 + 0.65 * m.intent) * (0.5 + 0.5 * m.trust) * (1 - 0.45 * m.price)),
};

// plan choice at the paywall: 3-month is promoted/default; price-sensitive lean
// monthly; low-price-sensitivity + high-intent lean yearly.
function choosePlan(m) {
  const r = rnd();
  if (m.price > 0.7) return r < 0.6 ? "monthly" : "quarterly";           // budget-tight
  if (m.price < 0.45 && m.intent > 0.7) return r < 0.45 ? "annual" : "quarterly"; // committed
  // default mix, quarterly-weighted
  return r < 0.2 ? "monthly" : r < 0.78 ? "quarterly" : "annual";
}

// LTV (net contribution): monthly = geometric lifetime; term plans = expected
// renewals of a prepaid term. Matches scripts/cac-ltv.mjs.
function ltvOf(plan) {
  const net1 = PRICE[plan] - fee(PRICE[plan]) - AI_COGS_MO * MONTHS[plan];
  if (plan === "monthly") return (1 / CHURN) * (PRICE.monthly - fee(PRICE.monthly) - AI_COGS_MO);
  const renew = Math.pow(1 - CHURN, MONTHS[plan]);
  const terms = 1 / (1 - renew);
  return terms * net1;
}

// ---- run ----
const F = { land: 0, onbStart: 0, onbFinish: 0, email: 0, account: 0, firstAnswer: 0, paid: 0 };
const planCount = { monthly: 0, quarterly: 0, annual: 0 };
let firstCash = 0, totalLTV = 0;
const leadByPersona = {}, paidByPersona = {};

for (let i = 0; i < USERS; i++) {
  const m = pickMind();
  F.land++;
  if (!step.onbStart(m)) continue;
  F.onbStart++;
  if (!step.onbFinish(m)) continue;
  F.onbFinish++;
  if (!step.emailGate(m)) continue;
  F.email++; leadByPersona[m.id] = (leadByPersona[m.id] || 0) + 1;  // LEAD captured here
  if (!step.account(m)) continue;
  F.account++;
  if (!step.firstAnswer(m)) continue;
  F.firstAnswer++;
  if (!step.subscribe(m)) continue;
  F.paid++; paidByPersona[m.id] = (paidByPersona[m.id] || 0) + 1;
  const plan = choosePlan(m);
  planCount[plan]++;
  firstCash += PRICE[plan] - fee(PRICE[plan]);
  totalLTV += ltvOf(plan);
}

// ---- report ----
const f = (n, d = 2) => Number(n).toFixed(d);
const pct = (n, base) => base ? f((n / base) * 100, 1) + "%" : "—";
const CAC = F.paid ? spend / F.paid : Infinity;
const CPL = F.email ? spend / F.email : Infinity;   // cost per captured lead
const blendedLTV = F.paid ? totalLTV / F.paid : 0;

console.log(`\n================ ABM: ${USERS} Meta-ad clicks through the funnel ================\n`);
console.log("  Ad economics");
console.log(`    Blended CTR ${f(blendedCTR * 100, 2)}% · CPM $${f(CPM)}  ->  CPC $${f(CPC)}`);
console.log(`    ${Math.round(impressions).toLocaleString()} impressions bought ${USERS} clicks for $${f(spend)} total spend\n`);

console.log("  Funnel (of clicks)");
const rows = [
  ["Landed", F.land],
  ["Started onboarding", F.onbStart],
  ["Finished onboarding", F.onbFinish],
  ["Gave email (LEAD)", F.email],
  ["Created account", F.account],
  ["Ran first scored answer", F.firstAnswer],
  ["Subscribed (PAID)", F.paid],
];
let prev = USERS;
for (const [label, n] of rows) {
  console.log(`    ${label.padEnd(26)} ${String(n).padStart(4)}  ${pct(n, USERS).padStart(6)} of clicks   (${pct(n, prev)} step)`);
  prev = n;
}

console.log("\n  Plan mix (of paid)");
for (const k of ["monthly", "quarterly", "annual"]) {
  console.log(`    ${k.padEnd(10)} ${String(planCount[k]).padStart(3)}  ${pct(planCount[k], F.paid)}  ($${PRICE[k]})`);
}

console.log("\n  Unit economics");
console.log(`    Cost per lead (email):     $${f(CPL)}`);
console.log(`    CAC (cost per subscriber): $${f(CAC)}`);
console.log(`    First-cash / subscriber:   $${f(F.paid ? firstCash / F.paid : 0)}`);
console.log(`    Blended LTV / subscriber:  $${f(blendedLTV)}`);
console.log(`    LTV : CAC                  ${f(blendedLTV / CAC)}x   ${blendedLTV / CAC >= 3 ? "(pour fuel)" : blendedLTV / CAC >= 1.5 ? "(works, tune it)" : blendedLTV / CAC >= 1 ? "(thin)" : "(underwater)"}`);
console.log(`    Payback: 3-mo & yearly prepay on day 0; monthly repays over ~${f((PRICE.monthly - fee(PRICE.monthly) - AI_COGS_MO) > 0 ? CAC / (PRICE.monthly - fee(PRICE.monthly) - AI_COGS_MO) : 0, 1)} mo`);

console.log("\n  First-order economics");
console.log(`    Total ad spend:   $${f(spend)}`);
console.log(`    Day-0 cash:       $${f(firstCash)}   (${f((firstCash / spend) * 100, 0)}% of spend recovered immediately)`);
console.log(`    Modelled LTV:     $${f(totalLTV)}   (${f(totalLTV / spend, 2)}x spend over subscription lifetimes)`);

console.log("\n  Leads captured (email) by persona — the presale list");
for (const m of MINDS) {
  const l = leadByPersona[m.id] || 0, pd = paidByPersona[m.id] || 0;
  console.log(`    ${m.id.padEnd(20)} ${String(l).padStart(3)} leads · ${String(pd).padStart(2)} paid`);
}
console.log("\n  Note: rates are modelled from persona traits, not measured. Treat as a");
console.log("  planning estimate; the live Mixpanel funnel will replace these once ads run.\n");
