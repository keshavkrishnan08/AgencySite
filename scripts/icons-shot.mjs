import { chromium } from "playwright";
import { mkdirSync } from "fs";
const BASE = "http://localhost:3000";
const OUT = "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const errors = [];

// landing features (custom icons) + button hover
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`${BASE}/#features`, { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/I-features.png` });
  // hover the hero primary button to catch the sheen + lift
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const cta = p.getByRole("link", { name: /Start your first practice/i }).first();
  await cta.hover();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/I-hero-btn.png`, clip: { x: 60, y: 360, width: 700, height: 120 } });
  await p.close();
}
// tools hub (custom icons grid)
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => localStorage.setItem("pp:profile", JSON.stringify({ plan: "premium", targetRole: "Office Manager", name: "R", email: "" })));
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/I-tools.png`, fullPage: true });
  await ctx.close();
}
await b.close();
console.log("ERRORS:", errors.length ? errors.join("\n") : "none 🎉");
