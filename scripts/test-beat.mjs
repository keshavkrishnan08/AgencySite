/* Verify the mid-session coaching beat appears after enough answers. */
import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.BASE || "http://localhost:3123";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };
const email = `qa-beat-${Date.now()}@example.com`;
const password = "Test1234!pw";
let pass = 0, fail = 0;
const check = (c, l) => { if (c) { pass++; console.log("  PASS " + l); } else { fail++; console.log("  FAIL " + l); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.addInitScript(() => { try { const p = JSON.parse(localStorage.getItem("pp:profile") || "{}"); p.plan = "premium"; localStorage.setItem("pp:profile", JSON.stringify(p)); } catch {} });
const page = await ctx.newPage();
const answer = "When two staff clashed over the holiday schedule, I built a shared calendar and a weekly huddle, complaints dropped to zero and we kept full coverage for three months straight.";
try {
  await page.goto(`${BASE}/signin?mode=signup`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="name"]', "Beat Tester");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);
  const future = new Date(Date.now() + 30 * 864e5).toISOString();
  await fetch(`${SB}/rest/v1/subscriptions`, { method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ email, status: "active", plan: "premium", current_period_end: future, stripe_subscription_id: "sub_beat_" + Date.now() }) });
  await fetch(`${SB}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, { method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ plan: "premium" }) });

  await page.goto(`${BASE}/practice?autostart=1&count=8`, { waitUntil: "networkidle" });
  await page.waitForSelector("textarea", { timeout: 45000 });
  // Answer questions until the beat appears (should hit after the 2nd for an 8-q session).
  let beatSeen = false;
  for (let q = 1; q <= 4 && !beatSeen; q++) {
    await page.fill("textarea", answer);
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Submit answer")').first().click();
    await page.waitForSelector("text=/out of 100/i", { timeout: 50000 });
    // advance
    const nextBtn = page.locator('button:has-text("Next question"), button:has-text("Next")');
    if (await nextBtn.count()) await nextBtn.first().click();
    await page.waitForTimeout(1200);
    const body = await page.locator("body").innerText();
    if (/Coach's note/i.test(body) && /Keep going/i.test(body)) {
      beatSeen = true;
      check(true, `coaching beat appeared after ~${q} answers`);
      await page.screenshot({ path: "/tmp/beat.png" });
      check(/Try this on the next one/i.test(body), "beat shows a specific drill");
      check(/% through this session/i.test(body), "beat shows session progress");
      await page.locator('button:has-text("Keep going")').first().click();
      await page.waitForTimeout(1200);
      const after = await page.locator("body").innerText();
      check(/Question \d+ of \d+/i.test(after) || (await page.locator("textarea").count()) > 0, "‘Keep going’ returns to the next question");
    }
  }
  if (!beatSeen) check(false, "coaching beat never appeared");
} catch (e) {
  fail++; console.log("  EXCEPTION: " + String(e).slice(0, 300));
} finally {
  try {
    await fetch(`${SB}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}`, { method: "DELETE", headers: H });
    const u = await (await fetch(`${SB}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`, { headers: H })).json();
    if (u?.[0]?.id) await fetch(`${SB}/auth/v1/admin/users/${u[0].id}`, { method: "DELETE", headers: H });
  } catch {}
  await browser.close();
  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  process.exit(fail ? 1 : 0);
}
