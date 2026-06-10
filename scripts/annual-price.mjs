/* Axon Careers — should you lower the annual price to get more annual?
   Tests annual price points: per-sub LTV, blended LTV (at 60% annual), and the
   key question — how much MORE total conversion a price cut must buy to break
   even on the margin you give up. */

const PM = 9.99, AI = 1.44, CHURN = 0.22, ANNUAL = 0.60;
const fee = (g) => g * 0.029 + 0.30;
const netMonthly = PM - fee(PM) - AI;
const ltvMonthly = netMonthly / CHURN;                 // $36.18
const annualLtv = (P) => P - fee(P) - AI * 12;
const blended = (P, share = ANNUAL) => (1 - share) * ltvMonthly + share * annualLtv(P);

const f = (n, d = 2) => Number(n).toFixed(d);
const BASE = 79, baseBlended = blended(BASE);

console.log("=========== ANNUAL PRICE SWEEP (monthly stays $9.99) ===========\n");
console.log("  Monthly LTV (churn %s%%): $%s  |  current blended LTV @ $%s: $%s\n",
  f(CHURN * 100, 0), f(ltvMonthly), BASE, f(baseBlended));

console.log("  Annual$  /mo equiv  vs monthly  Annual LTV  Blended LTV(60%)  Conversion lift needed");
console.log("  " + "-".repeat(82));
for (const P of [99, 89, 79, 69, 59, 49]) {
  const mo = P / 12;
  const disc = (1 - mo / PM) * 100;
  const bl = blended(P);
  // a permanent cut hits all annual buyers; to hold total profit, total payers
  // must rise by baseBlended/newBlended.
  const lift = bl >= baseBlended ? "—" : "+" + f((baseBlended / bl - 1) * 100, 0) + "%";
  console.log("  %s  %s  %s  %s  %s  %s",
    ("$" + P).padStart(6),
    ("$" + f(mo)).padStart(8),
    (f(disc, 0) + "% off").padStart(9),
    ("$" + f(annualLtv(P))).padStart(10),
    ("$" + f(bl)).padStart(13),
    lift.padStart(20));
}

console.log("\n  Key insight: below ~$%s, even 100%% annual can't beat today's blended LTV", BASE);
console.log("  ($%s). So a permanent cut only pays if it brings NET-NEW buyers, not if", f(baseBlended));
console.log("  it just moves people from monthly to a cheaper annual. A $10 cut needs ~+13%%");
console.log("  more total conversions to break even; a $20 cut needs ~+30%%.");
console.log("\n  Verdict: keep $79. Use positioning to lift annual share (near-free), and");
console.log("  reserve price cuts for limited-time promos that break hesitation, not a");
console.log("  standing discount that erodes the prepaid-cash advantage.");
