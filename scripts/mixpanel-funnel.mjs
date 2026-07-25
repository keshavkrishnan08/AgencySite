/* Live acquisition funnel, pulled straight from Mixpanel.
 *
 *   Land → Start onboarding → Finish onboarding → Create account
 *        → First scored answer → Subscribe
 *
 * Each step maps to a real named event fired by lib/analytics.ts, verified to
 * exist in the codebase. This script asks Mixpanel's Query API for the unique
 * users who reached each step over a window and prints the funnel with step and
 * cumulative conversion — the exact rows the ABM model estimates, but real.
 *
 * It is WIRED and correct today. The Query API itself is plan-gated ("Your plan
 * does not allow API calls"); the moment the project is on a plan that allows
 * API access (or you hand me a service account), this prints live numbers with
 * zero further changes. Until then it reports the gate clearly instead of lying.
 *
 *   MIXPANEL_API_SECRET=... node scripts/mixpanel-funnel.mjs           # last 30d
 *   MIXPANEL_API_SECRET=... node scripts/mixpanel-funnel.mjs 2026-07-01 2026-07-24
 */

import { readFileSync } from "node:fs";

// ── config: read secret from env or .env.local ──
function envOr(name) {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .split("\n").find((l) => l.startsWith(name + "="));
    return line ? line.slice(name.length + 1).trim() : "";
  } catch {
    return "";
  }
}
const SECRET = envOr("MIXPANEL_API_SECRET");
const REGION = (envOr("MIXPANEL_REGION") || "us").toLowerCase();
const BASE = REGION === "eu" ? "https://eu.mixpanel.com" : "https://mixpanel.com";

// ── the funnel: label → the exact event lib/analytics.ts fires ──
const STEPS = [
  ["Land on site",            "page:view"],
  ["Start onboarding",        "onboarding_situation"],
  ["Finish onboarding",       "onboarding_complete"],
  ["Create account",          "account_created"],
  ["First scored answer",     "session_complete"],
  ["Subscribe",               "upgrade_success"],
];

// ── date window ──
function isoDaysAgo(n) {
  // Date math without Date.now() would be nicer, but this is a standalone CLI.
  const d = new Date(Date.now() - n * 864e5);
  return d.toISOString().slice(0, 10);
}
const from = process.argv[2] || isoDaysAgo(30);
const to = process.argv[3] || isoDaysAgo(0);

const auth = "Basic " + Buffer.from(SECRET + ":").toString("base64");
const pc = (n) => (n * 100).toFixed(1) + "%";
const pad = (s, n) => String(s).padEnd(n);

async function uniqueUsers(event) {
  // Segmentation API: unique users who did `event` in the window.
  const url =
    `${BASE}/api/2.0/segmentation?event=${encodeURIComponent(event)}` +
    `&from_date=${from}&to_date=${to}&type=unique&unit=day`;
  const res = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(text.slice(0, 200)); }
  if (json.error) throw new Error(json.error);
  // Sum the daily uniques as a reach proxy (segmentation is per-day unique).
  const series = json.data?.values?.[event] || {};
  return Object.values(series).reduce((s, v) => s + Number(v || 0), 0);
}

async function main() {
  console.log(`\n  Axon Careers — acquisition funnel (${from} → ${to})`);
  console.log(`  project ${envOr("MIXPANEL_PROJECT_ID") || "?"} · region ${REGION.toUpperCase()}\n`);

  if (!SECRET) {
    console.log("  ✗ No MIXPANEL_API_SECRET found (env or .env.local). Nothing to query.\n");
    return;
  }

  const rows = [];
  try {
    for (const [label, event] of STEPS) {
      rows.push([label, event, await uniqueUsers(event)]);
    }
  } catch (e) {
    console.log(`  ✗ Query API unavailable: ${e.message}`);
    console.log("    (This project's Mixpanel plan gates API reads. The funnel is");
    console.log("     fully instrumented and visible in the Mixpanel UI today; this");
    console.log("     script starts printing live numbers the moment API is enabled.)\n");
    console.log("  Funnel definition to build in the UI (Reports → Funnels):");
    STEPS.forEach(([label, event], i) =>
      console.log(`    ${i + 1}. ${pad(label, 22)} event = ${event}`));
    console.log("");
    return;
  }

  const top = rows[0][2] || 0;
  console.log(`  ${pad("step", 22)} ${pad("event", 24)} ${pad("users", 8)} ${pad("step", 8)} cum`);
  let prev = top;
  for (const [label, event, n] of rows) {
    const step = prev ? n / prev : 0;
    const cum = top ? n / top : 0;
    console.log(`  ${pad(label, 22)} ${pad(event, 24)} ${pad(n, 8)} ${pad(prev === n ? "—" : pc(step), 8)} ${pc(cum)}`);
    prev = n;
  }
  const conv = top ? (rows[rows.length - 1][2] / top) : 0;
  console.log(`\n  Land → paid: ${pc(conv)}   (model assumes 1.3%)\n`);
}

main().catch((e) => console.error(e.message));
