/* Axon Careers — $5/day Meta ads unit-economics simulation.
   Grounded in 2024-25 Meta benchmarks + our actual (honest, pay-first) funnel.
   Deterministic (seeded) so it's reproducible. */

// ---- seeded RNG (reproducible) ----
let _s = 20260609;
const rnd = () => (_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const jit = (x, pct) => x * (1 + (rnd() * 2 - 1) * pct); // +/- pct noise

// ---- assumptions (realistic) ----
const DAILY_BUDGET = 5;            // $/day
const DAYS = 30;                   // acquisition window
// $5/day is a MICRO budget: it barely exits Meta's learning phase (needs ~50
// conv/wk), so CPMs run high and delivery is inefficient. Model that penalty.
const CPM_BASE = 14;               // $ per 1000 impressions (career/coaching, small budget)
const LEARNING_PENALTY_DAYS = 7;   // first week: +35% CPM, worse delivery
const STRIPE_FEE = (g) => g * 0.029 + 0.30;
const PRICE = 9.99;
const TRIAL_DAYS = 7;
const TRIAL_PAID_CONV = 0.50;      // card-required trial -> ~50% convert to paid
const MONTHLY_CHURN = 0.12;        // consumer subscription churn
const AI_COST_TRIAL = 0.30;        // Anthropic tokens during a trial (they practice)
const AI_COST_PAID_MO = 0.45;      // tokens per paying user per month
const HOST_FIXED_MO = 20;          // Vercel/Supabase baseline

// 6 creatives: realistic link-CTR spread. Most mediocre, 1-2 winners. (Meta
// avg link CTR ~0.9-1.5%; strong creative ~2%+.)
const CREATIVES = [
  { id: "C1 3am-panic",      ctr: 0.022, q: 1.05 }, // emotional, high CTR + good leads
  { id: "C2 layoff-reframe", ctr: 0.016, q: 1.00 },
  { id: "C3 score-demo",     ctr: 0.014, q: 1.10 }, // lower CTR, higher-intent clicks
  { id: "C4 testimonial",    ctr: 0.012, q: 0.95 },
  { id: "C5 'not your fault'",ctr: 0.010, q: 0.90 },
  { id: "C6 generic-tips",   ctr: 0.007, q: 0.80 }, // weak, gets starved by CBO
];

// 3 audiences: different CTR + downstream funnel quality.
const AUDIENCES = [
  { id: "Returning to work", share: 0.40, ctrMul: 1.10, funnelMul: 1.10 },
  { id: "Recently laid off", share: 0.35, ctrMul: 1.00, funnelMul: 0.95 },
  { id: "Career changers",   share: 0.25, ctrMul: 0.95, funnelMul: 1.05 },
];

// Funnel after the landing page (honest, pay-first: no free usage).
const F = {
  clickToLP: 0.85,      // clicks that actually load the LP
  lpToOnb: 0.35,        // start onboarding (cold traffic)
  onbFinish: 0.60,      // finish the question flow
  finishToSignup: 0.50, // create the account (account wall)
  signupToTrial: 0.40,  // enter card / start trial (the big drop)
};
const lpToTrial = F.lpToOnb * F.onbFinish * F.finishToSignup * F.signupToTrial; // ~0.042

// ---- simulate acquisition day by day ----
// Simple CBO: budget flows toward creatives with higher (ctr*q). Weight grows over time.
let weights = CREATIVES.map((c) => c.ctr * c.q);
const cum = { spend: 0, clicks: 0, lp: 0, trials: 0, paid: 0, impr: 0 };
const perCreative = CREATIVES.map((c) => ({ id: c.id, spend: 0, clicks: 0, trials: 0, paid: 0 }));
const perAud = AUDIENCES.map((a) => ({ id: a.id, trials: 0, paid: 0 }));
const trialQueue = []; // {day, count} matures after TRIAL_DAYS
const rows = [];

for (let d = 1; d <= DAYS; d++) {
  const learning = d <= LEARNING_PENALTY_DAYS;
  const cpm = CPM_BASE * (learning ? 1.35 : 1.0);
  const budget = DAILY_BUDGET;
  // allocate budget across creatives by weight (CBO), with a learning-phase even-ish split
  const wsum = weights.reduce((a, b) => a + b, 0);
  let dayClicks = 0, dayLP = 0, dayTrials = 0;
  CREATIVES.forEach((c, i) => {
    const alloc = learning ? budget / CREATIVES.length : budget * (weights[i] / wsum);
    const impr = (alloc / cpm) * 1000;
    // blended audience CTR + funnel
    let clicks = 0, lp = 0, trials = 0;
    AUDIENCES.forEach((a) => {
      const aImpr = impr * a.share;
      const ctr = jit(c.ctr * a.ctrMul, 0.12);
      const cl = aImpr * ctr;
      const lpv = cl * F.clickToLP;
      const tr = lpv * lpToTrial * c.q * a.funnelMul;
      clicks += cl; lp += lpv; trials += tr;
      const pa = perAud.find((x) => x.id === a.id);
      pa.trials += tr;
    });
    dayClicks += clicks; dayLP += lp; dayTrials += trials;
    perCreative[i].spend += alloc; perCreative[i].clicks += clicks; perCreative[i].trials += trials;
    // update weight by realized quality (reinforce winners)
    weights[i] = weights[i] * 0.7 + (c.ctr * c.q) * 0.3;
  });
  cum.impr += Math.round((budget / cpm) * 1000); cum.spend += budget; cum.clicks += dayClicks; cum.lp += dayLP; cum.trials += dayTrials;
  trialQueue.push({ matureDay: d + TRIAL_DAYS, count: dayTrials });
  // mature trials -> paid
  let dayPaid = 0;
  for (const t of trialQueue) if (t.matureDay === d) dayPaid += t.count * TRIAL_PAID_CONV;
  cum.paid += dayPaid;
  rows.push({
    d, learning, cpm: cpm.toFixed(0),
    impr: Math.round((budget / cpm) * 1000),
    clicks: dayClicks, ctr: (dayClicks / ((budget / cpm) * 1000) * 100),
    lp: dayLP, trials: dayTrials, paid: dayPaid,
  });
}
// distribute paid to creatives/audiences proportionally to trials
const trialTotal = cum.trials || 1;
perCreative.forEach((c) => (c.paid = cum.paid * (c.trials / trialTotal)));
perAud.forEach((a) => (a.paid = cum.paid * (a.trials / trialTotal)));

// ---- 12-month cohort economics for the users acquired in this 30-day window ----
const newPaid = cum.paid;                 // paying subs started (post-trial) in window
const CAC = cum.spend / Math.max(newPaid, 0.0001);
// LTV: net monthly margin / churn
const netMo = PRICE - STRIPE_FEE(PRICE) - AI_COST_PAID_MO;
const avgLifetimeMo = 1 / MONTHLY_CHURN;
const LTV = netMo * avgLifetimeMo;
const paybackMo = CAC / netMo;
// 12-month P&L for this cohort (acquisition spend once, revenue + churn over 12 mo)
let active = 0, started = newPaid, rev = 0, aiCost = 0, retained = newPaid;
// simple: all start month 0, churn each month
let cohortRevNet = 0;
let subs = newPaid;
for (let m = 0; m < 12; m++) {
  cohortRevNet += subs * netMo;
  subs *= (1 - MONTHLY_CHURN);
}
const trialAiCost = cum.trials * AI_COST_TRIAL;
const cohortProfit = cohortRevNet - cum.spend - trialAiCost; // host fixed excluded (not per-cohort)
const roas12 = (cohortRevNet) / cum.spend;

// ---- output ----
const f = (n, d = 1) => Number(n).toFixed(d);
console.log("================ $5/DAY META CAMPAIGN SIM (30-day acquisition) ================\n");
console.log("Assumptions: CPM $%s (+35%% first week, learning phase), price $%s, 7-day card trial,",
  CPM_BASE, PRICE);
console.log("trial→paid %s%%, churn %s%%/mo, AI cost $%s/trial + $%s/paid-mo.\n",
  TRIAL_PAID_CONV*100, MONTHLY_CHURN*100, AI_COST_TRIAL, AI_COST_PAID_MO);
console.log("Funnel/LP→trial: click→LP %s, LP→onb %s, finish %s, →signup %s, →trial %s  ⇒ LP→trial %s%%\n",
  F.clickToLP, F.lpToOnb, F.onbFinish, F.finishToSignup, F.signupToTrial, f(lpToTrial*100,1));

console.log("Day | CPM | Impr | Clicks | CTR%  | LPviews | Trials | NewPaid");
rows.forEach((r) => {
  if (r.d <= 10 || r.d % 5 === 0) // print first 10 days + every 5th
  console.log("%s%s | $%s | %s | %s | %s | %s | %s | %s",
    String(r.d).padStart(3), r.learning ? "L" : " ", r.cpm,
    String(r.impr).padStart(4), f(r.clicks,1).padStart(5), f(r.ctr,2).padStart(5),
    f(r.lp,1).padStart(6), f(r.trials,2).padStart(6), f(r.paid,2).padStart(6));
});

console.log("\n---- 30-day totals ----");
console.log("Spend: $%s | Clicks: %s | Avg CTR: %s%% | LP views: %s | Trials started: %s | Paid subs: %s",
  f(cum.spend,0), f(cum.clicks,0), f(cum.clicks/cum.impr*100,2), f(cum.lp,0), f(cum.trials,1), f(cum.paid,1));
console.log("Click→paid: %s%% | LP→paid: %s%%", f(cum.paid/cum.clicks*100,2), f(cum.paid/cum.lp*100,2));

console.log("\n---- per creative (CBO favored the winners) ----");
perCreative.sort((a,b)=>b.paid-a.paid).forEach((c)=>
  console.log("%s | spend $%s | clicks %s | trials %s | paid %s",
    c.id.padEnd(18), f(c.spend,0).padStart(3), f(c.clicks,0).padStart(3), f(c.trials,1).padStart(4), f(c.paid,1)));

console.log("\n---- per audience ----");
perAud.forEach((a)=> console.log("%s | trials %s | paid %s", a.id.padEnd(20), f(a.trials,1).padStart(4), f(a.paid,1)));

console.log("\n================ UNIT ECONOMICS ================");
console.log("Net margin / paying user / month: $%s (after Stripe + AI)", f(netMo,2));
console.log("CAC (cost per paying sub):         $%s", f(CAC,2));
console.log("Avg lifetime:                       %s months (at %s%% churn)", f(avgLifetimeMo,1), MONTHLY_CHURN*100);
console.log("LTV (net):                          $%s", f(LTV,2));
console.log("LTV : CAC ratio:                    %s : 1   (>3 is great, >1 viable)", f(LTV/CAC,2));
console.log("Payback period:                     %s months", f(paybackMo,1));

console.log("\n================ 12-MONTH P&L (this cohort) ================");
console.log("Ad spend (one-time):    -$%s", f(cum.spend,0));
console.log("Trial AI cost:          -$%s", f(trialAiCost,0));
console.log("Net subscription rev:   +$%s (over 12 mo, with churn)", f(cohortRevNet,0));
console.log("Cohort profit (12mo):    $%s", f(cohortProfit,0));
console.log("12-month ROAS:           %sx", f(roas12,2));
console.log("\nNote: at $5/day Meta barely exits the learning phase, so CPMs are high and");
console.log("delivery is noisy. The math is thin-but-positive ONLY if churn stays ~12%% and");
console.log("trial→paid stays ~50%%. Both are fragile on cold, pay-first traffic.");
