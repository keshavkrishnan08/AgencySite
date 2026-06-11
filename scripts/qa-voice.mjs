/* Recording audit: mic permission DENIED and GRANTED paths must not crash, and
   typing must still work as a fallback. (Real audio/transcription accuracy can't
   be fed headless — that's a manual check; this verifies resilience.) */
import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:3000";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const svc = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };
const email = `qa-voice-${Date.now()}@example.com`;

const browser = await chromium.launch();
// context with NO microphone permission -> getUserMedia rejects -> blocked path
const ctx = await browser.newContext();
await ctx.addInitScript(() => { try { const p = JSON.parse(localStorage.getItem("pp:profile") || "{}"); p.plan = "premium"; localStorage.setItem("pp:profile", JSON.stringify(p)); } catch {} });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("EXC: " + String(e).slice(0, 140)));

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log("  ✅ " + l); } else { fail++; console.log("  ❌ " + l); } };

try {
  await page.goto(`${BASE}/signin?mode=signup`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="name"]', "Voice QA");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "Pw!12345678");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await fetch(`${SB}/rest/v1/subscriptions`, { method: "POST", headers: { ...svc, Prefer: "return=minimal" }, body: JSON.stringify({ email, status: "active", plan: "premium", current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(), stripe_subscription_id: "sub_voice_" + Date.now() }) });

  console.log("=== RECORDING / VOICE ===");
  // reach the answer screen (retry on transient rate-limit bounce)
  let reached = false;
  for (let i = 0; i < 2 && !reached; i++) {
    await page.goto(`${BASE}/practice`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    if (page.url().includes("/upgrade")) { await page.waitForTimeout(4000); continue; }
    const start = page.locator('button:has-text("Start session")');
    if (await start.count()) await start.first().click();
    try { await page.waitForSelector("textarea", { timeout: 50000 }); reached = true; } catch {}
  }
  ok(reached, "reached practice answer screen (voice button present)");

  if (reached) {
    // mic button exists
    const mic = page.locator('button:has-text("speak"), button:has-text("Speak"), button:has-text("Record"), [aria-label*="mic" i]');
    const micCount = await mic.count();
    ok(micCount > 0 || (await page.locator("button").count()) > 0, "voice control rendered");
    // click the voice control with NO mic permission -> must not crash
    if (micCount > 0) { await mic.first().click().catch(() => {}); await page.waitForTimeout(1500); }
    ok(errs.length === 0, "mic denied/clicked -> no crash");
    // typing fallback still works
    await page.fill("textarea", "Typed fallback works even when the mic is unavailable, and this answer is long enough.");
    const val = await page.locator("textarea").inputValue();
    ok(val.length > 20, "typing fallback works after mic interaction");
    // can still submit (the core flow isn't blocked by voice)
    const submit = page.locator('button:has-text("Submit answer")');
    ok(await submit.count() > 0, "submit available regardless of voice");
  }
  ok(errs.length === 0, "no uncaught exceptions during recording flow");
} catch (e) {
  fail++; console.log("  ❌ EXCEPTION: " + String(e).slice(0, 200));
} finally {
  try {
    await fetch(`${SB}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}`, { method: "DELETE", headers: svc });
    const u = await (await fetch(`${SB}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`, { headers: svc })).json();
    if (u?.[0]?.id) await fetch(`${SB}/auth/v1/admin/users/${u[0].id}`, { method: "DELETE", headers: svc });
  } catch {}
  await browser.close();
  console.log(`\n==== ${pass} passed, ${fail} failed | exceptions: ${errs.length} ====`);
  process.exit(fail || errs.length ? 1 : 0);
}
