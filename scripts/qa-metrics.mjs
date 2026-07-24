/* Regression test for lib/metrics.ts: every projection, streak, and anxiety
   figure must survive thin, flat, declining, and malformed history without
   producing NaN, Infinity, or a crash. Run against a build with the auth gate
   inert (blank NEXT_PUBLIC_SUPABASE_* vars).  node scripts/qa-metrics.mjs */
import { chromium } from "playwright";
const B = "http://localhost:3000";
const b = await chromium.launch();

function mk(n, opts = {}) {
  const DIMS = ["clarity","relevance","specificity","confidence","conciseness"];
  return Array.from({ length: n }, (_, i) => {
    const overall = opts.flat ? 60 : opts.declining ? 80 - i * 4 : 50 + i * 5;
    const dims = {}; DIMS.forEach(d => dims[d] = overall);
    return {
      id: `s${i}`, createdAt: new Date(Date.now() - (n - 1 - i) * 86400000).toISOString(),
      targetRole: "Office Manager", situation: "returning", mode: "practice",
      overall, dimensions: dims, durationSeconds: 300,
      answers: opts.noAnswers ? [] : [{
        questionNumber: 1, questionText: "Q", category: "behavioral", answerText: "a",
        scores: { ...dims, overall }, feedback: {}, strengthSummary: "", growthSummary: "",
        anxiety: opts.noAnxiety ? undefined : { fillers:[], hedges:[], apologies:[], underminers:[], fillerCount:2, hedgeCount:1, apologyCount:0, underminerCount:0, total:3 },
        exampleAnswer: "", wordCount: opts.zeroWords ? 0 : 100, source: "heuristic",
      }],
    };
  });
}

const CASES = [
  ["0 sessions", []],
  ["1 session", mk(1)],
  ["2 sessions", mk(2)],
  ["flat scores (no improvement)", mk(6, { flat: true })],
  ["declining scores", mk(6, { declining: true })],
  ["already top 1% (all 96)", mk(6).map(s => ({ ...s, overall: 96, dimensions: Object.fromEntries(Object.keys(s.dimensions).map(k => [k, 96])) }))],
  ["sessions with no answers", mk(4, { noAnswers: true })],
  ["answers missing anxiety", mk(4, { noAnxiety: true })],
  ["zero word counts", mk(4, { zeroWords: true })],
];

let fails = 0;
for (const [name, sessions] of CASES) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", e => { if (!/_vercel|insights/.test(e.message)) errs.push(e.message); });
  p.on("console", m => m.type() === "error" && errs.push(m.text()));
  await p.goto(B + "/", { waitUntil: "domcontentloaded" });
  await p.evaluate((s) => {
    localStorage.setItem("pp:sessions", JSON.stringify(s));
    localStorage.setItem("pp:profile", JSON.stringify({ name: "T", email: "t@e.com", plan: "premium", situation: "returning", targetRole: "Office Manager", interviewGap: "3-5yr", createdAt: new Date().toISOString(), emailTips: true }));
    localStorage.setItem("pp:streak", JSON.stringify({ current: 1, longest: 2, lastSessionDate: new Date().toISOString().slice(0,10) }));
  }, sessions);
  await p.goto(B + "/dashboard", { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  const txt = await p.evaluate(() => document.body.innerText);
  const bad = /NaN|Infinity|undefined|\[object/.test(txt);
  const i = txt.toLowerCase().indexOf("estimated time to top 1%");
  const headline = i < 0 ? "(empty state)" : txt.slice(i, i + 260).split("\n").slice(1, 4).join(" ").slice(0, 150);
  const ok = !errs.length && !bad;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(30)} top1%: ${headline}\n       ${bad ? "[NaN/undefined in output] " : ""}${errs.length ? "errors: " + errs.slice(0,2).join(" | ") : ""}`);
  await ctx.close();
}
console.log(fails ? `\n${fails} FAILING` : "\nall edge cases clean");
await b.close();
