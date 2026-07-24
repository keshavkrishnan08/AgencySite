/* Axon Careers — CAC / LTV under the shipped pricing ($9.99/mo, $19.99/3mo).
 *
 * CAC figures are carried over from this repo's own agent-based campaign
 * simulation (scripts/campaign-model.mjs, campaign-abm.mjs), which modelled
 * Meta prospecting + lookalike + retargeting against the target personas.
 * Everything else is recomputed here, because replacing the $79 annual plan
 * with a $19.99 quarterly plan changes LTV materially.
 *
 *   node scripts/cac-ltv.mjs
 *   CHURN=0.18 QSHARE=0.7 node scripts/cac-ltv.mjs
 */

const PM = 9.99;                                   // monthly plan
const PQ = 19.99;                                  // 3-month plan
const PA_OLD = 79;                                 // the annual plan we replaced
const AI = Number(process.env.AI || 1.44);         // Claude COGS / user / month
const CHURN = Number(process.env.CHURN || 0.22);   // monthly churn (job seekers)
const QSHARE = Number(process.env.QSHARE || 0.60); // share picking the 3-month plan

const CAC_SINGLE = 35.43;   // one prospecting campaign at $30/day
const CAC_BLENDED = 23.51;  // prospecting + lookalike + retargeting

const fee = (g) => g * 0.029 + 0.30;               // Stripe
const f = (n, d = 2) => Number(n).toFixed(d);
const pad = (s, n) => String(s).padEnd(n);

/* ---------------------------------------------------------------------------
 * LTV
 *
 * Monthly: geometric lifetime, 1/churn months.
 * Quarterly: you cannot churn mid-term, so the unit is a 3-month term. The
 *   renewal odds are the odds you're still searching 3 months later, which is
 *   (1-churn)^3. Expected terms = 1/(1-renew).
 * ------------------------------------------------------------------------ */

const monthsMonthly = 1 / CHURN;
const ltvMonthly = monthsMonthly * (PM - fee(PM) - AI);

const renew = Math.pow(1 - CHURN, 3);
const termsQuarterly = 1 / (1 - renew);
const netPerTerm = PQ - fee(PQ) - AI * 3;
const ltvQuarterly = termsQuarterly * netPerTerm;

const ltv = (1 - QSHARE) * ltvMonthly + QSHARE * ltvQuarterly;

// What the old annual plan would have produced, for comparison.
const ltvAnnualOld = PA_OLD - fee(PA_OLD) - AI * 12;
const ltvOldBlend = 0.4 * ltvMonthly + 0.6 * ltvAnnualOld;

console.log("\n================ CAC / LTV — shipped pricing ================\n");
console.log(`  Assumptions: ${f(CHURN * 100, 0)}% monthly churn · ${f(QSHARE * 100, 0)}% pick 3-month · $${f(AI)}/user/mo AI COGS\n`);

console.log("  LTV (net contribution after Stripe + AI)");
console.log(`    Monthly $9.99    lives ${f(monthsMonthly, 1)} mo        ->  $${f(ltvMonthly)}`);
console.log(`    3-month $19.99   ${f(termsQuarterly, 2)} terms (${f(termsQuarterly * 3, 1)} mo)  ->  $${f(ltvQuarterly)}`);
console.log(`    BLENDED                                  ->  $${f(ltv)}\n`);

console.log("  LTV : CAC");
for (const [label, cac] of [["Prospecting only", CAC_SINGLE], ["Blended channels", CAC_BLENDED]]) {
  const r = ltv / cac;
  const paybackMonthly = cac / (PM - fee(PM) - AI);
  const upfrontQ = PQ - fee(PQ);
  const verdict = r >= 3 ? "pour fuel" : r >= 1.5 ? "works, tune it" : r >= 1 ? "thin" : "underwater";
  console.log(`    ${pad(label, 18)} CAC $${f(cac)}  ->  ${f(r)}x   (${verdict})`);
  console.log(`      ${pad("", 16)} monthly buyer repays CAC in ${f(paybackMonthly, 1)} mo · 3-month buyer returns $${f(upfrontQ)} on day 0 (${f((upfrontQ / cac) * 100, 0)}% of CAC)`);
}

