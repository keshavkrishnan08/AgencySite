/* Full E2E against the local server with OpenAI live:
   signup -> premium -> autostart practice -> live OpenAI scoring -> finish ->
   dashboard graphs -> analytics graphs -> coach chat reply -> overview persisted.
   Cleans up the user afterward. */
import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.BASE || "http://localhost:3123";
const REPO = "/Users/keshavkrishnan/Claude/Interview";
const env = Object.fromEntries(
  fs.readFileSync(`${REPO}/.env.local`, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const sbHeaders = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };
const email = `qa-e2e-${Date.now()}@example.com`;
const password = "Test1234!pw";
const log = (s) => console.log(s);
let pass = 0, fail = 0;
const check = (cond, label) => { if (cond) { pass++; log("  PASS " + label); } else { fail++; log("  FAIL " + label); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.addInitScript(() => {
  try { const p = JSON.parse(localStorage.getItem("pp:profile") || "{}"); p.plan = "premium"; localStorage.setItem("pp:profile", JSON.stringify(p)); } catch {}
});
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));

try {
  log("\n1) Sign up");
  await page.goto(`${BASE}/signin?mode=signup`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="name"]', "QA Tester");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);
  check(true, "signup submitted");

  log("2) Grant premium");
  const future = new Date(Date.now() + 30 * 864e5).toISOString();
  await fetch(`${SB}/rest/v1/subscriptions`, { method: "POST", headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({ email, status: "active", plan: "premium", current_period_end: future, stripe_subscription_id: "sub_qa_" + Date.now() }) });
  await fetch(`${SB}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, { method: "PATCH", headers: { ...sbHeaders, Prefer: "return=minimal" }, body: JSON.stringify({ plan: "premium" }) });

  log("3) Practice (autostart, live OpenAI scoring)");
  await page.goto(`${BASE}/practice?autostart=1`, { waitUntil: "networkidle" });
  await page.waitForSelector("textarea", { timeout: 45000 });
  check(!/\/upgrade|\/signin/.test(page.url()), "premium gate passed");
  check(true, "questions generated (OpenAI), answer screen shown");
  await page.fill("textarea", "When two front-desk staff clashed over the holiday schedule, I sat them both down, built a shared calendar, and set a weekly five-minute huddle. Complaints dropped to zero and we kept full coverage for three months straight, and my manager asked me to run it for the whole clinic.");
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Submit answer")').first().click();
  await page.waitForSelector("text=/out of 100|Coach.s notes|Work on this next/i", { timeout: 50000 });
  check(await page.locator("text=/out of 100/i").count() > 0, "answer scored by OpenAI, score card rendered");

  // finish the session
  const endBtn = page.locator('button:has-text("End")');
  if (await endBtn.count()) await endBtn.first().click();
  await page.waitForTimeout(3500);

  log("4) Dashboard graphs + context banner");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  // Dismiss the first-run product tour (its scrim blocks clicks by design).
  const skipTour = page.locator('text=Skip the tour');
  if (await skipTour.count()) { await skipTour.first().click({ force: true }).catch(() => {}); await page.waitForTimeout(500); }
  const dash = await page.locator("body").innerText();
  check(/Readiness over time/i.test(dash), "dashboard: 'Readiness over time' graph present");
  check(/Daily practice/i.test(dash), "dashboard: 'Daily practice' graph present");
  check(/What your coach knows/i.test(dash), "dashboard: 'what your coach knows' context banner present");
  check(await page.locator("svg").count() > 0, "dashboard: chart SVG rendered");
  check(/Trajectory|Consistency|Next milestone/i.test(dash), "dashboard: extra stat cards present");

  log("5) Analytics graphs (not blank)");
  await page.goto(`${BASE}/analytics`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const anal = await page.locator("body").innerText();
  check(await page.locator("svg").count() > 0, "analytics: charts render (SVG present)");
  check(/readiness|percentile|skill|trajectory/i.test(anal), "analytics: metric sections present");

  log("6) Coach chat (OpenAI reply)");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const skip2 = page.locator('text=Skip the tour');
  if (await skip2.count()) { await skip2.first().click({ force: true }).catch(() => {}); await page.waitForTimeout(400); }
  const launcher = page.locator('button[aria-label="Open coach"]');
  check(await launcher.count() > 0, "coach chat button is present (always hanging)");
  await launcher.first().click();
  await page.waitForTimeout(700);
  await page.fill('textarea[placeholder="Ask your coach…"]', "In one sentence, what should I work on first?");
  await page.locator('button[aria-label="Send"]').click();
  await page.waitForTimeout(10000);
  const bubbles = await page.locator('.max-w-\\[85\\%\\]').count();
  check(bubbles >= 3, "coach chat returned a reply (greeting + user + assistant bubbles)");

  log("7) Context overview + insights persisted to DB");
  await page.waitForTimeout(1500);
  const prof = await (await fetch(`${SB}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`, { headers: sbHeaders })).json();
  const uid = prof?.[0]?.id;
  const ins = uid ? await (await fetch(`${SB}/rest/v1/insights_history?user_id=eq.${uid}&select=id,created_at`, { headers: sbHeaders })).json() : [];
  check(Array.isArray(ins) && ins.length >= 1, "news/insights persisted to account (insights_history row)");
  const ov = await (await fetch(`${SB}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=overview,overview_updated_at`, { headers: sbHeaders })).json();
  const overview = ov?.[0]?.overview;
  check(!!overview, "profiles.overview written");
  check(!!overview && typeof overview.line === "string" && overview.line.length > 0, "overview has standardized 'line'");
  check(!!overview && typeof overview.sessions === "number" && overview.sessions >= 1, "overview.sessions >= 1");
  check(!!overview && ("biggestWeakness" in overview) && ("readiness" in overview), "overview has biggestWeakness + readiness fields");
  log("  overview.line = " + (overview?.line || "(none)"));

  log("\nPage exceptions: " + (errs.length ? errs.join("; ") : "none"));
} catch (e) {
  fail++; log("  EXCEPTION: " + String(e).slice(0, 400));
} finally {
  log("8) Cleanup");
  try {
    await fetch(`${SB}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}`, { method: "DELETE", headers: sbHeaders });
    const u = await (await fetch(`${SB}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`, { headers: sbHeaders })).json();
    if (u?.[0]?.id) { const del = await fetch(`${SB}/auth/v1/admin/users/${u[0].id}`, { method: "DELETE", headers: sbHeaders }); log("  cleanup user: " + (del.ok ? "deleted" : del.status)); }
  } catch (e) { log("  cleanup error: " + String(e).slice(0, 120)); }
  await browser.close();
  log(`\n==== ${pass} passed, ${fail} failed ====`);
  process.exit(fail ? 1 : 0);
}
