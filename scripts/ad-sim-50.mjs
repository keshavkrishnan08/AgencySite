/* $50/week Meta ads simulation for Axon Careers.
 *
 * Two questions:
 *   1. What does $50/week actually buy — reach, funnel, CAC, LTV:CAC?
 *   2. Where should the conversion pixel optimize (landing / mid-onboarding /
 *      Lead / registration / checkout / purchase)? The optimization event is the
 *      single biggest lever on quality AND on whether Meta can learn at all.
 *
 * Grounded in this repo: the funnel step-rates come from scripts/abm-1000.mjs,
 * blended LTV ($86) from scripts/unit-economics.mjs, CPM/CTR from the persona
 * mix. Modeled, not measured — the live Mixpanel funnel replaces it once ads run.
 *
 *   node scripts/ad-sim-50.mjs
 */

// ── media inputs ──
const WEEK = 50;             // $/week
const CPM = 14;              // $ per 1,000 impressions
const CTR = 0.0141;         // click-through
const FREQ = 1.8;            // avg impressions per person (for unique reach)
const CPC = CPM / 1000 / CTR;
const LTV = 86;              // blended contribution-margin LTV per subscriber
const BASE_CONV = 0.013;     // cold land->paid (1.3%)
const LEARN = 50;            // Meta events/week to exit the learning phase

const f = (n, d = 2) => "$" + Number(n).toFixed(d);
const n0 = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
const n1 = (n) => Number(n).toFixed(1);
const x = (n) => n.toFixed(2) + "x";
const pad = (s, w) => String(s).padEnd(w);

// ── weekly & monthly reach at $50/week ──
const imprWk = (WEEK / CPM) * 1000;
const clicksWk = imprWk * CTR;
const reachWk = imprWk / FREQ;
const wpm = 52 / 12; // weeks per month

console.log("\n================ $50/week — the media it buys ================\n");
console.log(`  CPC ${f(CPC)}  ·  CPM ${f(CPM)}  ·  CTR ${(CTR * 100).toFixed(2)}%\n`);
console.log(`  ${pad("", 18)} ${pad("per week", 14)} per month`);
console.log(`  ${pad("Impressions", 18)} ${pad(n0(imprWk), 14)} ${n0(imprWk * wpm)}`);
console.log(`  ${pad("Unique reach", 18)} ${pad("~" + n0(reachWk), 14)} ~${n0(reachWk * wpm)}`);
console.log(`  ${pad("Landing clicks", 18)} ${pad(n0(clicksWk), 14)} ${n0(clicksWk * wpm)}`);

// ── base funnel (cold, unoptimised) ──
const FUNNEL = [
  ["Land on site", 1.0],
  ["Start onboarding", 0.727],
  ["Finish onboarding", 0.395],
  ["Create account", 0.158],
  ["First scored answer", 0.10],
  ["Subscribe", 0.013],
];
console.log("\n  ── funnel at this spend (monthly, cold) ──");
const clicksMo = clicksWk * wpm;
for (const [label, rate] of FUNNEL) {
  console.log(`  ${pad(label, 22)} ${pad(n1(clicksMo * rate), 8)} ${(rate * 100).toFixed(1)}%`);
}
const subsMoBase = clicksMo * BASE_CONV;
console.log(`\n  Cold: ${n1(subsMoBase)} subscribers/month · CAC ${f(WEEK * wpm / subsMoBase)} · LTV:CAC ${x(LTV / (WEEK * wpm / subsMoBase))}\n`);

// ── pixel placement: where you optimise ──
// stageRate = cumulative % of landers who fire this event (its funnel depth).
// depth = quality lift on land->paid IF Meta can fully optimise for it (deeper
//   event = higher-intent audience). ltvMult = deeper intent -> slightly better
//   retention. Realised lift is throttled by the learning phase: too few of the
//   event per week and Meta can't optimise, so the depth lift is largely wasted.
const PLACEMENTS = [
  ["Landing / traffic", "PageView", 1.0, 1.05, 1.0],
  ["Mid-onboarding (start)", "custom", 0.727, 1.3, 1.02],
  ["Onboarding done (email)", "Lead", 0.395, 1.75, 1.05],
  ["Account created", "CompleteRegistration", 0.158, 2.1, 1.08],
  ["Reached payment", "InitiateCheckout", 0.03, 2.7, 1.1],
  ["Purchase", "Subscribe", 0.013, 3.3, 1.15],
];
// L = how much of the 50-events/week learning threshold this event meets.
const learnL = (evWk) => Math.min(1, evWk / LEARN);
function learnTag(L) {
  if (L >= 1) return "optimises";
  if (L >= 0.6) return "near";
  if (L >= 0.3) return "slow";
  if (L >= 0.15) return "starved";
  return "can't learn";
}

