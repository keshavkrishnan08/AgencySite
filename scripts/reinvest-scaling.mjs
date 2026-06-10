/* Axon Careers — recursive reinvestment model (1 year).
   Seed with $5/creative x6 = $30/day = $900 for month 0. Then take ALL operating
   cash each month and pour it straight back into ads (reinvest everything, pull
   nothing out). Constant CAC — we are NOT modeling audience saturation or campaign
   scaling friction, just pure recursive reinvestment. Churn is high (30%/mo).

   The whole question: is opCash/spend > 1 (snowball grows) or < 1 (snowball melts)? */

// Overridable: node reinvest-scaling.mjs [CAC] [monthlyShare] [churn]
const SEED = 900;          // month-0 ad budget ($30/day x 30)
const CAC = Number(process.argv[2] ?? 37.97);   // constant cost per paying sub
const CHURN = Number(process.argv[4] ?? 0.30);  // monthly churn on monthly subs
const PM = 9.99, PA = 79;  // monthly / annual price
const AI = 1.44;           // Anthropic cost / active user / month (optimized)
const fee = (g, n) => g * 0.029 + n * 0.30; // Stripe: % + per-transaction
const MONTHS = 12;

const f = (n, d = 0) => Number(n).toFixed(d);

// LTV check (net contribution) — decides if reinvestment compounds up or down.
const ltvMonthly = (PM - PM * 0.029 - 0.30 - AI) / CHURN;      // net/mo / churn
const ltvAnnual = PA - PA * 0.029 - 0.30 - AI * 12;            // net over the locked year
function blendedLtv(ms) { return ms * ltvMonthly + (1 - ms) * ltvAnnual; }

function run(monthlyShare, { verbose = false } = {}) {
  const aShare = 1 - monthlyShare;
  let budget = SEED, monthlySubs = 0;
  let annualBook = []; // [{count, left}] active while left>0, paid up front
  let totalAcquired = 0, totalOpCash = 0, lastOpCash = 0;
  const rows = [];

  for (let m = 0; m < MONTHS; m++) {
    const spend = budget;
    const newSubs = spend / CAC;
    const newMo = newSubs * monthlyShare, newAn = newSubs * aShare;
    totalAcquired += newSubs;
    monthlySubs += newMo;
    annualBook.push({ count: newAn, left: 12 });
    const activeAnnual = annualBook.reduce((s, b) => s + (b.left > 0 ? b.count : 0), 0);

    // cash in this month
    const monthlyRev = monthlySubs * PM;          // every active monthly sub bills
    const annualUpfront = newAn * PA;             // annual billed once, at signup
    const stripe = fee(monthlyRev, monthlySubs) + fee(annualUpfront, newAn);
    const ai = (monthlySubs + activeAnnual) * AI;
    const opCash = monthlyRev + annualUpfront - stripe - ai;
    totalOpCash += opCash;
    lastOpCash = opCash;

    rows.push({ m, spend, newSubs, monthlySubs, activeAnnual, opCash, g: opCash / spend });

    // reinvest everything; then churn + age the book
    budget = Math.max(0, opCash);
    monthlySubs *= (1 - CHURN);
    annualBook.forEach((b) => b.left--);
    annualBook = annualBook.filter((b) => b.left > 0);
  }

  // ending state
  const activeAnnualEnd = annualBook.reduce((s, b) => s + b.count, 0);
  const runRateNet = monthlySubs * (PM - PM * 0.029 - 0.30 - AI) - activeAnnualEnd * AI;
  return { rows, totalAcquired, totalOpCash, lastOpCash, monthlySubs, activeAnnualEnd, runRateNet };
}

console.log("===== RECURSIVE REINVESTMENT — 1 YEAR — churn %s%%, CAC $%s, seed $%s =====",
  CHURN * 100, f(CAC, 2), SEED);
console.log("  Assumes constant CAC (no scaling friction) and reinvests 100%% of cash.\n");

console.log("  UNIT ECONOMICS (the verdict before we even simulate):");
console.log("    Monthly LTV $%s  vs CAC $%s  -> %s", f(ltvMonthly, 2), f(CAC, 2),
  ltvMonthly >= CAC ? "OK" : "LOSES $" + f(CAC - ltvMonthly, 2) + "/sub");
console.log("    Annual  LTV $%s  vs CAC $%s  -> %s", f(ltvAnnual, 2), f(CAC, 2),
  ltvAnnual >= CAC ? "OK (+$" + f(ltvAnnual - CAC, 2) + ")" : "LOSES");

const MIX = Number(process.argv[3] ?? 0.75); // monthly share
console.log("\n===== MONTH-BY-MONTH @ %s%% monthly / %s%% annual =====", MIX * 100, (1 - MIX) * 100);
console.log("  Blended LTV $%s vs CAC $%s -> reinvestment compounds %s\n",
  f(blendedLtv(MIX), 2), f(CAC, 2), blendedLtv(MIX) >= CAC ? "UP" : "DOWN");
console.log("  Mo | Ad spend | New subs | Active mo | Active an | Op cash | $back/$in");
console.log("  " + "-".repeat(72));
const base = run(MIX, { verbose: true });
for (const r of base.rows) {
  console.log("  %s | %s | %s | %s | %s | %s | %s",
    String(r.m).padStart(2),
    ("$" + f(r.spend)).padStart(8),
    f(r.newSubs, 1).padStart(8),
    f(r.monthlySubs, 1).padStart(9),
    f(r.activeAnnual, 1).padStart(9),
    ("$" + f(r.opCash)).padStart(7),
    (f(r.g, 2) + "x").padStart(6));
}
console.log("\n  After 12 months of reinvesting everything:");
console.log("    Total subs acquired:        %s", f(base.totalAcquired));
console.log("    Active base at month 12:    %s monthly + %s annual", f(base.monthlySubs, 1), f(base.activeAnnualEnd, 1));
console.log("    Ad budget now (was $900):   $%s/mo", f(base.lastOpCash));
console.log("    Forward net run-rate:       $%s/mo", f(base.runRateNet));
console.log("    Total operating cash cycled:$%s on a $%s seed (%sx)",
  f(base.totalOpCash), SEED, f(base.totalOpCash / SEED, 2));

console.log("\n===== SENSITIVITY: how the plan mix changes the snowball =====");
console.log("  Monthly% | Blended LTV | Ending budget | Subs acquired | Cash cycled | Verdict");
console.log("  " + "-".repeat(80));
for (const ms of [0.9, 0.75, 0.6, 0.5, 0.4, 0.25]) {
  const r = run(ms);
  console.log("  %s | %s | %s | %s | %s | %s",
    (f(ms * 100) + "%").padStart(7),
    ("$" + f(blendedLtv(ms), 2)).padStart(11),
    ("$" + f(r.lastOpCash) + "/mo").padStart(13),
    f(r.totalAcquired).padStart(13),
    ("$" + f(r.totalOpCash)).padStart(11),
    blendedLtv(ms) >= CAC ? "GROWS" : "melts");
}
