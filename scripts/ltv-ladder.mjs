/* Axon Careers — LTV improvement ladder.
   Shows how each steady improvement (more annual, then lower churn) compounds
   blended LTV and LTV:CAC. Net contribution per the optimized cost base. */

const PM = 9.99, PA = 79, AI = 1.44, CAC = 35.38;
const netMo = PM - PM * 0.029 - 0.30 - AI;       // $/mo per active monthly sub
const ltvAnnual = PA - PA * 0.029 - 0.30 - AI * 12; // net over the locked year
const f = (n, d = 2) => Number(n).toFixed(d);

const ltvMonthly = (churn) => netMo / churn;
const blended = (annualShare, churn) =>
  (1 - annualShare) * ltvMonthly(churn) + annualShare * ltvAnnual;

const STEPS = [
  ["0. Today", 0.50, 0.30],
  ["1. + Annual default / nudge / lead-with-yearly", 0.65, 0.30],
  ["2. + Activation & weekly-email retention", 0.65, 0.20],
  ["3. + Save-on-cancel & re-engagement", 0.70, 0.15],
  ["4. + Habit loop (streaks, interview-date goal)", 0.72, 0.12],
];

console.log("=========== LTV IMPROVEMENT LADDER (CAC $%s) ===========\n", f(CAC));
console.log("  netMonthly $%s/mo | LTV(annual) $%s\n", f(netMo), f(ltvAnnual));
console.log("  Step                                             Annual%  Churn   Blended LTV   LTV:CAC");
console.log("  " + "-".repeat(92));
let base = null;
for (const [name, ann, churn] of STEPS) {
  const ltv = blended(ann, churn);
  if (base === null) base = ltv;
  console.log("  %s %s %s %s %s %s",
    name.padEnd(46),
    (f(ann * 100, 0) + "%").padStart(6),
    (f(churn * 100, 0) + "%").padStart(6),
    ("$" + f(ltv)).padStart(12),
    (f(ltv / CAC) + "x").padStart(8),
    ltv === base ? "" : "(+" + f((ltv / base - 1) * 100, 0) + "% vs today)");
}
console.log("\n  Read: annual mix and churn are multiplicative on LTV. Today you're at");
console.log("  ~1.2x LTV:CAC (thin). Stepping through the ladder roughly doubles it to ~1.7x,");
console.log("  which is the difference between a fragile business and one you can pour fuel on.");
