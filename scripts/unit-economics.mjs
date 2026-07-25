/* Full unit economics for a user ENTERING THE APP (the paid path, not the
 * presale email list). Assumes payments are wired and live.
 *
 *   ad → landing → onboarding → account → first scored answer → paywall → paid
 *
 * Computes per-plan LTV, blended LTV, CAC across channel scenarios, LTV:CAC,
 * payback, gross margin, day-0 cash, and a churn × conversion sensitivity grid.
 * All rates carried from this repo's ABM (scripts/abm-1000.mjs) and campaign
 * model. Deterministic; edit the knobs at the top.
 *
 *   node scripts/unit-economics.mjs
 *   CHURN=0.18 node scripts/unit-economics.mjs
 */

// ── pricing (matches lib/pricing.ts) ──
const PRICE = { monthly: 18.97, quarterly: 49.97, annual: 119 };
const MONTHS = { monthly: 1, quarterly: 3, annual: 12 };
// plan mix among PAYERS (from the ABM funnel; quarterly is the promoted default)
const MIX = { monthly: 0.18, quarterly: 0.62, annual: 0.20 };

// ── costs ──
const AI = Number(process.env.AI || 1.44);         // Claude + infra / user / month
const stripeFee = (g) => g * 0.029 + 0.30;         // per charge
const CHURN = Number(process.env.CHURN || 0.22);   // monthly churn (job seekers)

// ── acquisition ──
const CPM = Number(process.env.CPM || 14);
const CTR = Number(process.env.CTR || 0.0141);     // blended, from persona mix
const CPC = CPM / 1000 / CTR;

// ── the in-app funnel (landing → paid), step conversions ──
const FUNNEL = [
  ["Land on site",              1.000],
  ["Start onboarding",          0.727],
  ["Finish onboarding",         0.543],  // of previous
  ["Create account",            0.400],
  ["Run first scored answer",   0.633],
  ["Hit paywall → subscribe",   0.130],
];

const f = (n, d = 2) => "$" + Number(n).toFixed(d);
const x = (n) => Number(n).toFixed(2) + "x";
const pc = (n) => (n * 100).toFixed(1) + "%";
const pad = (s, n) => String(s).padEnd(n);

// ── LTV per plan (net contribution after Stripe + AI COGS) ──
function ltv(plan) {
  const gross = PRICE[plan];
  const netPerTerm = gross - stripeFee(gross) - AI * MONTHS[plan];
  if (plan === "monthly") {
    const lifeMonths = 1 / CHURN;
    return { netPerTerm, lifeMonths, terms: lifeMonths, ltv: lifeMonths * netPerTerm };
  }
  const renew = Math.pow(1 - CHURN, MONTHS[plan]); // still searching next term?
  const terms = 1 / (1 - renew);
  return { netPerTerm, lifeMonths: terms * MONTHS[plan], terms, ltv: terms * netPerTerm };
}

const L = Object.fromEntries(Object.keys(PRICE).map((p) => [p, ltv(p)]));
const blendedLTV = Object.keys(PRICE).reduce((s, p) => s + MIX[p] * L[p].ltv, 0);
const blendedGross = Object.keys(PRICE).reduce((s, p) => s + MIX[p] * PRICE[p], 0);
const blendedMonths = Object.keys(PRICE).reduce((s, p) => s + MIX[p] * L[p].lifeMonths, 0);

// ── funnel: landing → paid ──
let rate = 1;
const steps = FUNNEL.map(([label, step], i) => {
  if (i > 0) rate *= step;
  return { label, step, cum: i === 0 ? 1 : rate };
});
const landToPaid = steps[steps.length - 1].cum;

// ── CAC scenarios (cost to acquire one PAYING user) ──
// CAC = cost per landing click / (landing→paid conversion).
const scenarios = [
  ["Cold, single campaign",  CPC, landToPaid],
  ["+ lookalike (warmer)",   CPC * 0.85, landToPaid * 1.4],
  ["+ retargeting, tuned",   CPC * 0.72, landToPaid * 2.1],
];

console.log("\n================ UNIT ECONOMICS — a user entering the app ================\n");
console.log(`  Prices: monthly ${f(PRICE.monthly)} · 3-month ${f(PRICE.quarterly)} · yearly ${f(PRICE.annual)}`);
console.log(`  Payer plan mix: ${pc(MIX.monthly)} monthly · ${pc(MIX.quarterly)} 3-month · ${pc(MIX.annual)} yearly`);
console.log(`  Monthly churn ${pc(CHURN)} · AI COGS ${f(AI)}/user/mo · Stripe 2.9% + $0.30\n`);

