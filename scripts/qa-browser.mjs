/* Headless QA: load every page, capture console errors, uncaught exceptions,
   failed requests, and hydration warnings. Seeds a signed-in + premium profile
   in localStorage so gated pages render their real content. */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const ROUTES = [
  "/", "/start", "/onboarding", "/signin", "/upgrade",
  "/dashboard", "/practice", "/interview-day", "/plan", "/settings",
  "/tools", "/tools/gap-story", "/tools/company-research", "/tools/question-predictor",
  "/tools/salary", "/tools/debrief", "/tools/your-story", "/tools/tracker", "/whats-changed",
];

// Seed local state so the paid-gate renders app content (auth gate is inert
// without a Supabase anon key; premium flag drives the in-app gating).
const SEED = {
  "pp:profile": JSON.stringify({ name: "Test User", email: "qa@test.com", situation: "returning", targetRole: "Office Manager", company: "Mercy Hospital", interviewGap: "1-3yr", plan: "premium", createdAt: new Date().toISOString(), emailTips: true }),
  "pp:sessions": JSON.stringify([]),
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.addInitScript((seed) => {
  for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
}, SEED);

let totalErrors = 0;
for (const route of ROUTES) {
  const page = await ctx.newPage();
  const issues = [];
  page.on("console", (m) => { if (m.type() === "error") issues.push("console.error: " + m.text().slice(0, 200)); });
  page.on("pageerror", (e) => issues.push("PAGE EXCEPTION: " + String(e).slice(0, 200)));
  page.on("requestfailed", (r) => {
    const u = r.url();
    if (!u.includes("favicon") && !u.startsWith("data:")) issues.push("req failed: " + u.slice(0, 120) + " (" + (r.failure()?.errorText || "") + ")");
  });
  try {
    const resp = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(700); // let effects/hydration run
    const status = resp?.status() ?? 0;
    // ignore benign Next dev HMR/websocket + Supabase/analytics network noise
    const real = issues.filter((i) =>
      !/_next\/static|hot-update|webpack|posthog|supabase\.co|stripe|fonts\.|favicon|googleapis/.test(i) &&
      // benign: the auth gate redirects unauthenticated users to /signin and the
      // prefetch of that redirect target is aborted — expected, not a bug.
      !/\/signin\?next=.*ERR_ABORTED|\/signin\?next=.*_rsc/.test(i)
    );
    totalErrors += real.length;
    console.log(`${real.length ? "❌" : "✅"} ${route.padEnd(30)} [${status}]${real.length ? "\n   " + real.join("\n   ") : ""}`);
  } catch (e) {
    totalErrors++;
    console.log(`❌ ${route.padEnd(30)} LOAD ERROR: ${String(e).slice(0, 120)}`);
  }
  await page.close();
}
await browser.close();
console.log(`\n${totalErrors === 0 ? "✅ NO runtime errors across all pages" : "❌ " + totalErrors + " issue(s) found"}`);
process.exit(totalErrors ? 1 : 0);
