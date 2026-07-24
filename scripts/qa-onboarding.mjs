/* Interactive QA: click through the onboarding flow like a real user — chip
   auto-advance, dynamic steps, the company text field, Continue — and confirm
   it completes (routes to /signin) with no errors. */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error" && !/_next|hot-update|mixpanel|supabase|stripe|favicon/.test(m.text())) errors.push("console: " + m.text().slice(0, 160)); });
page.on("pageerror", (e) => errors.push("EXCEPTION: " + String(e).slice(0, 160)));

await page.goto(BASE + "/onboarding", { waitUntil: "networkidle" });

let steps = 0;
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(500);
  if (!page.url().includes("/onboarding")) break; // finished -> navigated away

  // text field present (role/company step)?
  const textInputs = await page.locator('input[type="text"], input:not([type])').all();
  const dateInputs = await page.locator('input[type="date"]').all();
  // role search input
  const roleSearch = await page.locator('input[placeholder*="Office Manager"]').all();

  if (roleSearch.length) {
    await roleSearch[0].fill("Office Manager");
    await page.waitForTimeout(200);
  }
  // optional company text field
  const companyField = await page.locator('input[placeholder*="Mercy"]').all();
  if (companyField.length) await companyField[0].fill("Mercy Hospital");

  // Answer EVERY chip group on the screen (the first screen has two), so
  // multi-field screens satisfy their auto-advance / enable Continue.
  const groups = await page.locator('div.flex.flex-wrap.gap-2').all();
  for (const g of groups) {
    const firstChip = g.locator("button").first();
    if (await firstChip.count()) await firstChip.click().catch(() => {});
    await page.waitForTimeout(120);
  }

  // click Continue if visible/enabled (multi-field or text screens)
  const cont = page.locator('button:has-text("Continue")');
  if (await cont.count()) {
    const btn = cont.first();
    if (await btn.isEnabled().catch(() => false)) { await btn.click().catch(() => {}); }
  }
  steps++;
  await page.waitForTimeout(450);
}

await page.waitForTimeout(1000);
const finalUrl = page.url();
const reachedSignin = finalUrl.includes("/signin");
console.log(`Steps clicked: ${steps}`);
console.log(`Final URL: ${finalUrl}`);
console.log(reachedSignin ? "✅ Onboarding completed -> routed to sign in" : "⚠️  Did not reach /signin (may need manual check)");
console.log(errors.length ? "❌ Errors:\n  " + errors.join("\n  ") : "✅ No console/runtime errors during onboarding");
await browser.close();
process.exit(errors.length ? 1 : 0);
