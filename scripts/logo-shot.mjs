import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 5 });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p.waitForTimeout(500);
const el = p.locator("header a[aria-label='PrepPath home']").first();
await el.screenshot({ path: "/tmp/shots/logo-zoom.png" });
await b.close();
console.log("done");
