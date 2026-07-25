/* Per-user Anthropic API cost model for Axon Careers.
 *
 * Every AI call in the app uses Claude Haiku 4.5 (claude-haiku-4-5-20251001) —
 * the code hard-floors the model to Haiku and rejects Opus. Pricing:
 *   input  $1.00 / M tokens
 *   output $5.00 / M tokens
 *
 * Token estimates are per-call (system + user in; completion out), grounded in
 * each route's maxTokens and prompt size. Output is estimated at typical actual
 * completion length, not the maxTokens ceiling (models rarely hit it), with a
 * little headroom. No prompt caching assumed (the app doesn't use it), so these
 * are slightly conservative — real cost trends lower.
 *
 *   node scripts/api-cost.mjs
 */

const IN = 1.0 / 1e6; // $ per input token
const OUT = 5.0 / 1e6; // $ per output token

// [inputTokens, outputTokens] per call, per route.
const CALL = {
  generate_questions: [950, 850],   // maxTokens 1100; arc + candidate block + knobs
  score_answer:       [850, 260],   // maxTokens 320;  rubric system + question + answer
  follow_up_gen:      [520, 80],    // maxTokens 220;  one probing question
  generate_example:   [320, 270],   // maxTokens 360;  one model answer
  insights:           [260, 380],   // maxTokens 420;  weekly synopsis
  question_predictor: [1400, 900],  // maxTokens 1100; posting can be long
  gap_story:          [650, 620],   // maxTokens 700;  3 story versions
};
const costOf = ([i, o]) => i * IN + o * OUT;
const c = (n) => "$" + n.toFixed(4);
const c2 = (n) => "$" + n.toFixed(2);
const pad = (s, n) => String(s).padEnd(n);

// ── Per-call costs ──
console.log("\n================ Anthropic cost per call (Haiku 4.5) ================\n");
console.log(`  ${pad("call", 22)} ${pad("in tok", 8)} ${pad("out tok", 8)} cost`);
for (const [k, v] of Object.entries(CALL)) {
  console.log(`  ${pad(k, 22)} ${pad(v[0], 8)} ${pad(v[1], 8)} ${c(costOf(v))}`);
}

// ── A single HEAVY practice session ──
// Full 8-question session where the user engages deeply: answers, follow-ups,
// and opens example answers.
const SESSION = {
  generate_questions: 1,   // 1 set of questions
  score_answer: 12,        // 8 main answers + 4 answered follow-ups
  follow_up_gen: 7,        // one follow-up generated per non-closer question
  generate_example: 4,     // opens the "example answer" on ~half
};
const sessionCost = Object.entries(SESSION).reduce((s, [k, n]) => s + n * costOf(CALL[k]), 0);

console.log("\n================ One HEAVY practice session ================\n");
console.log(`  ${pad("call", 22)} ${pad("count", 7)} subtotal`);
for (const [k, n] of Object.entries(SESSION)) {
  console.log(`  ${pad(k, 22)} ${pad(n, 7)} ${c(n * costOf(CALL[k]))}`);
}
console.log(`  ${pad("", 22)} ${pad("", 7)} ─────────`);
console.log(`  ${pad("per heavy session", 22)} ${pad("", 7)} ${c(sessionCost)}\n`);

// ── Monthly cost by user intensity ──
// sessions/month + periodic tool + weekly insights use.
const SCENARIOS = [
  ["Average user",  12, { insights: 4, question_predictor: 1, gap_story: 1 }],
  ["Heavy user",    60, { insights: 4, question_predictor: 6, gap_story: 3 }],
  ["Power user",   120, { insights: 4, question_predictor: 12, gap_story: 4 }],
];

console.log("================ Monthly API cost per user ================\n");
console.log(`  ${pad("profile", 16)} ${pad("sessions", 10)} ${pad("session $", 11)} ${pad("other $", 10)} ${pad("TOTAL/mo", 10)} per session`);
for (const [name, sessions, extra] of SCENARIOS) {
  const sCost = sessions * sessionCost;
  const eCost = Object.entries(extra).reduce((s, [k, n]) => s + n * costOf(CALL[k]), 0);
  const total = sCost + eCost;
  console.log(
    `  ${pad(name, 16)} ${pad(sessions, 10)} ${pad(c2(sCost), 11)} ${pad(c2(eCost), 10)} ${pad(c2(total), 10)} ${c(total / sessions)}`
  );
}

// ── Heavy user vs revenue ──
const heavyMonthly = 60 * sessionCost + [["insights", 4], ["question_predictor", 6], ["gap_story", 3]]
  .reduce((s, [k, n]) => s + n * costOf(CALL[k]), 0);
console.log("\n================ Heavy user economics ================\n");
const prices = [["Monthly $18.97", 18.97, 1], ["3-month $49.97", 49.97, 3], ["Yearly $119", 119, 12]];
console.log(`  ${pad("plan", 18)} ${pad("mo revenue", 12)} ${pad("mo API", 9)} ${pad("API % of rev", 13)} gross margin`);
for (const [label, price, months] of prices) {
  const moRev = price / months;
  const pct = (heavyMonthly / moRev) * 100;
  console.log(`  ${pad(label, 18)} ${pad(c2(moRev), 12)} ${pad(c2(heavyMonthly), 9)} ${pad(pct.toFixed(1) + "%", 13)} ${(100 - pct).toFixed(1)}%`);
}
console.log(`\n  A heavy user (2 sessions/day) costs ~${c2(heavyMonthly)}/mo in API — comfortably`);
console.log(`  inside the ~$1.44 blended COGS, because the average user runs far lighter`);
console.log(`  and the offline heuristic path (no AI) costs $0.\n`);