console.log(`\n  Versus the old $79 annual plan`);
console.log(`    Old blended LTV (60% annual): $${f(ltvOldBlend)}`);
console.log(`    New blended LTV:              $${f(ltv)}   (${f(((ltv - ltvOldBlend) / ltvOldBlend) * 100, 0)}%)`);
console.log(`    The 3-month plan trades LTV for conversion and honesty. It only`);
console.log(`    pays off if the take rate beats annual by roughly the same margin.`);

console.log("\n  What CAC you can actually afford");
for (const mult of [1, 2, 3]) {
  console.log(`    For ${mult}x LTV:CAC, CAC must be <= $${f(ltv / mult)}`);
}

console.log("\n  Levers, each applied alone to the blended $" + f(ltv) + " LTV");
const levers = [
  ["Churn 22% -> 15% (metrics page working)", () => {
    const c = 0.15, mm = 1 / c, r3 = Math.pow(1 - c, 3), t = 1 / (1 - r3);
    return (1 - QSHARE) * mm * (PM - fee(PM) - AI) + QSHARE * t * netPerTerm;
  }],
  ["AI COGS $1.44 -> $0.60 (caching + cheaper scorer)", () => {
    const a = 0.6;
    return (1 - QSHARE) * (1 / CHURN) * (PM - fee(PM) - a) + QSHARE * termsQuarterly * (PQ - fee(PQ) - a * 3);
  }],
  ["3-month plan $19.99 -> $24.99", () => {
    const p = 24.99;
    return (1 - QSHARE) * ltvMonthly + QSHARE * termsQuarterly * (p - fee(p) - AI * 3);
  }],
  ["Everyone takes the 3-month plan (QSHARE 100%)", () => ltvQuarterly],
  ["Nobody takes it (QSHARE 0%, monthly only)", () => ltvMonthly],
];
for (const [name, fn] of levers) {
  const v = fn();
  const d = ((v - ltv) / ltv) * 100;
  console.log(`    ${pad(name, 46)} $${f(v)}  (${d >= 0 ? "+" : ""}${f(d, 0)}%)  ${f(v / CAC_BLENDED)}x blended`);
}

/* ---------------------------------------------------------------------------
 * Presale: what to spend before wiring payments
 * ------------------------------------------------------------------------ */

console.log("\n\n================ Presale test (before payments) ================\n");
console.log("  You are buying one number: does this audience give you an email,");
console.log("  and does that email convert once you charge. Everything else is noise.\n");

const CPM = 14;          // Meta, US, broad 35-55 interest targeting
const CTR = 0.014;       // this repo's persona-weighted blended CTR
const LP_CONV = 0.22;    // landing -> email, for a presale page with a real offer
const cpc = CPM / 1000 / CTR;
const cpl = cpc / LP_CONV;

console.log(`  CPM $${f(CPM)} · CTR ${f(CTR * 100, 1)}% · landing->email ${f(LP_CONV * 100, 0)}%`);
console.log(`    -> CPC $${f(cpc)}   -> cost per email $${f(cpl)}\n`);

for (const budget of [300, 600, 1000]) {
  const leads = budget / cpl;
  console.log(`  $${budget} spend  ->  ~${Math.round(leads)} emails`);
  for (const conv of [0.05, 0.10, 0.20]) {
    const buyers = leads * conv;
    const rev = buyers * (QSHARE * PQ + (1 - QSHARE) * PM);
    const cacEff = buyers > 0 ? budget / buyers : Infinity;
    console.log(`      at ${f(conv * 100, 0)}% email->paid: ${f(buyers, 1)} buyers · $${f(rev)} first cash · effective CAC $${f(cacEff)} ${cacEff < ltv ? "(profitable)" : "(underwater)"}`);
  }
  console.log("");
}

console.log("  Read it this way:");
console.log(`    cost per email under $${f(ltv / 10, 2)}  ->  the audience is real, keep going`);
console.log(`    cost per email over  $${f(ltv / 4, 2)}  ->  the creative or the audience is wrong`);
console.log("    Then charge the list. Email->paid under 5% means the offer is the problem,");
console.log("    not the traffic. That is the whole point of preselling before you build billing.\n");
