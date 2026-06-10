/* Axon Careers — CAC lever calculator.
   CAC = effective cost-per-click / (click -> paid conversion).
   So you lower it two ways: cheaper clicks (CTR/CPM/channel) OR more of those
   clicks converting (fix funnel leaks). Plus blended CAC drops fast once any
   near-zero-cost channel (organic, referral) carries part of the volume.

   Baseline is the $30/day no-trial ABM funnel. */

// ---- baseline funnel (from the ABM) ----
const STAGES = {
  lp:        0.866, // click -> landing
  onb_start: 0.636, // landing -> start onboarding
  onb_done:  0.572, // start -> finish questions
  acct:      0.635, // finish -> create account
  paywall:   0.927, // account -> reach paywall
  pay:       0.174, // paywall -> paid
};
const conv = (s) => Object.values(s).reduce((a, b) => a * b, 1);
const BASE_CONV = conv(STAGES);
const CAC0 = 37.97;
const CPC0 = CAC0 * BASE_CONV; // effective $/click implied by the ABM (incl. learning premium)

const f = (n, d = 0) => Number(n).toFixed(d);
const cacOf = (cpc, c) => cpc / c;

console.log("===== BASELINE =====");
console.log("  click->paid %s%%  | eff. CPC $%s | CAC $%s\n", f(BASE_CONV * 100, 2), f(CPC0, 2), f(CAC0, 2));

// ---- single levers ----
function lever(label, { cpcMult = 1, stage = null, to = null } = {}) {
  const s = { ...STAGES };
  if (stage) s[stage] = to;
  const c = conv(s);
  const cac = cacOf(CPC0 * cpcMult, c);
  console.log("  %s | CAC $%s  (%s%%)", label.padEnd(42), f(cac, 2).padStart(6),
    f((cac / CAC0 - 1) * 100, 0));
  return cac;
}

console.log("===== ONE LEVER AT A TIME =====");
lever("Creative: CTR 1.6%->2.4% (cheaper clicks)", { cpcMult: 1 / 1.5 });
lever("Cheaper traffic: CPM $14->$10",             { cpcMult: 10 / 14 });
lever("Paywall: paid-rate 17.4%->25%",             { stage: "pay", to: 0.25 });
lever("Paywall: paid-rate 17.4%->30%",             { stage: "pay", to: 0.30 });
lever("Onboarding: finish 57%->75%",               { stage: "onb_done", to: 0.75 });
lever("Landing: start-rate 64%->75%",              { stage: "onb_start", to: 0.75 });
lever("Account: create-rate 64%->78%",             { stage: "acct", to: 0.78 });

// ---- stacked realistic scenario ----
console.log("\n===== STACKED (realistic, all achievable) =====");
const s2 = { ...STAGES, onb_start: 0.72, onb_done: 0.70, acct: 0.74, pay: 0.25 };
const c2 = conv(s2);
const cpc2 = CPC0 / 1.4; // better creative + Advantage+/CAPI delivery
const cac2 = cacOf(cpc2, c2);
console.log("  Better creative + tighter funnel (paywall 25%%, onboarding+, CPC -29%%)");
console.log("  click->paid %s%% | CPC $%s | CAC $%s  (%s%% vs baseline)\n",
  f(c2 * 100, 2), f(cpc2, 2), f(cac2, 2), f((cac2 / CAC0 - 1) * 100, 0));

// ---- blended CAC with a free/cheap channel ----
console.log("===== BLENDED CAC: add a near-zero-cost channel =====");
console.log("  (paid CAC held at the stacked $%s; organic/referral subs cost ~$0)", f(cac2, 2));
console.log("  Organic share | Blended CAC");
for (const org of [0, 0.2, 0.35, 0.5, 0.65]) {
  // for every paid sub, org/(1-org) come free
  const paidSubs = 1, freeSubs = org / (1 - org);
  const blended = (paidSubs * cac2) / (paidSubs + freeSubs);
  console.log("    %s        |  $%s", (f(org * 100) + "%").padStart(4), f(blended, 2));
}

console.log("\n  Targets: get CAC under annual LTV ($59) = healthy; under ~$20 = monthly works too.");
console.log("  The single biggest lever is the paywall (17%% paid), then onboarding, then");
console.log("  blending in referral/organic so not every sub is bought.");
