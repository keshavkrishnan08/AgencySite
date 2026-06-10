/* Axon Careers — agent-based Meta campaign sim.
   $5 PER creative x 6 = $30/day. Each reached person is an agent with exposure
   history, fatigue, a "consideration" (thinker) state, and multi-touch
   conversion. Deterministic (seeded). Calibrated to 2024-25 Meta benchmarks. */

let _s = 424242;
const rnd = () => (_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const chance = (p) => rnd() < p;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ---- knobs ----
const PER_CREATIVE = 5, N_CREATIVES = 6;
const DAILY = PER_CREATIVE * N_CREATIVES;        // $30/day
const DAYS = 30;
const CPM_BASE = 14;
const LEARN_DAYS = 7, LEARN_MULT = 1.35;         // small per-adset budget => long learning
const AUDIENCE = 45000;                           // effective people Meta serves at this budget
// click-through rises on 2nd/3rd view (recognition) then fatigues:
const EXP_MULT = { 1: 1.0, 2: 1.3, 3: 1.2, 4: 0.85, 5: 0.55, 6: 0.35 };
const FREQ_CAP = 7;                               // stop serving after this many views

const PERSONAS = [
  { id: "Returning to work", w: 0.38, ctr: 0.016, funnel: 1.10, think: 0.55 },
  { id: "Recently laid off", w: 0.34, ctr: 0.014, funnel: 0.95, think: 0.45 },
  { id: "Career changers",   w: 0.28, ctr: 0.013, funnel: 1.05, think: 0.60 },
];
const CREATIVES = [
  { id: "C1 3am-panic",       m: 1.5 },
  { id: "C2 layoff-reframe",  m: 1.1 },
  { id: "C3 score-demo",      m: 1.0 },
  { id: "C4 testimonial",     m: 0.9 },
  { id: "C5 not-your-fault",  m: 0.8 },
  { id: "C6 generic-tips",    m: 0.55 },
];

// funnel (honest, pay-first)
const CLICK_TO_LP = 0.85;
const LP_TO_TRIAL = 0.035;        // immediate LP->trial (pay-first, cold)
const TRIAL_TO_PAID = 0.50;
const THINKER_RETURN0 = 0.012;    // small: most thinkers never come back
const PRICE_M = 9.99, PRICE_A = 79, ANNUAL_SHARE = 0.22;
const STRIPE = (g) => g * 0.029 + 0.30;
const CHURN_M = 0.12, AI_TRIAL = 0.30, AI_PAID_MO = 0.45;

// ---- population (agents created lazily as first reached) ----
function newPersona() { let r = rnd(), c = 0; for (const p of PERSONAS) { c += p.w; if (r <= c) return p; } return PERSONAS[0]; }
const agents = [];
let reachedCount = 0;
function serveNew() {
  if (reachedCount >= AUDIENCE) return null;
  const p = newPersona();
  const a = { p, seen: 0, intent: 0, state: "cold", clicked: false, thinkSince: -1, lastDay: 0 };
  agents.push(a); reachedCount++;
  return a;
}

const trialQueue = []; // {matureDay}
const daily = [];
let totalImpr = 0, totalClicks = 0, totalTrials = 0, immediateTrials = 0, thinkerTrials = 0, totalPaid = 0;

for (let day = 1; day <= DAYS; day++) {
  const cpm = CPM_BASE * (day <= LEARN_DAYS ? LEARN_MULT : 1);
  const imprPerCreative = (PER_CREATIVE / cpm) * 1000;
  let dImpr = 0, dClicks = 0, dNewReach = 0, dTrials = 0;

  for (const cr of CREATIVES) {
    for (let i = 0; i < imprPerCreative; i++) {
      dImpr++; totalImpr++;
      // new reach vs repeat: more repeats as the pool fills
      const pNew = Math.max(0.1, (AUDIENCE - reachedCount) / AUDIENCE);
      let a;
      if (chance(pNew)) { a = serveNew(); if (a) dNewReach++; }
      if (!a) { // pick an existing, not frequency-capped, prefer fewer views
        for (let tries = 0; tries < 4; tries++) { const c = pick(agents); if (c && c.seen < FREQ_CAP) { a = c; break; } }
      }
      if (!a) continue;
      a.seen++; a.lastDay = day;
      const expM = EXP_MULT[Math.min(a.seen, 6)] ?? 0.3;
      const ctr = a.p.ctr * cr.m * expM;
      if (a.state === "cold" || a.state === "considering") a.intent += 0.015 * expM;
      if (chance(ctr)) {
        dClicks++; totalClicks++; a.clicked = true;
        if (!chance(CLICK_TO_LP)) continue; // bounced before LP
        const conv = LP_TO_TRIAL * a.p.funnel * (1 + Math.min(a.intent, 0.35)); // capped multi-touch lift
        if (a.state !== "trial" && a.state !== "paid" && chance(conv)) {
          a.state = "trial"; dTrials++; totalTrials++; immediateTrials++;
          trialQueue.push({ matureDay: day + 7 });
        } else if (a.state === "cold") {
          a.state = "considering"; a.thinkSince = day; a.intent += 0.2;
        }
      }
    }
  }

  // thinkers come back on later days (decaying), or give up
  for (const a of agents) {
    if (a.state === "considering") {
      const age = day - a.thinkSince;
      if (age >= 1) {
        const ret = THINKER_RETURN0 * Math.pow(0.55, age - 1) * a.p.funnel;
        if (chance(ret)) { a.state = "trial"; dTrials++; totalTrials++; thinkerTrials++; trialQueue.push({ matureDay: day + 7 }); }
        else if (age > 3 && chance(0.5)) a.state = "lost";
      }
    }
  }

  // mature trials -> paid
  let dPaid = 0;
  for (const t of trialQueue) if (t.matureDay === day) { if (chance(TRIAL_TO_PAID)) { dPaid++; totalPaid++; } }

  daily.push({ day, cpm: cpm.toFixed(0), impr: Math.round(dImpr), reach: dNewReach, clicks: dClicks,
    ctr: (dClicks / dImpr * 100), trials: dTrials, paid: dPaid });
}

// frequency distribution
const freq = {};
for (const a of agents) { const k = Math.min(a.seen, 6); freq[k] = (freq[k] || 0) + 1; }
const thinkers = agents.filter((a) => a.thinkSince >= 0).length;

// ---- economics ----
const spend = DAILY * DAYS;
const CAC = spend / Math.max(totalPaid, 0.0001);
const blendedFirst = totalPaid * (ANNUAL_SHARE * (PRICE_A - STRIPE(PRICE_A)) + (1 - ANNUAL_SHARE) * (PRICE_M - STRIPE(PRICE_M)));
// 12-month net revenue with churn (monthly cohort churns; annual stays the year)
const monthlyPaid = totalPaid * (1 - ANNUAL_SHARE), annualPaid = totalPaid * ANNUAL_SHARE;
let mSubs = monthlyPaid, rev = 0;
for (let m = 0; m < 12; m++) { rev += mSubs * (PRICE_M - STRIPE(PRICE_M) - AI_PAID_MO); mSubs *= (1 - CHURN_M); }
rev += annualPaid * (PRICE_A - STRIPE(PRICE_A) - AI_PAID_MO * 12); // annual: a year of access, paid once
const trialAi = totalTrials * AI_TRIAL;
const profit = rev - spend - trialAi;
const netMoM = PRICE_M - STRIPE(PRICE_M) - AI_PAID_MO;
const ltvM = netMoM / CHURN_M;
const ltvBlend = ANNUAL_SHARE * (PRICE_A - STRIPE(PRICE_A) - AI_PAID_MO * 12) + (1 - ANNUAL_SHARE) * ltvM;

const f = (n, d = 0) => Number(n).toFixed(d);
console.log("======== AGENT-BASED SIM: $5 x 6 creatives = $30/day, %s days ========\n", DAYS);
console.log("Audience served: %s people | CPM $%s (+35%% wk1) | personas: returning/laid-off/career\n", AUDIENCE, CPM_BASE);
console.log("Day | CPM | Impr | NewReach | Clicks | CTR%% | Trials | Paid");
daily.forEach((r) => { if (r.day <= 7 || r.day % 5 === 0)
  console.log("%s%s | $%s | %s | %s | %s | %s | %s | %s",
    String(r.day).padStart(3), r.day <= LEARN_DAYS ? "L" : " ", r.cpm,
    String(r.impr).padStart(4), String(r.reach).padStart(4), String(r.clicks).padStart(4),
    f(r.ctr,2).padStart(5), String(r.trials).padStart(3), String(r.paid).padStart(3)); });

console.log("\n---- 30-day totals (agents) ----");
console.log("Impressions: %s | Unique people reached: %s | Avg frequency: %sx",
  f(totalImpr), f(reachedCount), f(totalImpr / reachedCount, 2));
console.log("Clicks: %s | Blended CTR: %s%% | Trials: %s (immediate %s, thinkers %s) | Paid subs: %s",
  f(totalClicks), f(totalClicks / totalImpr * 100, 2), f(totalTrials), f(immediateTrials), f(thinkerTrials), f(totalPaid));
console.log("'Thinkers' (clicked, didn't convert on first visit): %s  ->  %s of them came back and converted",
  f(thinkers), f(thinkerTrials));

console.log("\n---- exposure frequency (how many times people saw an ad) ----");
[1,2,3,4,5,6].forEach((k)=> console.log("seen %s%sx: %s people", k, k===6?"+":" ", f(freq[k]||0)));

console.log("\n======== ECONOMICS ========");
console.log("Spend (30d):            $%s", f(spend));
console.log("Paying subscribers:      %s   (CAC $%s)", f(totalPaid), f(CAC,2));
console.log("Blended LTV (net):      $%s   (22%% annual / 78%% monthly, 12%% churn)", f(ltvBlend,2));
console.log("LTV : CAC:               %s : 1", f(ltvBlend / CAC, 2));
console.log("First-month net rev:    $%s", f(blendedFirst));
console.log("12-month net revenue:   $%s", f(rev));
console.log("Trial AI cost:          -$%s", f(trialAi));
console.log("12-month PROFIT:        $%s   (ROAS %sx)", f(profit), f(rev / spend, 2));
