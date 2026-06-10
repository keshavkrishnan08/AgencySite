/* Axon Careers — COMPREHENSIVE multi-campaign agent-based model.
   Three live campaigns (Prospecting, Lookalike, Retargeting) over 12 months.
   Agents are persona-driven, remember exposures (multi-touch), think and come
   back, and drop-offs feed the retargeting pool. Funnel reflects the shipped
   product: auto-advance + validations-removed onboarding, annual-default paywall.

   Env knobs: MONTHS, RUNS, DAILY (total $/day), CHURN, PAYWARM, GROWTH (monthly
   budget multiplier), SEEDBASE. */

const MONTHS = Number(process.env.MONTHS || 12);
const RUNS = Number(process.env.RUNS || 8);
const DAILY = Number(process.env.DAILY || 30);   // total ad $/day across campaigns
const DAYS = 30;
const CHURN = Number(process.env.CHURN || 0.22); // monthly churn on monthly subs
const PAYWARM = Number(process.env.PAYWARM || 1.7); // retargeting pay-rate boost
const GROWTH = Number(process.env.GROWTH || 1.0); // monthly budget multiplier

const PM = 9.99, PA = 79, AI = 1.44;
const fee = (g, n) => g * 0.029 + n * 0.30;

let _s = 1;
const rnd = () => (_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const chance = (p) => rnd() < p;
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const gauss = (m, sd) => { let u = 0; while (!u) u = rnd(); return m + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
const tr = (m, sd) => clamp(gauss(m, sd));
const pick = (a) => a[Math.floor(rnd() * a.length)];

// Frequency response (diminishing after a few views) + creative fatigue over months.
const EXP = { 1: 1, 2: 1.3, 3: 1.2, 4: 0.85, 5: 0.55, 6: 0.35 };
const exp = (n) => EXP[Math.min(n, 6)] ?? 0.3;

const MINDS = [
  { id: "Anxious returner",    w: .26, ctr: .018, intent: .72, pat: .62, trust: .55, price: .65, tech: .55, ab: 0 },
  { id: "Pragmatic switcher",  w: .18, ctr: .014, intent: .70, pat: .66, trust: .62, price: .50, tech: .70, ab: .06 },
  { id: "Skeptical veteran",   w: .20, ctr: .013, intent: .66, pat: .55, trust: .38, price: .55, tech: .65, ab: 0 },
  { id: "Eager climber",       w: .12, ctr: .012, intent: .80, pat: .70, trust: .68, price: .35, tech: .78, ab: .10 },
  { id: "Budget-tight parent", w: .12, ctr: .015, intent: .68, pat: .50, trust: .50, price: .85, tech: .45, ab: -.05 },
  { id: "Casual scroller",     w: .12, ctr: .009, intent: .30, pat: .40, trust: .45, price: .60, tech: .65, ab: -.05 },
];
const newMind = () => { let r = rnd(), c = 0; for (const m of MINDS) { c += m.w; if (r <= c) return m; } return MINDS[0]; };

// Campaigns. share = fraction of the daily budget. Retargeting pulls from the
// dropper pool (people who showed intent but didn't pay), so it's warm + cheap.
// audience = 12-month addressable reach for the niche (not monthly reach).
const CHANNELS = [
  { id: "Prospecting", warm: false, share: 0.60, cpm: 14, ctrMult: 1.00, intentBias: 0.00, audience: 250000 },
  { id: "Lookalike",   warm: false, share: 0.25, cpm: 16, ctrMult: 1.15, intentBias: 0.08, audience: 100000 },
  { id: "Retargeting", warm: true,  share: 0.15, cpm: 9,  ctrMult: 2.40, intentBias: 0.12, audience: 0 },
];

const PAGES = ["click", "lp", "onb_start", "onb_done", "acct", "paywall", "paid"];

function makeAgent() {
  const m = newMind();
  return {
    m, seen: 0, paid: false, dropped: false, stage: null, onboarded: false,
    dev: chance(.75) ? "mobile" : "desktop",
    intent: tr(m.intent, .12), pat: tr(m.pat, .12), trust: tr(m.trust, .12),
    price: tr(m.price, .12), tech: tr(m.tech, .12),
    aiMo: clamp(gauss(24, 13), 4, 75) * 0.06, // $/mo Anthropic (Haiku + minimal output)
  };
}

// One visit through the funnel. Warm (retargeted) agents skip re-onboarding.
function funnel(a, warm, F) {
  F.click++;
  const mob = a.dev === "mobile";
  if (!chance(mob ? .84 : .88)) { a.stage = "lp"; return; }
  F.lp++;
  if (!warm && !a.onboarded) {
    if (!chance(clamp(.52 * (.4 + a.intent)))) { a.stage = "onb_start"; return; }
    F.onb_start++;
    if (!chance(0.71)) { a.stage = "onb_done"; return; }   // improved completion
    F.onb_done++;
    if (!chance(clamp(.58 + a.trust * .4))) { a.stage = "acct"; return; }
    F.acct++;
    a.onboarded = true;
  } else {
    F.onb_start++; F.onb_done++; F.acct++; // warm already did these
  }
  if (!chance(.96)) { a.stage = "paywall_reach"; return; }
  F.paywall++;
  const pPay = clamp((warm ? PAYWARM : 1) * .18 * (.4 + a.trust * .6) * (1 - a.price * .55) *
    (mob ? (.72 + a.tech * .28) : 1) * (1 + a.intent * .2 - .1));
  if (!chance(pPay)) { a.stage = "paywall"; return; }
  F.paid++;
  a.paid = true;
  const pAnnual = clamp(.50 + (1 - a.price) * .12 + a.m.ab + a.intent * .04); // annual-default tilt
  a.plan = chance(pAnnual) ? "annual" : "monthly";
}

function runOnce() {
  const F = Object.fromEntries(PAGES.map((p) => [p, 0]));
  const chStat = {}; CHANNELS.forEach((c) => chStat[c.id] = { spend: 0, impr: 0, clicks: 0, paid: 0, mo: 0, an: 0 });
  const mindStat = {}; MINDS.forEach((m) => mindStat[m.id] = { clicks: 0, paid: 0 });
  const pools = { Prospecting: [], Lookalike: [] };
  const droppers = []; // agents who showed intent but didn't pay (retargeting fuel)
  let createdP = 0, createdL = 0;

  // subscriber book
  let monthlySubs = 0;
  const annualBook = []; // {count, left}
  const monthly = []; // P&L rows
  let budget = DAILY * DAYS;
  let cumProfit = -0; // we account spend inside each month

  for (let mo = 0; mo < MONTHS; mo++) {
    const spendThis = budget;
    let newMoSubs = 0, newAnSubs = 0;

    for (const ch of CHANNELS) {
      const chSpend = spendThis * ch.share;
      chStat[ch.id].spend += chSpend;
      const impr = Math.round((chSpend / ch.cpm) * 1000);
      chStat[ch.id].impr += impr;
      const pool = ch.warm ? droppers : pools[ch.id];

      for (let i = 0; i < impr; i++) {
        let a = null;
        if (ch.warm) {
          // retargeting: re-serve a dropper who hasn't paid
          // retargeting is frequency-capped too (don't hammer the same dropper)
          for (let t = 0; t < 4; t++) { const c = pick(pool); if (c && !c.paid && c.seen < 9) { a = c; break; } }
          if (!a) continue; // pool empty/exhausted this pass
        } else {
          const cap = ch.audience;
          const created = ch.id === "Prospecting" ? createdP : createdL;
          const pNew = Math.max(.08, (cap - created) / cap);
          if (chance(pNew) && created < cap) {
            a = makeAgent(); a.channel = ch.id; pool.push(a);
            if (ch.id === "Prospecting") createdP++; else createdL++;
          } else {
            for (let t = 0; t < 4; t++) { const c = pick(pool); if (c && !c.paid && c.seen < 7) { a = c; break; } }
            if (!a) continue;
          }
        }

        a.seen++;
        // thinkers: repeat exposure nudges intent up
        if (a.seen > 1 && (a.dropped || a.stage)) a.intent = clamp(a.intent + .02);
        const fatigue = clamp(1 - mo * 0.015, 0.7, 1); // creatives wear slightly over months
        const ctr = a.m.ctr * ch.ctrMult * exp(a.seen) * (a.dev === "mobile" ? 1 : .95) * fatigue
          * (1 + ch.intentBias);
        if (!chance(ctr)) continue;

        chStat[ch.id].clicks++; mindStat[a.m.id].clicks++;
        const before = a.paid;
        funnel(a, ch.warm, F);
        if (a.paid && !before) {
          chStat[ch.id].paid++; mindStat[a.m.id].paid++;
          if (a.plan === "annual") { newAnSubs++; chStat[ch.id].an++; } else { newMoSubs++; chStat[ch.id].mo++; }
        } else if (!a.paid && a.stage && a.stage !== "lp" && !a.dropped) {
          a.dropped = true; droppers.push(a); // showed intent -> retarget later
        }
      }
    }

    // ---- end of month: book the new subs, accrue revenue, churn ----
    monthlySubs += newMoSubs;
    annualBook.push({ count: newAnSubs, left: 12 });
    const activeAnnual = annualBook.reduce((s, b) => s + (b.left > 0 ? b.count : 0), 0);

    const monthlyRev = monthlySubs * PM;
    const annualUpfront = newAnSubs * PA;
    const stripe = fee(monthlyRev, monthlySubs) + fee(annualUpfront, newAnSubs);
    const aiCost = (monthlySubs + activeAnnual) * AI;
    const net = monthlyRev + annualUpfront - stripe - aiCost - spendThis;
    cumProfit += net;
    monthly.push({
      mo, spend: spendThis, newMo: newMoSubs, newAn: newAnSubs,
      activeMo: monthlySubs, activeAn: activeAnnual, rev: monthlyRev + annualUpfront,
      net, cum: cumProfit,
    });

    // churn monthly subs; age annual book; scale next budget
    monthlySubs *= (1 - CHURN);
    annualBook.forEach((b) => b.left--);
    budget *= GROWTH;
  }

  const paid = CHANNELS.reduce((s, c) => s + chStat[c.id].paid, 0);
  return { F, chStat, mindStat, monthly, paid, createdP, createdL, dropperCount: droppers.length };
}

// ---- average over RUNS ----
const acc = { F: {}, chStat: {}, mindStat: {}, monthly: [] };
PAGES.forEach((p) => acc.F[p] = 0);
CHANNELS.forEach((c) => acc.chStat[c.id] = { spend: 0, impr: 0, clicks: 0, paid: 0, mo: 0, an: 0 });
MINDS.forEach((m) => acc.mindStat[m.id] = { clicks: 0, paid: 0 });
for (let mo = 0; mo < MONTHS; mo++) acc.monthly[mo] = { spend: 0, newMo: 0, newAn: 0, activeMo: 0, activeAn: 0, rev: 0, net: 0, cum: 0 };
let sPaid = 0, sDrop = 0;

const SEEDBASE = Number(process.env.SEEDBASE || 1000);
for (let r = 0; r < RUNS; r++) {
  _s = SEEDBASE + r * 7919;
  const c = runOnce();
  PAGES.forEach((p) => acc.F[p] += c.F[p]);
  for (const k in c.chStat) for (const f in c.chStat[k]) acc.chStat[k][f] += c.chStat[k][f];
  for (const k in c.mindStat) { acc.mindStat[k].clicks += c.mindStat[k].clicks; acc.mindStat[k].paid += c.mindStat[k].paid; }
  c.monthly.forEach((m, i) => { for (const f in m) acc.monthly[i][f] += m[f]; });
  sPaid += c.paid; sDrop += c.dropperCount;
}

const A = (x) => x / RUNS, f = (n, d = 0) => Number(n).toFixed(d);
const pc = (n, den) => (den ? (n / den * 100).toFixed(1) + "%" : "—");
const $ = (n) => "$" + f(n);

console.log("================ COMPREHENSIVE MULTI-CAMPAIGN MODEL ================");
console.log("  %s months | $%s/day across %s campaigns | %s churn | avg of %s runs\n",
  MONTHS, DAILY, CHANNELS.length, pc(CHURN, 1), RUNS);

console.log("===== CAMPAIGNS (totals over %s months) =====", MONTHS);
console.log("  Campaign      Spend     Impr      Clicks   CTR     Paid   CAC      Annual%");
console.log("  " + "-".repeat(78));
let tSpend = 0, tPaid = 0;
for (const ch of CHANNELS) {
  const s = acc.chStat[ch.id];
  const spend = A(s.spend), paid = A(s.paid), clicks = A(s.clicks), impr = A(s.impr);
  tSpend += spend; tPaid += paid;
  console.log("  %s %s %s %s %s %s %s %s",
    ch.id.padEnd(12), $(spend).padStart(8), f(impr).padStart(9), f(clicks).padStart(7),
    pc(clicks, impr).padStart(6), f(paid, 1).padStart(6), ("$" + f(paid ? spend / paid : 0, 2)).padStart(8),
    pc(s.an, s.an + s.mo).padStart(7));
}
console.log("  " + "-".repeat(78));
console.log("  %s %s %s %s %s %s %s",
  "BLENDED".padEnd(12), $(tSpend).padStart(8), "".padStart(9), "".padStart(7), "".padStart(6),
  f(tPaid, 1).padStart(6), ("$" + f(tSpend / tPaid, 2)).padStart(8));

console.log("\n===== BLENDED PAGE-BY-PAGE FUNNEL (all clicks, all months) =====");
const L = { click: "Ad click", lp: "Landing viewed", onb_start: "Started onboarding", onb_done: "Finished questions", acct: "Created account", paywall: "Reached paywall", paid: "Subscribed" };
let prev = 0;
PAGES.forEach((p, i) => {
  const v = A(acc.F[p]);
  const seg = i === 0 ? "" : "  ↓ " + pc(prev - v, prev) + " drop";
  console.log("  %s %s%s", L[p].padEnd(20), f(v).padStart(8), seg);
  prev = v;
});
console.log("  Net click→paid: %s | retargeting pool built: ~%s/run", pc(acc.F.paid, acc.F.click), f(A(sDrop)));

console.log("\n===== CONVERSION BY MINDSET =====");
Object.entries(acc.mindStat).sort((a, b) => b[1].paid - a[1].paid).forEach(([k, v]) =>
  console.log("  %s | clicks %s | paid %s | clicker→paid %s",
    k.padEnd(20), f(A(v.clicks)).padStart(5), f(A(v.paid), 1).padStart(5), pc(v.paid, v.clicks)));

console.log("\n===== 12-MONTH P&L (blended, all campaigns) =====");
console.log("  Mo | AdSpend | NewMo | NewAn | ActiveMo | ActiveAn | Revenue |  Net   | Cumulative");
acc.monthly.forEach((m, i) => {
  console.log("  %s | %s | %s | %s | %s | %s | %s | %s | %s",
    String(i).padStart(2), $(A(m.spend)).padStart(7), f(A(m.newMo), 1).padStart(5), f(A(m.newAn), 1).padStart(5),
    f(A(m.activeMo), 1).padStart(8), f(A(m.activeAn), 1).padStart(8), $(A(m.rev)).padStart(7),
    (A(m.net) >= 0 ? " " : "") + $(A(m.net)).padStart(6), $(A(m.cum)).padStart(9) + (A(m.cum) >= 0 ? " ✅" : ""));
});

const totalSpend = acc.monthly.reduce((s, m) => s + A(m.spend), 0);
const totalRev = acc.monthly.reduce((s, m) => s + A(m.rev), 0);
const endCum = A(acc.monthly[MONTHS - 1].cum);
const beMonth = acc.monthly.findIndex((m) => A(m.cum) >= 0);
const ltv = totalRev / Math.max(A(sPaid), 1);
console.log("\n===== UNIT ECONOMICS (over %s months) =====", MONTHS);
console.log("  Total ad spend: %s | total revenue: %s | PROFIT: %s", $(totalSpend), $(totalRev), $(endCum));
console.log("  Paid subs: %s | blended CAC: %s | rev/sub: %s", f(A(sPaid)), $(totalSpend / Math.max(A(sPaid), 1)), $(ltv));
console.log("  ROAS: %sx | break-even: %s",
  f(totalRev / totalSpend, 2), beMonth < 0 ? "not within window" : "month " + beMonth);
