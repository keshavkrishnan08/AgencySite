/* Agent-based simulation of 1,000 diverse users meeting Axon Careers.
 *
 * Each user is a persona (role family, seniority, tech-savvy, anxiety, urgency,
 * age, situation, price sensitivity, device). For every real app feature we
 * model persona-feature fit → who loves it, uses it, or ignores it. We also
 * model UNMET needs → the features people wish existed. Deterministic (seeded).
 *
 *   node scripts/user-sim-1000.mjs
 */

// ── seeded RNG (reproducible) ──
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260725);
const pick = (weighted) => {
  const r = rng();
  let acc = 0;
  for (const [val, w] of weighted) { acc += w; if (r <= acc) return val; }
  return weighted[weighted.length - 1][0];
};

// ── persona distributions ──
const ROLE = [["management", .13], ["healthcare", .12], ["sales", .09], ["tech", .11], ["finance", .08],
  ["education", .08], ["support", .08], ["trades", .07], ["admin", .07], ["creative", .05],
  ["hospitality", .06], ["legal", .03], ["generic", .03]];
const SENIORITY = [["entry", .32], ["mid", .40], ["senior", .20], ["exec", .08]];
const TECH = [["low", .25], ["med", .45], ["high", .30]];
const ANX = [["low", .25], ["med", .40], ["high", .35]];
const URGENCY = [["this_week", .15], ["month", .35], ["none", .50]];
const AGE = [["18-25", .20], ["26-35", .40], ["36-50", .28], ["50+", .12]];
const SIT = [["first_job", .12], ["career_change", .20], ["laid_off", .18], ["promotion", .16],
  ["returning", .16], ["exploring", .18]];
const PRICE = [["low", .20], ["med", .45], ["high", .35]];
const DEVICE = [["mobile", .55], ["desktop", .45]];

function makeUser() {
  return {
    role: pick(ROLE), sen: pick(SENIORITY), tech: pick(TECH), anx: pick(ANX),
    urg: pick(URGENCY), age: pick(AGE), sit: pick(SIT), price: pick(PRICE), device: pick(DEVICE),
  };
}
const hasGap = (u) => u.sit === "returning" || u.sit === "laid_off" || u.sit === "career_change";

// ── features (real, in the app) → fit(u) in 0..1 ──
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const T = { low: 0, med: 0.5, high: 1 };
const FEATURES = [
  ["AI scoring & feedback", (u) => 0.7 + 0.2 * T[u.tech]],
  ["Practice sessions (core)", () => 0.8],
  ["Anxiety Detector (filler words)", (u) => 0.35 + 0.6 * T[u.anx]],
  ["Voice practice", (u) => 0.3 + 0.5 * T[u.tech] + (u.device === "mobile" ? 0.1 : 0)],
  ["Follow-up questions", (u) => 0.5 + 0.25 * T[u.sen === "senior" || u.sen === "exec" ? "high" : "med"]],
  ["Question-type customization", (u) => 0.45 + 0.4 * T[u.tech]],
  ["Mock panel + scorecard", (u) => (u.sen === "senior" || u.sen === "exec" ? 0.8 : 0.4) ],
  ["Timed mode", (u) => 0.4 + 0.3 * T[u.anx] + (u.urg === "this_week" ? 0.2 : 0)],
  ["Storytelling drills", (u) => 0.45 + 0.2 * (u.sit === "career_change" ? 1 : 0)],
  ["Public speaking drills", (u) => 0.3 + 0.2 * T[u.tech]],
  ["Job Breakdown (role intel)", (u) => 0.55 + (u.sen === "entry" ? 0.3 : 0) + (u.sit === "career_change" ? 0.2 : 0)],
  ["Question Predictor", (u) => 0.45 + (u.urg !== "none" ? 0.35 : 0)],
  ["Gap Story Builder", (u) => (hasGap(u) ? 0.85 : 0.15)],
  ["Dashboard / metrics", (u) => 0.5 + 0.3 * T[u.tech]],
  ["Analytics (readiness, time-to-top-1%)", (u) => 0.4 + 0.4 * T[u.tech] + (u.role === "tech" || u.role === "finance" ? 0.1 : 0)],
  ["Weekly market insights", (u) => 0.5 + (u.urg === "none" ? 0.2 : 0)],
  ["Preferences / deep customization", (u) => 0.35 + 0.45 * T[u.tech]],
  ["Routines & presets", (u) => 0.35 + 0.35 * T[u.tech]],
  ["Review / spaced repetition", (u) => 0.45 + 0.25 * T[u.tech]],
  ["Streaks & consistency", (u) => 0.5 + (u.age === "18-25" ? 0.2 : 0)],
];

