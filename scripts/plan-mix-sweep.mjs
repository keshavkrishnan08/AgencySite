/* Axon Careers — plan-mix sensitivity sweep (no trial, optimized AI cost).
   Holds the converged funnel fixed (paid subs, CAC, AI cost, churn) and varies
   ONLY the share of payers who pick monthly vs annual, so you can see exactly how
   much the plan mix drives 12-month profit. Annual is billed once up front and is
   locked for the year; monthly churns at CH per month. */

const PAID = 23.7;        // avg paying subs / month from the ABM
const SPEND = 900;        // $30/day x 30
const PM = 9.99, PA = 79; // monthly / annual price
const CH = 0.50;          // monthly churn
const AIP = 1.44;         // Anthropic cost / active user / month (24 sess x $0.06)
const fee = (g) => g * 0.029 + 0.30; // Stripe
const CAC = SPEND / PAID;

const SHARES = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4]; // monthly share
const f = (n, d = 0) => Number(n).toFixed(d);

function model(monthlyShare) {
  const mo0 = PAID * monthlyShare, an = PAID * (1 - monthlyShare);
  // 12-month net revenue
  let subsM = mo0, rev = 0, cum = -SPEND, breakeven = null, m0net = 0;
  const monthRows = [];
  for (let m = 0; m < 12; m++) {
    const monthlyRev = subsM * (PM - fee(PM) - AIP);
    const annualRev = m === 0 ? an * (PA - fee(PA)) : 0;
    const annualAi = an * AIP; // annual users still burn tokens monthly
    const net = monthlyRev + annualRev - annualAi;
    rev += monthlyRev + (m === 0 ? an * (PA - fee(PA)) : 0) - annualAi;
    cum += net;
    if (m === 0) m0net = net;
    if (breakeven === null && cum >= 0) breakeven = m;
    monthRows.push(cum);
    subsM *= (1 - CH);
  }
  const profit = cum;
  return { mo0, an, profit, roas: (profit + SPEND) / SPEND, m0net, breakeven, monthRows };
}

console.log("===== PLAN-MIX SWEEP — no trial, AI $%s/user/mo, churn %s%%, CAC $%s =====\n",
  AIP, CH * 100, f(CAC, 2));
console.log("  Monthly% | Annual% | Mo subs | An subs | Mo0 cash | Break-even | 12-mo PROFIT | ROAS");
console.log("  " + "-".repeat(82));
for (const s of SHARES) {
  const r = model(s);
  const be = r.breakeven === null ? "never" : (r.breakeven === 0 ? "month 0" : "month " + r.breakeven);
  console.log("  %s | %s | %s | %s | %s | %s | %s | %s",
    (f(s * 100) + "%").padStart(7),
    (f((1 - s) * 100) + "%").padStart(6),
    f(r.mo0, 1).padStart(6),
    f(r.an, 1).padStart(6),
    ("$" + f(r.m0net)).padStart(8),
    be.padStart(9),
    ("$" + f(r.profit)).padStart(11),
    (f(r.roas, 2) + "x").padStart(5));
}

console.log("\n===== CUMULATIVE PROFIT BY MONTH (for the graph) =====");
console.log("  Mo% \\ Month   " + Array.from({ length: 12 }, (_, m) => String(m).padStart(5)).join(""));
for (const s of SHARES) {
  const r = model(s);
  console.log("  %s      %s", (f(s * 100) + "%").padStart(5),
    r.monthRows.map(v => f(v).padStart(5)).join(""));
}

const monthlyOnly = model(1.0);
console.log("\n  Read: higher annual share = more month-0 cash and earlier break-even");
console.log("  (annual is paid up front and locked for the year).");
console.log("  At %s%% churn, a 100%%-monthly book is %s ($%s over 12 mo); annual's",
  CH * 100, monthlyOnly.profit >= 0 ? "profitable" : "a LOSS", f(monthlyOnly.profit));
console.log("  locked-in year is what keeps the high-annual rows above water.");
