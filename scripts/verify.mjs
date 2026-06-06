import { chromium } from "playwright";
import { mkdirSync } from "fs";
const BASE = "http://localhost:3000";
const OUT = "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const PROFILE = { name: "Rachel", email: "r@x.co", situation: "returning", targetRole: "Office Manager", interviewGap: "3-5yr", plan: "premium", createdAt: "2026-05-01", emailTips: true };
const errors = [];
const browser = await chromium.launch();
const watch = (p, t) => { p.on("pageerror", (e) => errors.push(`[${t}] ${e.message}`)); p.on("console", (m) => m.type() === "error" && errors.push(`[${t}] ${m.text()}`)); };

/* mobile landing + dashboard */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); watch(p, "mobile");
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/m-landing.png`, fullPage: true });
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /Load sample progress/i }).click();
  await p.waitForTimeout(1300);
  await p.screenshot({ path: `${OUT}/m-dashboard.png`, fullPage: true });
  console.log("✓ mobile");
  await ctx.close();
}

/* salary interactive */
{
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((p) => localStorage.setItem("pp:profile", JSON.stringify(p)), PROFILE);
  const p = await ctx.newPage(); watch(p, "salary");
  await p.goto(`${BASE}/tools/salary`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /Start the negotiation/i }).click();
  await p.waitForSelector("text=HM", { timeout: 10000 });
  await p.fill("textarea", "Based on my research and the value I'd bring, I'm targeting $72,000.");
  await p.getByRole("button", { name: /Send/i }).click();
  await p.waitForSelector("text=Coach", { timeout: 10000 });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/salary-chat.png`, fullPage: true });
  console.log("✓ salary interactive");
  await ctx.close();
}

/* interview-day interactive: begin + 2 answers */
{
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((p) => localStorage.setItem("pp:profile", JSON.stringify(p)), PROFILE);
  const p = await ctx.newPage(); watch(p, "iday");
  await p.goto(`${BASE}/interview-day`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /Begin simulation/i }).click();
  await p.waitForSelector("textarea", { timeout: 12000 });
  await p.fill("textarea", "I kept the team on track by mapping priorities and cross-training two people; we held our on-time rate above 95%.");
  await p.screenshot({ path: `${OUT}/iday-running.png` });
  await p.getByRole("button", { name: /Next/i }).click();
  await p.waitForTimeout(1500);
  console.log("✓ interview-day interactive");
  await ctx.close();
}

await browser.close();
console.log("\nERRORS:", errors.length ? "\n" + errors.join("\n") : "none 🎉");