// ── unmet needs → demand(u) in 0..1 ──
const MISSING = [
  ["Live human / peer mock interviews", (u) => 0.5 + 0.3 * T[u.anx]],
  ["Resume & cover-letter review", (u) => 0.55 + (u.sit === "laid_off" || u.sit === "first_job" ? 0.25 : 0)],
  ["Salary negotiation coaching", (u) => 0.4 + (u.sen === "senior" || u.sen === "exec" ? 0.3 : 0) + (u.price === "high" ? 0.1 : 0)],
  ["Video practice + body-language read", (u) => 0.4 + 0.3 * T[u.tech]],
  ["Company-specific prep (named employers)", (u) => 0.5 + (u.urg !== "none" ? 0.3 : 0)],
  ["Native mobile app / offline", (u) => (u.device === "mobile" ? 0.7 : 0.25)],
  ["Reminders & accountability nudges", (u) => 0.45 + 0.25 * T[u.anx]],
  ["Real-time feedback while you answer", (u) => 0.4 + 0.3 * T[u.tech]],
  ["ATS / keyword résumé optimizer", (u) => 0.35 + (u.role === "tech" || u.role === "admin" ? 0.25 : 0)],
  ["Community / leaderboard", (u) => 0.3 + (u.age === "18-25" ? 0.3 : 0)],
  ["Application & interview tracker", (u) => 0.45 + (u.urg !== "none" ? 0.2 : 0)],
  ["Share progress with a coach/mentor", (u) => 0.3 + (u.sit === "first_job" ? 0.2 : 0)],
  ["Multi-language support", (u) => 0.2 + (u.role === "trades" || u.role === "hospitality" ? 0.25 : 0)],
  ["Curated answer library for my role", (u) => 0.5 + (u.sen === "entry" ? 0.2 : 0)],
];

// ── run ──
const N = 1000;
const users = Array.from({ length: N }, makeUser);

const featStat = FEATURES.map(([name, fit]) => {
  let love = 0, use = 0, ignore = 0, sum = 0;
  for (const u of users) {
    const s = clamp01(fit(u));
    sum += s;
    if (s >= 0.7) love++; else if (s >= 0.4) use++; else ignore++;
  }
  return { name, love, use, ignore, avg: sum / N };
}).sort((a, b) => b.avg - a.avg);

const missStat = MISSING.map(([name, dem]) => {
  let want = 0, sum = 0;
  for (const u of users) { const d = clamp01(dem(u)); sum += d; if (d >= 0.6) want++; }
  return { name, want, avg: sum / N };
}).sort((a, b) => b.avg - a.avg);

// overall: each user's satisfaction ≈ mean of their top-6 feature fits.
let promoters = 0, passives = 0, detractors = 0;
for (const u of users) {
  const fits = FEATURES.map(([, f]) => clamp01(f(u))).sort((a, b) => b - a);
  const top = fits.slice(0, 6).reduce((s, x) => s + x, 0) / 6;
  if (top >= 0.72) promoters++; else if (top >= 0.55) passives++; else detractors++;
}
const nps = Math.round(((promoters - detractors) / N) * 100);

const pct = (n) => ((n / N) * 100).toFixed(0) + "%";
const pad = (s, w) => String(s).padEnd(w);

console.log("\n================ 1,000-user simulation — feature reception ================\n");
console.log(`  ${pad("feature", 42)} ${pad("love", 6)} ${pad("use", 6)} ${pad("ignore", 7)} avg-fit`);
for (const f of featStat) {
  console.log(`  ${pad(f.name, 42)} ${pad(pct(f.love), 6)} ${pad(pct(f.use), 6)} ${pad(pct(f.ignore), 7)} ${(f.avg * 100).toFixed(0)}`);
}

console.log("\n================ What users say is MISSING (demand) ================\n");
console.log(`  ${pad("wished-for feature", 46)} ${pad("want it", 8)} demand`);
for (const m of missStat) {
  console.log(`  ${pad(m.name, 46)} ${pad(pct(m.want), 8)} ${(m.avg * 100).toFixed(0)}`);
}

console.log("\n================ Segments — who loves what ================\n");
const seg = (label, filt) => {
  const g = users.filter(filt);
  if (!g.length) return;
  const top = FEATURES.map(([name, f]) => [name, g.reduce((s, u) => s + clamp01(f(u)), 0) / g.length])
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n).join(", ");
  console.log(`  ${pad(label + ` (${g.length})`, 30)} → ${top}`);
};
seg("High anxiety", (u) => u.anx === "high");
seg("Entry-level", (u) => u.sen === "entry");
seg("Senior / exec", (u) => u.sen === "senior" || u.sen === "exec");
seg("Has an employment gap", hasGap);
seg("Interview this week", (u) => u.urg === "this_week");
seg("Low tech-savvy", (u) => u.tech === "low");
seg("Mobile-first", (u) => u.device === "mobile");

console.log("\n================ Verdict ================\n");
console.log(`  Sentiment: ${pct(promoters)} promoters · ${pct(passives)} passive · ${pct(detractors)} detractors  →  NPS ≈ ${nps}`);
console.log(`  Strongest: ${featStat.slice(0, 3).map((f) => f.name).join(", ")}.`);
console.log(`  Weakest fit: ${featStat.slice(-3).map((f) => f.name).join(", ")} (niche — fine, but not for everyone).`);
console.log(`  Biggest gaps to build next: ${missStat.slice(0, 3).map((m) => m.name).join("; ")}.`);
console.log(`  ~${pct(users.filter((u) => u.device === "mobile").length)} are mobile-first — a native/offline experience is the`);
console.log(`  single most-demanded thing the app doesn't have.\n`);
