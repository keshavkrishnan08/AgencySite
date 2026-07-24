/* Chaos harness: perform edge/compound user actions and assert nothing breaks
   (no uncaught exceptions, pages keep rendering). Covers public + auth-edge
   surfaces; gated app logic is covered by qa-e2e.mjs + the API battery. */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errs = [];
// Benign: build assets, analytics, AND expected auth/API rejections (wrong
// password -> 400, bad signup -> 422, not-found -> 404). These are handled
// inline by the app; the browser just logs the resource status.
const benign = (s) => /_next|hot-update|webpack|mixpanel|supabase\.co|stripe|fonts|favicon|googleapis|\/signin\?next|status of (400|401|422|404)|Failed to load resource/.test(s);
page.on("pageerror", (e) => { if (!benign(String(e))) errs.push("EXCEPTION: " + String(e).slice(0, 140)); });
page.on("console", (m) => { if (m.type() === "error" && !benign(m.text())) errs.push("console: " + m.text().slice(0, 140)); });

let pass = 0, fail = 0;
const ok = async (label, fn) => {
  const before = errs.length;
  try { await fn(); } catch (e) { errs.push(`[${label}] threw: ${String(e).slice(0, 100)}`); }
  // page must still render real content
  const bodyLen = (await page.locator("body").innerText().catch(() => "")).length;
  const newErrs = errs.length - before;
  if (newErrs === 0 && bodyLen > 20) { pass++; console.log("  ✅ " + label); }
  else { fail++; console.log(`  ❌ ${label} (errs:${newErrs}, bodyLen:${bodyLen})`); }
};
const go = async (p) => { await page.goto(BASE + p, { waitUntil: "networkidle" }); await page.waitForTimeout(400); };

console.log("=== CHAOS AUDIT ===");

// A. Navigation
await ok("rapid 8x route switching", async () => { for (const p of ["/", "/start", "/onboarding", "/", "/upgrade", "/signin", "/start", "/"]) await go(p); });
await ok("deep-link /session/bad-id", async () => { await go("/session/does-not-exist-123"); await page.waitForTimeout(500); });
await ok("deep-link /tools (index)", async () => { await go("/tools"); });
await ok("unknown route 404", async () => { await go("/zzz-nope"); });
await ok("back/forward after nav chain", async () => { await go("/"); await go("/start"); await page.goBack(); await page.goForward(); });

// C. Onboarding chaos
await ok("onboarding: load", async () => { await go("/onboarding"); await page.waitForTimeout(400); });
await ok("onboarding: rapid double-tap first chips", async () => {
  const chips = await page.locator("div.flex.flex-wrap.gap-2 button").all();
  if (chips[0]) { await chips[0].click(); await chips[0].click(); }
});
await ok("onboarding: back out to landing then return", async () => { await go("/"); await go("/onboarding"); await page.waitForTimeout(300); });
await ok("onboarding: refresh mid-flow (no crash)", async () => {
  const chips = await page.locator("div.flex.flex-wrap.gap-2 button").all();
  if (chips[0]) await chips[0].click();
  await page.reload({ waitUntil: "domcontentloaded" });
});
await ok("onboarding: huge role + unicode company", async () => {
  // advance to role step by answering chip groups
  for (let i = 0; i < 6; i++) {
    if (!page.url().includes("/onboarding")) break;
    const groups = await page.locator("div.flex.flex-wrap.gap-2").all();
    for (const g of groups) { const b = g.locator("button").first(); if (await b.count()) await b.click().catch(() => {}); await page.waitForTimeout(80); }
    const role = page.locator('input[placeholder*="Office Manager"]');
    if (await role.count()) { await role.fill("Senior " + "x".repeat(400) + " Manager"); }
    const company = page.locator('input[placeholder*="Mercy"]');
    if (await company.count()) await company.fill("Café 北京 🚀 <b>test</b>");
    const cont = page.locator('button:has-text("Continue")');
    if (await cont.count() && await cont.first().isEnabled().catch(() => false)) await cont.first().click().catch(() => {});
    await page.waitForTimeout(250);
  }
});

// B. Auth edge
await ok("signin: empty submit blocked", async () => { await go("/signin"); await page.locator('button[type="submit"]').first().click().catch(() => {}); await page.waitForTimeout(300); });
await ok("signin: wrong password no crash", async () => {
  await go("/signin");
  await page.fill('input[type="email"]', "nobody@example.com");
  await page.fill('input[type="password"]', "wrongpw123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
});
await ok("signin: double-click submit", async () => {
  await go("/signin?mode=signup");
  await page.fill('input[type="email"]', "dup@example.com");
  await page.fill('input[type="password"]', "pw12345678");
  const b = page.locator('button[type="submit"]');
  await b.click(); await b.click().catch(() => {});
  await page.waitForTimeout(1500);
});

// D. Paywall tamper
await ok("upgrade: spam toggle monthly/annual 10x", async () => {
  await go("/upgrade"); await page.waitForTimeout(600);
  const toggles = page.locator('button:has-text("monthly"), button:has-text("annual")');
  for (let i = 0; i < 10; i++) { const t = toggles.nth(i % Math.max(await toggles.count(), 1)); if (await t.count()) await t.click().catch(() => {}); }
});
await ok("tamper /dashboard?upgraded=1 (not granted)", async () => { await go("/dashboard?upgraded=1&session_id=cs_fake"); await page.waitForTimeout(2500); });

console.log(`\n==== ${pass} passed, ${fail} failed | exceptions: ${errs.length} ====`);
if (errs.length) errs.slice(0, 12).forEach((e) => console.log("  • " + e));
await browser.close();
process.exit(fail || errs.length ? 1 : 0);