console.log("  ── LTV per plan (net contribution) ──");
console.log(`  ${pad("plan", 10)} ${pad("gross", 9)} ${pad("net/term", 10)} ${pad("exp. life", 11)} ${pad("LTV", 9)} margin`);
for (const p of ["monthly", "quarterly", "annual"]) {
  const l = L[p];
  const margin = (l.netPerTerm / PRICE[p]);
  console.log(`  ${pad(p, 10)} ${pad(f(PRICE[p]), 9)} ${pad(f(l.netPerTerm), 10)} ${pad(l.lifeMonths.toFixed(1) + " mo", 11)} ${pad(f(l.ltv), 9)} ${pc(margin)}`);
}
console.log(`\n  BLENDED LTV: ${f(blendedLTV)}   (avg life ${blendedMonths.toFixed(1)} mo, first charge ${f(blendedGross)})\n`);

console.log("  ── Funnel: landing → paid ──");
let prev = 1;
for (const s of steps) {
  const stepPc = prev ? s.cum / prev : 0;
  console.log(`  ${pad(s.label, 26)} ${pad(pc(s.cum) + " of landing", 18)} ${s.label === "Land on site" ? "" : "(" + pc(stepPc) + " step)"}`);
  prev = s.cum;
}
console.log(`  → ${pc(landToPaid)} of everyone who lands becomes a paying subscriber\n`);

console.log("  ── Acquisition & CAC ──");
console.log(`  CPM ${f(CPM)} · CTR ${pc(CTR)} → CPC ${f(CPC)} per landing click\n`);
console.log(`  ${pad("channel scenario", 26)} ${pad("land→paid", 11)} ${pad("CAC", 9)} ${pad("LTV:CAC", 9)} ${pad("payback", 12)} verdict`);
for (const [name, cpc, conv] of scenarios) {
  const c = Math.min(conv, 0.5);
  const cac = cpc / c;
  const ratio = blendedLTV / cac;
  // payback: 3-mo & yearly prepay (day 0). monthly repays over net/mo.
  const monthlyNet = PRICE.monthly - stripeFee(PRICE.monthly) - AI;
  const prepaidShare = MIX.quarterly + MIX.annual;
  const day0 = Object.keys(PRICE).reduce((s, p) => s + MIX[p] * (PRICE[p] - stripeFee(PRICE[p])), 0);
  const payback = day0 >= cac ? "day 0" : ((cac - day0) / (blendedLTV / blendedMonths)).toFixed(1) + " mo";
  const verdict = ratio >= 3 ? "pour fuel" : ratio >= 1.5 ? "works, tune" : ratio >= 1 ? "thin" : "underwater";
  console.log(`  ${pad(name, 26)} ${pad(pc(c), 11)} ${pad(f(cac), 9)} ${pad(x(ratio), 9)} ${pad(payback, 12)} ${verdict}`);
}

// day-0 cash recovery vs CAC (cold)
const day0 = Object.keys(PRICE).reduce((s, p) => s + MIX[p] * (PRICE[p] - stripeFee(PRICE[p])), 0);
const cacCold = CPC / landToPaid;
console.log(`\n  Day-0 cash per subscriber: ${f(day0)}  →  recovers ${pc(day0 / cacCold)} of cold CAC immediately`);
console.log(`  (3-month + yearly are prepaid, so ${pc(MIX.quarterly + MIX.annual)} of payers pay their whole term up front)\n`);

console.log("  ── Sensitivity: blended LTV by churn × plan mix ──");
const churns = [0.15, 0.22, 0.30];
const mixes = [
  ["monthly-heavy (40/45/15)", { monthly: 0.40, quarterly: 0.45, annual: 0.15 }],
  ["current (18/62/20)",       MIX],
  ["term-heavy (10/60/30)",    { monthly: 0.10, quarterly: 0.60, annual: 0.30 }],
];
console.log(`  ${pad("plan mix", 26)} ${churns.map((c) => pad("churn " + pc(c), 12)).join("")}`);
for (const [name, mix] of mixes) {
  const row = churns.map((c) => {
    const oldChurn = CHURN;
    const lt = (p) => {
      const g = PRICE[p], net = g - stripeFee(g) - AI * MONTHS[p];
      if (p === "monthly") return (1 / c) * (g - stripeFee(g) - AI);
      const terms = 1 / (1 - Math.pow(1 - c, MONTHS[p]));
      return terms * net;
    };
    const b = Object.keys(PRICE).reduce((s, p) => s + mix[p] * lt(p), 0);
    return pad(f(b), 12);
  });
  console.log(`  ${pad(name, 26)} ${row.join("")}`);
}

console.log("\n  ── The levers, ranked by impact on LTV:CAC ──");
console.log("  1. Conversion (landing→paid): moving 1.3% → 2.6% halves CAC. Biggest lever.");
console.log("  2. Churn: the metrics page exists to lower it. 22%→15% lifts LTV ~40%.");
console.log("  3. Plan mix: every point shifted monthly→yearly raises blended LTV.");
console.log("  4. Channel: retargeting + lookalikes cut CAC 2-3x vs cold prospecting.\n");

console.log("  Note: LTV is contribution margin (after Stripe + AI), not revenue. Funnel");
console.log("  rates are modelled; the live Mixpanel funnel will replace them once ads run.\n");
