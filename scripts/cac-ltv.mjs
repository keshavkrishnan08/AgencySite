/* Axon Careers — CAC / LTV snapshot at the current shipped state.
   Funnel: auto-advance + validations-removed onboarding, annual-default paywall.
   Numbers come from the no-trial ABM (single campaign) and the comprehensive
   3-campaign model (blended). */

const PM = 9.99, PA = 79, AI = 1.44;
const fee = (g) => g * 0.029 + 0.30;

const CAC_SINGLE = 35.43;   // one prospecting campaign at $30/day
const CAC_BLENDED = 23.51;  // prospecting + lookalike + retargeting
const CHURN = 0.22;         // monthly churn on monthly subs
const ANNUAL = 0.60;        // annual share (annual-default paywall)

const netMonthly = PM - fee(PM) - AI;          // monthly sub net / month
const ltvMonthly = netMonthly / CHURN;          // geometric lifetime
const ltvAnnual = PA - fee(PA) - AI * 12;       // net over the locked year
const ltvBlended = (1 - ANNUAL) * ltvMonthly + ANNUAL * ltvAnnual;

const f = (n, d = 2) => Number(n).toFixed(d);
const ratio = (cac) => f(ltvBlended / cac);
const payback = (cac) => {
  // months for a blended new sub to repay CAC: annual repays instantly (prepaid),
  // monthly repays over time at netMonthly/mo.
  const monthlyMonths = cac / netMonthly;
  return (1 - ANNUAL) * monthlyMonths + ANNUAL * 0; // annual = month 0
};

console.log("============== CAC / LTV — current shipped state ==============\n");
console.log("  Plan mix: %s%% annual / %s%% monthly | monthly churn %s%%\n",
  f(ANNUAL * 100, 0), f((1 - ANNUAL) * 100, 0), f(CHURN * 100, 0));

console.log("  LTV (net contribution)");
console.log("    Monthly sub: $%s/mo net  ->  LTV $%s   (lives ~%s months)", f(netMonthly), f(ltvMonthly), f(1 / CHURN, 1));
console.log("    Annual sub:  prepaid year  ->  LTV $%s", f(ltvAnnual));
console.log("    BLENDED LTV: $%s\n", f(ltvBlended));

console.log("  CAC");
console.log("    Single campaign (prospecting only): $%s", f(CAC_SINGLE));
console.log("    Blended (prospecting+lookalike+retargeting): $%s\n", f(CAC_BLENDED));

console.log("  LTV : CAC");
console.log("    vs single CAC  $%s  ->  %sx  (payback ~%s mo)", f(CAC_SINGLE), ratio(CAC_SINGLE), f(payback(CAC_SINGLE), 1));
console.log("    vs blended CAC $%s  ->  %sx  (payback ~%s mo)", f(CAC_BLENDED), ratio(CAC_BLENDED), f(payback(CAC_BLENDED), 1));

console.log("\n  Rule of thumb: LTV:CAC > 3 = pour fuel; 1-3 = works, tune it; < 1 = stop.");
console.log("  Blended channels (%sx) are healthy; prospecting-only (%sx) is thinner.",
  ratio(CAC_BLENDED), ratio(CAC_SINGLE));
