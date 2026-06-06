import { chromium } from "playwright";
import { mkdirSync } from "fs";
const BASE = "http://localhost:3000";
const OUT = "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const errors = [];

{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  p.on("pageerror", (e) => errors.push("home: " + e.message));
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/v3-hero.png` });
  // logo zoom
  const logo = p.locator("header a[aria-label='PrepPath home']").first();
  await logo.screenshot({ path: `${OUT}/v3-logo.png` });
  // scroll to a feature section
  await p.evaluate(() => document.querySelector("#features")?.scrollIntoView());
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `${OUT}/v3-feature.png` });
  await p.close();
}
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  p.on("pageerror", (e) => errors.push("onb: " + e.message));
  await p.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/v3-onb1.png` });
  // pick a situation to advance + show chip
  await p.locator("button:has-text('Returning to work')").first().click();
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/v3-onb2.png` });
  await p.close();
}
await b.close();
console.log("ERRORS:", errors.length ? errors.join("\n") : "none 🎉");
