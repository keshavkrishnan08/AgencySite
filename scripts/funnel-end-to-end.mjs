/* Axon Careers — end-to-end page-by-page conversion:
   landing -> payment (from the $30/day no-trial ABM) -> in-app activation ->
   12-month retention / churn. Acquisition + churn are ABM-anchored; the in-app
   activation rates are stated SaaS-benchmark assumptions (tweak at top). */

const SPEND = 900; // $30/day x 30

// ---- 1. ACQUISITION (per month, from the ABM — current shipped funnel:
//        auto-advance + validations-removed onboarding, annual-default) ----
const ACQ = [
  ["Ad click", 730.2],
  ["/start landing viewed", 615.6],
  ["Started onboarding", 390.9],
  ["Finished the questions", 277.8],
  ["Created account", 223.2],
  ["Reached paywall (/upgrade)", 216.3],
  ["Subscribed (paid $9.99)", 25.4],
];
const LANDING = 615.6; // base for "from landing" %
const PAID = 25.4;

// ---- 2. IN-APP ACTIVATION (% of paid; modeled benchmarks) ----
const ACT = [
  ["Landed in the app (dashboard)", 1.0],
  ["Opened first practice session", 0.93],
  ["Finished first session (all Qs)", 0.80],
  ["Saw their first score (aha)", 0.78],
  ["Ran a 2nd session (week 1)", 0.58],
  ["Used a second tool (gap/brief/etc.)", 0.47],
  ["Formed a habit (3+ sessions)", 0.41],
];

// ---- 3. RETENTION / CHURN (blended, from ABM cashflow: annual locked + monthly churn) ----
const ACTIVE = [25.4, 23.9, 22.5, 21.2, 20.3, 19.3, 18.4, 17.7, 17.0, 16.5, 16.0, 15.5];

const f = (n, d = 0) => Number(n).toFixed(d);
const pc = (n, den) => (den ? (n / den * 100).toFixed(1) + "%" : "—");

console.log("================ END-TO-END FUNNEL — $%s/mo Meta spend ================\n", SPEND);

console.log("1) ACQUISITION  (landing -> payment)");
console.log("   Stage                          People   %% of landing   step    drop");
let prev = null;
for (const [name, v] of ACQ) {
  const step = prev == null ? "" : pc(v, prev);
  const drop = prev == null ? "" : pc(prev - v, prev);
  const ofLanding = name === "Ad click" ? "" : pc(v, LANDING);
  console.log("   %s %s %s %s %s",
    name.padEnd(30), f(v, 1).padStart(7), ofLanding.padStart(11), step.padStart(8), drop.padStart(8));
  prev = v;
}
console.log("   -> Landing -> paid: %s | click -> paid: %s | CAC $%s\n",
  pc(PAID, LANDING), pc(PAID, ACQ[0][1]), f(SPEND / PAID, 2));

console.log("2) ACTIVATION  (after payment, %% of the %s paying subs)", f(PAID, 1));
let pprev = null;
for (const [name, r] of ACT) {
  const people = PAID * r;
  const step = pprev == null ? "" : pc(r, pprev);
  console.log("   %s %s   %s of paid   %s",
    name.padEnd(34), f(people, 1).padStart(5), pc(r, 1).padStart(6), step ? "(" + step + " of prev)" : "");
  pprev = r;
}

console.log("\n3) RETENTION / CHURN  (the paid cohort over 12 months)");
console.log("   Month  Active subs  Retained  Churned this mo  Cumulative churned");
for (let m = 0; m < ACTIVE.length; m++) {
  const ret = ACTIVE[m] / ACTIVE[0];
  const churnedMo = m === 0 ? 0 : ACTIVE[m - 1] - ACTIVE[m];
  const cumChurn = ACTIVE[0] - ACTIVE[m];
  console.log("   %s     %s       %s     %s            %s",
    String(m).padStart(2), f(ACTIVE[m], 1).padStart(5), pc(ACTIVE[m], ACTIVE[0]).padStart(6),
    f(churnedMo, 1).padStart(5), f(cumChurn, 1).padStart(5));
}
const ret12 = ACTIVE[ACTIVE.length - 1] / ACTIVE[0];
console.log("   -> 11-month logo retention: %s (avg ~%s%% blended monthly churn; annual plans locked 12 mo)\n",
  pc(ACTIVE[ACTIVE.length - 1], ACTIVE[0]), f((1 - Math.pow(ret12, 1 / 11)) * 100, 1));

console.log("================ ONE LINE, START TO FINISH ================");
const habit = PAID * 0.41, at6 = ACTIVE[6];
console.log("  Of 100 landing visitors: ~%s pay, ~%s build a habit, ~%s still active at 6 months.",
  f(PAID / LANDING * 100, 1), f(habit / LANDING * 100, 2), f(at6 / LANDING * 100, 2));
console.log("  Per $%s spent: %s paid, ~%s activated, ~%s retained to month 6.",
  SPEND, f(PAID, 1), f(PAID * 0.80, 1), f(at6, 1));
