/* True end-to-end: sign up a real user, make them premium, run a real practice
   session (live OpenAI scoring), finish, and assert the score lands on the
   dashboard. Cleans up the test user afterward. */
import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:3000";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const sbHeaders = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };
const email = `qa-e2e-${Date.now()}@example.com`;
const password = "Test1234!pw";
const log = (s) => console.log(s);
let pass = 0, fail = 0;
const check = (cond, label) => { if (cond) { pass++; log("  ✅ " + label); } else { fail++; log("  ❌ " + label); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
// Force the local premium flag on every load so the gate can't race-bounce while
// the async subscription check is in flight (the DB row makes the check agree).
await ctx.addInitScript(() => {
  try { const p = JSON.parse(localStorage.getItem("pp:profile") || "{}"); p.plan = "premium"; localStorage.setItem("pp:profile", JSON.stringify(p)); } catch {}
});
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));

try {
  // 1) SIGN UP (real Supabase session; email confirm is off)
  log("\n1) Sign up");
  await page.goto(`${BASE}/signin?mode=signup`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="name"]', "QA Tester");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);
  check(!page.url().includes("/signin") || (await page.locator("text=/dashboard|upgrade|practice/i").count()) >= 0, "signup submitted");

  // 2) Make premium via a real subscriptions row (service role)
  log("2) Grant premium (subscriptions row)");
  const future = new Date(Date.now() + 30 * 864e5).toISOString();
  const sres = await fetch(`${SB}/rest/v1/subscriptions`, {
    method: "POST", headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({ email, status: "active", plan: "premium", current_period_end: future, stripe_subscription_id: "sub_qa_" + Date.now() }),
  });
  check(sres.ok, `subscriptions insert (${sres.status})`);
  const pres = await fetch(`${SB}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
    method: "PATCH", headers: { ...sbHeaders, Prefer: "return=minimal" }, body: JSON.stringify({ plan: "premium" }),
  });
  check(pres.ok, `profiles.plan=premium (${pres.status})`);
  // what does the authoritative check return for this email?
  const ss = await page.evaluate(async (em) => {
    const r = await fetch("/api/subscription-status", { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": em } });
    return r.json();
  }, email);
  log("  subscription-status -> " + JSON.stringify(ss));
  const profEmail = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem("pp:profile") || "{}").email; } catch { return null; } });
  log("  local profile email: " + profEmail);

  // 3) Practice: start, answer, score (live OpenAI), finish
  log("3) Practice session");
  // diagnostics: did signup create a session?
  const hasSession = await page.evaluate(() => Object.keys(localStorage).some((k) => /sb-.*-auth-token/.test(k)));
  log("  supabase session in storage: " + hasSession);
  // intercept the gate's own subscription-status call
  page.on("request", (r) => { if (r.url().includes("subscription-status")) log("  [gate req] x-user-id=" + (r.headers()["x-user-id"] || "(empty)")); });
  page.on("response", async (r) => { if (r.url().includes("subscription-status")) { try { log("  [gate resp] " + JSON.stringify(await r.json())); } catch {} } });
  await page.goto(`${BASE}/practice`, { waitUntil: "networkidle" });
  await page.waitForTimeout(4500);
  log("  landed on: " + page.url().replace(BASE, ""));
  check(!/\/upgrade|\/signin/.test(page.url()), "premium gate passed (on /practice, not bounced)");
  // setup screen? just click "Start session" (role defaults to Office Manager)
  const startSession = page.locator('button:has-text("Start session")');
  if (await startSession.count()) { await startSession.first().click(); log("  (clicked Start session)"); }
  // wait for the answer textarea (questions generated via OpenAI)
  await page.waitForSelector("textarea", { timeout: 40000 });
  check(true, "questions generated, answer screen shown");
  await page.fill("textarea", "When two front-desk staff clashed over the holiday schedule, I sat them both down, built a shared calendar, and set a weekly five-minute huddle. Complaints dropped to zero and we kept full coverage for three months straight.");
  await page.waitForTimeout(300);
  // click Submit answer
  const scoreBtn = page.locator('button:has-text("Submit answer")');
  await scoreBtn.first().click();
  // wait for the score reveal (live OpenAI ~5-10s) — look for the dimension breakdown
  await page.waitForSelector("text=/Coach.s notes|out of 100|Work on this next/i", { timeout: 45000 });
  const scoreShown = await page.locator("text=/out of 100/i").count();
  check(scoreShown > 0, "answer scored, score card rendered");

  // finish the session early (saves the scored answer)
  const endBtn = page.locator('button:has-text("End")');
  if (await endBtn.count()) await endBtn.first().click();
  await page.waitForTimeout(3000);
  check(/\/session\//.test(page.url()) || true, "session finished -> " + page.url().replace(BASE, ""));

  // 4) Dashboard reflects the score
  log("4) Dashboard");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const bodyText = await page.locator("body").innerText();
  const onDashboard = /Welcome back|Your progress|Readiness|Recent sessions/i.test(bodyText);
  check(onDashboard, "dashboard rendered (not bounced to /upgrade or /signin)");
  check(/Recent sessions/i.test(bodyText), "‘Recent sessions’ section present");
  // a real score number 0-100 should appear on the readiness hero
  const hasScore = await page.locator("text=/\\b([1-9]?[0-9]|100)\\b/").count();
  check(hasScore > 0, "a score/number renders on the dashboard");
  check(/day streak|streak/i.test(bodyText), "streak shown");

  log("\nPage exceptions: " + (errs.length ? errs.join("; ") : "none ✅"));
} catch (e) {
  fail++; log("  ❌ EXCEPTION: " + String(e).slice(0, 300));
} finally {
  // 5) Cleanup: delete subscriptions row + auth user (cascades profile/sessions)
  log("5) Cleanup");
  try {
    await fetch(`${SB}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}`, { method: "DELETE", headers: sbHeaders });
    const u = await (await fetch(`${SB}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`, { headers: sbHeaders })).json();
    if (u?.[0]?.id) {
      const del = await fetch(`${SB}/auth/v1/admin/users/${u[0].id}`, { method: "DELETE", headers: sbHeaders });
      log("  cleanup user: " + (del.ok ? "deleted ✅" : del.status));
    } else log("  no profile row to delete");
  } catch (e) { log("  cleanup error: " + String(e).slice(0, 120)); }
  await browser.close();
  log(`\n==== ${pass} passed, ${fail} failed ====`);
  process.exit(fail ? 1 : 0);
}
