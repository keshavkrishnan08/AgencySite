import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const PROFILE = { name: "Rachel", email: "", situation: "returning", targetRole: "Office Manager", interviewGap: "3-5yr", plan: "free", createdAt: "2026-05-01", emailTips: true };
const errors = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1100, height: 1100 }, deviceScaleFactor: 2 });
await ctx.addInitScript((p) => localStorage.setItem("pp:profile", JSON.stringify(p)), PROFILE);
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await p.goto(`${BASE}/practice`, { waitUntil: "networkidle" });
await p.getByRole("button", { name: /Tailor to a specific job/i }).click();
await p.waitForTimeout(400);
await p.fill("input[placeholder*='Mercy']", "Mercy Hospital");
await p.fill("textarea", "We need an Office Manager for a fast-paced clinic. You'll manage scheduling, lead a team of front-desk staff, and handle difficult patients with care. Accuracy and budget tracking are essential.");
await p.screenshot({ path: "/tmp/shots/setup-context.png" });
console.log("✓ setup with context");

// start and verify a tailored question appears
await p.getByRole("button", { name: /Start session/i }).click();
await p.waitForSelector("textarea", { timeout: 15000 });
await p.waitForTimeout(900);
const q1 = await p.locator("h1").first().innerText();
console.log("Q1:", q1);
await p.screenshot({ path: "/tmp/shots/setup-question.png" });

await b.close();
console.log("ERRORS:", errors.length ? errors.join("\n") : "none 🎉");
