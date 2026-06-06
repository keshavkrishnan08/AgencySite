import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:3000";
const OUT = "/tmp/shots";
mkdirSync(OUT, { recursive: true });

const PROFILE = {
  name: "Rachel",
  email: "",
  situation: "returning",
  targetRole: "Office Manager",
  interviewGap: "3-5yr",
  plan: "free",
  createdAt: new Date("2026-05-01").toISOString(),
  emailTips: true,
};

const errors = [];
function watch(page, tag) {
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
}

async function shot(page, name, opts = {}) {
  await page.waitForTimeout(opts.wait ?? 900);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: opts.full ?? false });
  console.log("✓", name);
}

const browser = await chromium.launch();

/* ---------- Marketing (desktop + mobile), fresh ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  watch(page, "landing");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(page, "01-landing-top");
  await shot(page, "01-landing-full", { full: true, wait: 400 });
  await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });
  await shot(page, "02-onboarding");
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(page, "01b-landing-mobile", { full: true, wait: 500 });
  await ctx.close();
}

/* ---------- Practice flow (fresh, profile injected) ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((p) => localStorage.setItem("pp:profile", JSON.stringify(p)), PROFILE);
  const page = await ctx.newPage();
  watch(page, "practice");
  await page.goto(`${BASE}/practice?autostart=1`, { waitUntil: "networkidle" });
  await page.waitForSelector("textarea", { timeout: 15000 });
  await shot(page, "03-practice-question", { wait: 1200 });
  await page.fill(
    "textarea",
    "When two coworkers on my team left in the same month, I was responsible for keeping our service levels steady. I mapped out what only I could do, cross-trained two colleagues within a week, and set up a short daily check-in so nothing slipped through. As a result we kept our on-time rate above 95% through the whole transition, and one of the people I trained was promoted six months later."
  );
  await page.getByRole("button", { name: /Submit answer/i }).click();
  await page.waitForSelector("text=Coach's notes", { timeout: 20000 });
  await shot(page, "04-practice-score", { full: true, wait: 1600 });
  await ctx.close();
}

/* ---------- Seeded dashboard + session ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  watch(page, "dashboard");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Load sample progress/i }).click();
  await page.waitForTimeout(1400);
  await shot(page, "05-dashboard", { full: true, wait: 1500 });

  await page.goto(`${BASE}/session/sample_11`, { waitUntil: "networkidle" });
  await shot(page, "06-session", { full: true, wait: 1600 });
  await ctx.close();
}

/* ---------- Premium tools + interview day + upgrade ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((p) => localStorage.setItem("pp:profile", JSON.stringify({ ...p, plan: "premium" })), PROFILE);
  const page = await ctx.newPage();
  watch(page, "tools");

  for (const [slug, name] of [
    ["tools", "07-tools-hub"],
    ["tools/gap-story", "08-gap-story"],
    ["tools/company-research", "09-company"],
    ["tools/question-predictor", "10-predictor"],
    ["tools/salary", "11-salary"],
    ["tools/debrief", "12-debrief"],
    ["tools/your-story", "13-your-story"],
    ["upgrade", "14-upgrade"],
    ["settings", "15-settings"],
    ["interview-day", "16-interview-day"],
  ]) {
    await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" });
    await shot(page, name, { wait: 900 });
  }
  await ctx.close();
}

await browser.close();

console.log("\n=== console / page errors ===");
console.log(errors.length ? errors.join("\n") : "none 🎉");
