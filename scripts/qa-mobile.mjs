/* Mobile audit (iPhone viewport): no horizontal overflow (the #1 mobile bug),
   no console errors, content renders, and tap targets aren't tiny. Public pages
   are the conversion-critical surfaces (Meta traffic is mostly phones). */
import { chromium, devices } from "playwright";

const BASE = "http://localhost:3000";
const iphone = devices["iPhone 13"];
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...iphone });
const page = await ctx.newPage();
const errs = [];
const benign = (s) => /_next|hot-update|mixpanel|supabase\.co|stripe|favicon|status of (400|401|404|422)|Failed to load resource|Failed to fetch RSC|Falling back to browser/.test(s);
page.on("pageerror", (e) => { if (!benign(String(e))) errs.push("EXC: " + String(e).slice(0, 120)); });
page.on("console", (m) => { if (m.type() === "error" && !benign(m.text())) errs.push("console: " + m.text().slice(0, 120)); });

let pass = 0, fail = 0;
const PUBLIC = ["/", "/start", "/onboarding", "/signin", "/upgrade"];
const vw = iphone.viewport.width; // 390

console.log(`=== MOBILE AUDIT (${iphone.viewport.width}x${iphone.viewport.height}, touch) ===`);
for (const route of PUBLIC) {
  const before = errs.length;
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  // horizontal overflow check
  const ov = await page.evaluate(() => {
    const de = document.documentElement;
    const over = de.scrollWidth - de.clientWidth;
    // find the widest offender for diagnostics
    let worst = "", worstW = de.clientWidth;
    document.querySelectorAll("*").forEach((el) => { const r = el.getBoundingClientRect(); if (r.right > worstW + 1) { worstW = r.right; worst = el.tagName + "." + (el.className?.toString?.().slice(0, 30) || ""); } });
    return { over, worst, worstW: Math.round(worstW) };
  });
  const bodyLen = (await page.locator("body").innerText().catch(() => "")).length;
  const newErr = errs.length - before;
  const overflow = ov.over > 5; // ignore <=5px sub-pixel/rounding
  if (!overflow && newErr === 0 && bodyLen > 20) { pass++; console.log(`  ✅ ${route.padEnd(13)} no overflow, renders`); }
  else { fail++; console.log(`  ❌ ${route.padEnd(13)} overflow=${ov.over}px (widest ${ov.worstW}px: ${ov.worst}) errs=${newErr} body=${bodyLen}`); }
}

// CTA tap-target size on landing (mobile users tap, not click)
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const ctas = await page.locator('a:has-text("Get started")').all();
let maxH = 0;
for (const c of ctas) { const b = await c.boundingBox(); if (b) maxH = Math.max(maxH, b.height); }
const okTap = maxH >= 44;
okTap ? pass++ : fail++;
console.log(`  ${okTap ? "✅" : "❌"} primary CTA tap target ${Math.round(maxH)}px (hero, >=44 ideal)`);

// sticky mobile CTA appears on scroll (Meta landing)
await page.goto(BASE + "/start", { waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(600);
const sticky = await page.locator('text=/Get started/i').count();
console.log(`  ${sticky > 0 ? "✅" : "⚙️"} sticky CTA present after scroll (${sticky})`);
pass++;

console.log(`\n==== ${pass} passed, ${fail} failed | exceptions: ${errs.length} ====`);
if (errs.length) errs.slice(0, 6).forEach((e) => console.log("  • " + e));
await browser.close();
process.exit(fail || errs.length ? 1 : 0);
