/* Screenshot the dashboard graphs (vibrant charts) with a real scored session. */
import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.BASE || "http://localhost:3123";
const OUT = process.env.OUT || "/tmp/dashboard-charts.png";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };
const email = `qa-shot-${Date.now()}@example.com`;
const password = "Test1234!pw";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { const p = JSON.parse(localStorage.getItem("pp:profile") || "{}"); p.plan = "premium"; localStorage.setItem("pp:profile", JSON.stringify(p)); } catch {} });
const page = await ctx.newPage();
try {
  await page.goto(`${BASE}/signin?mode=signup`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="name"]', "Sam Rivera");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);
  const future = new Date(Date.now() + 30 * 864e5).toISOString();
  await fetch(`${SB}/rest/v1/subscriptions`, { method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ email, status: "active", plan: "premium", current_period_end: future, stripe_subscription_id: "sub_shot_" + Date.now() }) });
  await fetch(`${SB}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, { method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ plan: "premium" }) });

  // Run a few scored answers so every chart has data.
  const answers = [
    "When two front-desk staff clashed over the holiday schedule, I built a shared calendar and a weekly huddle. Complaints dropped to zero and we kept full coverage for three months.",
    "Our clinic was missing supply orders. I audited the process, set a Monday reorder checklist, and cut stockouts by 80 percent over the next quarter.",
    "A patient was refusing medication. I sat with them, explained it plainly, and involved their daughter. They took it and their blood pressure dropped within the hour.",
  ];
  for (let i = 0; i < answers.length; i++) {
    await page.goto(`${BASE}/practice?autostart=1`, { waitUntil: "networkidle" });
    await page.waitForSelector("textarea", { timeout: 45000 });
    await page.fill("textarea", answers[i]);
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Submit answer")').first().click();
    await page.waitForSelector("text=/out of 100/i", { timeout: 50000 });
    const endBtn = page.locator('button:has-text("End")');
    if (await endBtn.count()) await endBtn.first().click();
    await page.waitForTimeout(2500);
  }

  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3500);
  const skip = page.locator('text=Skip the tour');
  if (await skip.count()) { await skip.first().click({ force: true }).catch(() => {}); await page.waitForTimeout(600); }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: OUT, fullPage: true });
  console.log("SHOT saved: " + OUT);
} catch (e) {
  console.log("ERROR: " + String(e).slice(0, 300));
} finally {
  try {
    await fetch(`${SB}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}`, { method: "DELETE", headers: H });
    const u = await (await fetch(`${SB}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`, { headers: H })).json();
    if (u?.[0]?.id) await fetch(`${SB}/auth/v1/admin/users/${u[0].id}`, { method: "DELETE", headers: H });
  } catch {}
  await browser.close();
}
