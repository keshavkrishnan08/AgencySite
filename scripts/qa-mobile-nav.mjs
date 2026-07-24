/* Verify in-app mobile navigation works on a phone (hamburger -> nav). */
import { chromium, devices } from "playwright";
import fs from "fs";
const BASE = "http://localhost:3000";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const svc = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };
const email = `qa-mnav-${Date.now()}@example.com`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
await ctx.addInitScript(() => { try { const p = JSON.parse(localStorage.getItem("pp:profile") || "{}"); p.plan = "premium"; localStorage.setItem("pp:profile", JSON.stringify(p)); } catch {} });
const page = await ctx.newPage();
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log("  ✅ " + l); } else { fail++; console.log("  ❌ " + l); } };
try {
  await page.goto(`${BASE}/signin?mode=signup`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="name"]', "MNav"); await page.fill('input[type="email"]', email); await page.fill('input[type="password"]', "Pw!12345678");
  await page.click('button[type="submit"]'); await page.waitForTimeout(3000);
  await fetch(`${SB}/rest/v1/subscriptions`, { method: "POST", headers: { ...svc, Prefer: "return=minimal" }, body: JSON.stringify({ email, status: "active", plan: "premium", current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(), stripe_subscription_id: "sub_mnav_" + Date.now() }) });

  console.log("=== MOBILE IN-APP NAV ===");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  ok(!/upgrade|signin/.test(page.url()), "dashboard reachable on mobile");
  await page.waitForSelector('button[aria-label="Menu"]', { timeout: 10000 }).catch(() => {});
  const burger = page.locator('button[aria-label="Menu"]');
  ok(await burger.count() > 0, "hamburger menu present on mobile");
  // before opening, nav links hidden
  await burger.first().click();
  await page.waitForTimeout(400);
  const practiceLink = page.getByRole('link', { name: 'Practice', exact: true });
  ok(await practiceLink.count() > 0, "nav links revealed after tapping hamburger");
  await practiceLink.first().click();
  await page.waitForURL(/\/practice/, { timeout: 12000 }).catch(() => {});
  ok(/\/practice/.test(page.url()), "tapped Practice -> navigated to /practice on mobile");
  // tools reachable too
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.locator('button[aria-label="Menu"]').first().click();
  await page.waitForTimeout(400);
  ok(await page.locator('a:has-text("Gap Story")').count() > 0, "tools listed in mobile menu");
} catch (e) { fail++; console.log("  ❌ EXC: " + String(e).slice(0, 160)); }
finally {
  try { await fetch(`${SB}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}`, { method: "DELETE", headers: svc }); const u = await (await fetch(`${SB}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`, { headers: svc })).json(); if (u?.[0]?.id) await fetch(`${SB}/auth/v1/admin/users/${u[0].id}`, { method: "DELETE", headers: svc }); } catch {}
  await browser.close();
  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  process.exit(fail ? 1 : 0);
}
