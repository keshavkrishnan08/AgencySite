import { chromium } from "playwright";
import { mkdirSync } from "fs";
const BASE = "http://localhost:3000";
const OUT = "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const PROFILE = { name: "Rachel", email: "", situation: "returning", targetRole: "Office Manager", interviewGap: "3-5yr", plan: "free", createdAt: "2026-05-01", emailTips: true };
const errors = [];
const browser = await chromium.launch();
const watch = (p, t) => { p.on("pageerror", (e) => errors.push(`[${t}] ${e.message}`)); p.on("console", (m) => m.type() === "error" && errors.push(`[${t}] ${m.text()}`)); };

/* landing: full + sticky CTA after scroll */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); watch(p, "landing");
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.evaluate(() => window.scrollTo(0, 1600));
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/L-sticky.png` });
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/L-faq.png` });
  console.log("✓ landing");
  await ctx.close();
}

/* practice: voice button + follow-up */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((p) => localStorage.setItem("pp:profile", JSON.stringify(p)), PROFILE);
  const p = await ctx.newPage(); watch(p, "practice");
  await p.goto(`${BASE}/practice?autostart=1`, { waitUntil: "networkidle" });
  await p.waitForSelector("textarea", { timeout: 15000 });
  await p.fill("textarea", "When two coworkers left in the same month, I mapped what only I could do, cross-trained two colleagues in a week, and set up a daily check-in. We held our on-time rate above 95% and one person I trained was promoted six months later.");
  await p.getByRole("button", { name: /Submit answer/i }).click();
  await p.waitForSelector("text=Coach's notes", { timeout: 20000 });
  await p.waitForSelector("text=The interviewer follows up", { timeout: 15000 });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/P-followup.png`, fullPage: true });
  console.log("✓ practice voice+followup");
  await ctx.close();
}

/* upgrade: annual toggle + trial */
{
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); watch(p, "upgrade");
  await p.goto(`${BASE}/upgrade`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /^annual/i }).click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/U-annual.png` });
  console.log("✓ upgrade annual");
  await ctx.close();
}

/* tracker: add + offer */
{
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((p) => localStorage.setItem("pp:profile", JSON.stringify(p)), PROFILE);
  const p = await ctx.newPage(); watch(p, "tracker");
  await p.goto(`${BASE}/tools/tracker`, { waitUntil: "networkidle" });
  await p.fill("input[placeholder='Company']", "Mercy Hospital");
  await p.getByRole("button", { name: /Add interview/i }).click();
  await p.waitForTimeout(500);
  await p.getByRole("button", { name: /Offer/i }).first().click();
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/T-tracker.png`, fullPage: true });
  console.log("✓ tracker");
  await ctx.close();
}

await browser.close();
console.log("\nERRORS:", errors.length ? "\n" + errors.join("\n") : "none 🎉");
