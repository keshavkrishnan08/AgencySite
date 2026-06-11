/* Payment lifecycle audit: every subscription state/permutation -> correct
   premium decision (access granted while paid, REVOKED when the period ends),
   plus a real browser grant->revoke. */
import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:3000";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const svc = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log("  ✅ " + l); } else { fail++; console.log("  ❌ " + l); } };
const future = new Date(Date.now() + 30 * 864e5).toISOString();
const past = new Date(Date.now() - 864e5).toISOString();
const email = `qa-pay-${Date.now()}@example.com`;
const enc = encodeURIComponent(email);

const delSubs = () => fetch(`${SB}/rest/v1/subscriptions?email=eq.${enc}`, { method: "DELETE", headers: svc });
const setSub = async (status, period) => {
  await delSubs();
  await fetch(`${SB}/rest/v1/subscriptions`, { method: "POST", headers: { ...svc, Prefer: "return=minimal" }, body: JSON.stringify({ email, status, plan: status === "active" || status === "trialing" ? "premium" : "free", current_period_end: period, stripe_subscription_id: "sub_" + status + "_" + Date.now(), updated_at: new Date().toISOString() }) });
};
const checkStatus = async () => (await (await fetch(`${BASE}/api/subscription-status`, { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": email } })).json());

console.log("=== PAYMENT LIFECYCLE MATRIX (premium = access?) ===");
const cases = [
  ["active", future, true, "active + future period -> GRANTED"],
  ["active", null, true, "active + no period yet (just paid) -> GRANTED"],
  ["active", past, true, "active + past period (status overrides) -> GRANTED"],
  ["trialing", future, true, "trialing -> GRANTED"],
  ["canceled", future, true, "canceled but WITHIN paid period -> KEEPS access"],
  ["canceled", past, false, "canceled + period ENDED -> REVOKED"],
  ["past_due", future, true, "past_due within period -> kept (grace)"],
  ["past_due", past, false, "past_due + period ended -> REVOKED"],
  ["incomplete", past, false, "incomplete -> no access"],
  ["unpaid", null, false, "unpaid -> no access"],
];
for (const [status, period, expected, label] of cases) {
  await setSub(status, period);
  const s = await checkStatus();
  ok(s.premium === expected, `${label} (got premium=${s.premium}, status=${s.status})`);
}
// no row at all
await delSubs();
{ const s = await checkStatus(); ok(s.premium === false && s.status === "none", "no subscription row -> not premium (status none)"); }

// ===== BROWSER: real grant -> revoke =====
console.log("\n=== BROWSER: grant then revoke ===");
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
let uid;
try {
  await page.goto(`${BASE}/signin?mode=signup`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="name"]', "Pay QA");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "Pw!12345678");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // diagnostics
  page.on("request", (r) => { if (r.url().includes("subscription-status")) console.log("    [gate req] x-user-id=" + (r.headers()["x-user-id"] || "(empty)")); });
  page.on("response", async (r) => { if (r.url().includes("subscription-status")) { try { console.log("    [gate resp] " + JSON.stringify(await r.json())); } catch {} } });
  // GRANT: active subscription -> dashboard accessible
  await setSub("active", future);
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  console.log("    landed: " + page.url().replace(BASE, ""));
  ok(/dashboard/.test(page.url()) && !/upgrade|signin/.test(page.url()), "active sub -> dashboard ACCESS granted");

  // REVOKE: subscription canceled + period ended -> bounced to /upgrade on next gate
  await setSub("canceled", past);
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  ok(/upgrade/.test(page.url()), "canceled+ended -> access REVOKED (→/upgrade)");

  // RE-GRANT: active again -> access restored
  await setSub("active", future);
  await page.goto(`${BASE}/practice`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  ok(!/upgrade|signin/.test(page.url()), "re-subscribed -> access RESTORED");
} catch (e) { fail++; console.log("  ❌ EXC: " + String(e).slice(0, 200)); }
finally {
  try {
    await delSubs();
    const u = await (await fetch(`${SB}/rest/v1/profiles?email=eq.${enc}&select=id`, { headers: svc })).json();
    if (u?.[0]?.id) await fetch(`${SB}/auth/v1/admin/users/${u[0].id}`, { method: "DELETE", headers: svc });
  } catch {}
  await browser.close();
  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  process.exit(fail ? 1 : 0);
}