console.log("================ Where to put the conversion pixel (at $50/wk) ================\n");
console.log(`  ${pad("optimise for", 24)} ${pad("Meta event", 14)} ${pad("ev/wk", 7)} ${pad("learn", 11)} ${pad("land→paid", 10)} ${pad("subs/mo", 8)} ${pad("CAC", 9)} LTV:CAC`);
let best = null;
for (const [name, ev, stageRate, depth, ltvMult] of PLACEMENTS) {
  const evWk = clicksWk * stageRate;         // weekly count of the optimisation event
  const L = learnL(evWk);
  // Two forces: the depth quality-lift is only realised as far as Meta learns
  // (1 + (depth-1)*L), and an ad set stuck in learning delivers broad & wastes
  // budget (0.5 + 0.5*L). Optimise for an event you can't feed and BOTH collapse.
  const conv = BASE_CONV * (1 + (depth - 1) * L) * (0.5 + 0.5 * L);
  const subsMo = clicksMo * conv;
  const cac = (WEEK * wpm) / subsMo;
  const ltv = LTV * ltvMult;
  const ratio = ltv / cac;
  if (!best || ratio > best.ratio) best = { name, ratio, cac, subsMo };
  console.log(
    `  ${pad(name, 24)} ${pad(ev, 14)} ${pad(n1(evWk), 7)} ${pad(learnTag(L), 11)} ${pad((conv * 100).toFixed(2) + "%", 10)} ${pad(n1(subsMo), 8)} ${pad(f(cac), 9)} ${x(ratio)}`
  );
}
console.log(`\n  Best at $50/wk: optimise for "${best.name}" → CAC ${f(best.cac)}, ${n1(best.subsMo)} subs/mo.`);
console.log("  Deeper events (checkout / purchase) look great on paper but only fire a");
console.log("  handful of times a week — Meta never exits learning, so their lift evaporates.\n");

// ── budget ladder: the deepest event you can afford to optimise ──
// You need ~50 of the optimisation event per week for Meta to learn.
console.log("================ Budget ladder — optimise deeper as you scale ================\n");
console.log("  (min weekly $ to feed each event 50 conversions/week, then its CAC once learned)\n");
console.log(`  ${pad("optimise for", 24)} ${pad("needs/wk", 10)} ${pad("clean CAC", 11)} ${pad("LTV:CAC", 9)} verdict`);
for (const [name, ev, stageRate, depth, ltvMult] of PLACEMENTS) {
  const clicksNeeded = LEARN / stageRate;
  const budgetNeeded = clicksNeeded * CPC;
  const conv = BASE_CONV * depth;              // fully learned -> full depth lift
  const cac = CPC / conv;                      // CAC once optimised
  const ratio = (LTV * ltvMult) / cac;
  const verdict = ratio >= 3 ? "pour fuel" : ratio >= 1.5 ? "works" : ratio >= 1 ? "thin" : "underwater";
  console.log(
    `  ${pad(name, 24)} ${pad(f(budgetNeeded, 0) + "/wk", 10)} ${pad(f(cac), 11)} ${pad(x(ratio), 9)} ${verdict}`
  );
}

console.log("\n  Read: at $50/wk you can only feed the top of the funnel. Optimising for a");
console.log("  Lead (email) needs ~$125/wk; account-created ~$315/wk; true Purchase");
console.log("  optimisation needs ~$3.8k/wk. CAC falls as you climb because deeper");
console.log("  optimisation delivers higher-intent people — but only once volume lets Meta learn.\n");

// ── timeline at $50/week ──
console.log("================ What $50/week means in practice ================\n");
const subsMoBest = best.subsMo;
console.log(`  • ~${n0(reachWk * wpm)} people reached/month, ~${n0(clicksMo)} land on the site.`);
console.log(`  • ~${n1(subsMoBest)} paying subscribers/month at the best pixel placement.`);
console.log(`  • First customer in ~${n1(4 / subsMoBest)} months; ~${n0(subsMoBest * 12)} subscribers in year one.`);
console.log(`  • CAC ~${f(best.cac)} vs LTV ${f(LTV)} → roughly break-even; you're buying DATA, not profit.`);
console.log(`  • ~${n0(clicksWk)} clicks/week is far below Meta's learning threshold — expect noisy,`);
console.log(`    slow optimisation. $50/wk is a validation budget, not a growth budget.\n`);
