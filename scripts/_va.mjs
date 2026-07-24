import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
});
await ctx.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
const p = await ctx.newPage();
const beacons = [];
p.on("request", r => {
  const u = r.url();
  if (/\/[a-f0-9]{16}\/(script\.js|view|vitals)/.test(u) || u.includes("_vercel")) beacons.push(r.method() + " " + u.split("axonservices.dev")[1]);
});
await p.goto("https://axonservices.dev/", { waitUntil: "networkidle" });
await p.waitForTimeout(4000);
const scripts = await p.evaluate(() => Array.from(document.querySelectorAll("script[src]")).map(s => s.getAttribute("src")).filter(s => !s.includes("_next")));
console.log("non-next scripts:", scripts.length ? scripts.join(", ") : "NONE");
console.log("analytics traffic:", beacons.length ? [...new Set(beacons)].join(" | ") : "NONE");
console.log("window.va:", await p.evaluate(() => typeof window.va));
await b.close();
