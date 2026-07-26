/* Live production verification. Hits every AI feature and reports whether it is
   REAL AI (source:"ai") or a silent heuristic FALLBACK, plus format validity and
   any markdown leaking through. No assumptions — this calls the deployed app. */
const BASE = process.env.BASE || "https://axonservices.dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MD = /(^|\n)\s*#{1,6}\s|\*\*|`|(^|\n)\s*[-*]\s|\[[^\]]+\]\([^)]+\)/;
const hasMd = (obj) => {
  const found = [];
  const walk = (v, path) => {
    if (typeof v === "string") { if (MD.test(v)) found.push(path); }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => walk(x, path ? `${path}.${k}` : k));
  };
  walk(obj, "");
  return found;
};

async function post(path, body) {
  const t = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const ms = Date.now() - t;
    let json = null; try { json = await res.json(); } catch {}
    return { status: res.status, ms, json };
  } catch (e) { return { status: 0, ms: Date.now() - t, json: null, err: String(e).slice(0, 100) }; }
}

const rows = [];
function record(name, r, { sourceField = "source", check } = {}) {
  const src = r.json?.[sourceField] ?? "?";
  const md = r.json ? hasMd(r.json) : [];
  let fmt = "n/a";
  if (check && r.json) { try { fmt = check(r.json) ? "ok" : "BAD"; } catch { fmt = "BAD"; } }
  rows.push({ name, status: r.status, ms: r.ms, source: src, fmt, md: md.length ? md.join(",") : "" });
  const flag = src === "heuristic" ? "  <-- FALLBACK" : "";
  console.log(`${name.padEnd(20)} ${String(r.status).padEnd(4)} ${String(r.ms + "ms").padEnd(7)} source=${String(src).padEnd(10)} fmt=${fmt}${md.length ? " MD:" + md.join(",") : ""}${flag}`);
}

console.log(`\nVerifying ${BASE}\n${"-".repeat(72)}`);

// 0) health
const h = await (await fetch(`${BASE}/api/health`)).json();
console.log(`health: env=${h.env} openai=${h.ai?.openai} stripe=${h.billing?.stripeSecret} webhook=${h.billing?.stripeWebhook} supabase=${h.data?.supabaseUrl}/${h.data?.supabaseService} mixpanel=${h.analytics?.mixpanel}`);
console.log("-".repeat(72));

await sleep(300);
record("generate-questions", await post("/api/generate-questions", { targetRole: "Product Manager", count: 6, situation: "returning", sessionCount: 2 }),
  { check: (j) => Array.isArray(j.questions) && j.questions.length >= 4 && j.questions.every((q) => q.text && q.number) });

await sleep(600);
record("score-answer", await post("/api/score-answer", {
  question: "Tell me about a time you handled conflict on your team.",
  answer: "On my last team two engineers disagreed on an approach. I set up a quick call, had each lay out tradeoffs, and we ran a small spike to settle it with data. We shipped on time and both felt heard.",
  targetRole: "Product Manager", category: "behavioral",
}), { check: (j) => j.scores && typeof j.scores.overall === "number" && j.scores.overall >= 0 && j.scores.overall <= 100 && j.strengthSummary });

await sleep(600);
record("insights", await post("/api/insights", { role: "Product Manager", industry: "SaaS" }),
  { check: (j) => j.insights && typeof j.insights.market === "string" && Array.isArray(j.insights.skills) });

await sleep(600);
record("gap-story", await post("/api/gap-story", { gapType: "layoff", duration: "8 months", activities: "freelance consulting and a course", role: "Product Manager" }),
  { check: (j) => typeof (j.story || j.answer || "") === "string" });

await sleep(600);
record("question-predictor", await post("/api/question-predictor", { role: "Product Manager", posting: "We need a PM to own our analytics roadmap and work cross-functionally with design and eng." }),
  { check: (j) => Array.isArray(j.questions) && j.questions.length > 0 });

await sleep(600);
record("job-breakdown", await post("/api/job-breakdown", { role: "Chief Executive Officer", seniority: "executive" }),
  { check: (j) => j.breakdown || j.summary || j.responsibilities });

await sleep(600);
record("chat", await post("/api/chat", { messages: [{ role: "user", content: "How do I answer 'what's your biggest weakness' without sounding fake?" }] }),
  { check: (j) => typeof j.reply === "string" && j.reply.length > 20 });

await sleep(600);
record("chat-offtopic", await post("/api/chat", { messages: [{ role: "user", content: "What's a good recipe for lasagna?" }] }),
  { check: (j) => typeof j.reply === "string" });

await sleep(600);
record("follow-up", await post("/api/follow-up", { question: "Tell me about yourself.", answer: "I'm a PM with 6 years across two startups, focused on analytics products.", targetRole: "Product Manager" }),
  { check: (j) => typeof (j.question || j.followUp || "") === "string" });

await sleep(600);
record("generate-example", await post("/api/generate-example", { question: "Describe a time you missed a deadline.", targetRole: "Product Manager", category: "behavioral" }),
  { check: (j) => typeof (j.example || j.answer || "") === "string" });

// transcribe: needs audio; verify it validates gracefully (no 500) on empty body
await sleep(600);
const tr = await post("/api/transcribe", {});
console.log(`${"transcribe(empty)".padEnd(20)} ${String(tr.status).padEnd(4)} ${(tr.ms + "ms").padEnd(7)} (expect 400, graceful)`);

console.log("-".repeat(72));
const fallbacks = rows.filter((r) => r.source === "heuristic");
const badFmt = rows.filter((r) => r.fmt === "BAD");
const mdLeaks = rows.filter((r) => r.md);
const errors = rows.filter((r) => r.status >= 500 || r.status === 0);
console.log(`AI features tested: ${rows.length}`);
console.log(`Real AI (source:ai): ${rows.filter((r) => r.source === "ai").length}`);
console.log(`Silent fallbacks:    ${fallbacks.length}${fallbacks.length ? " -> " + fallbacks.map((r) => r.name).join(", ") : ""}`);
console.log(`Bad format:          ${badFmt.length}${badFmt.length ? " -> " + badFmt.map((r) => r.name).join(", ") : ""}`);
console.log(`Markdown leaks:      ${mdLeaks.length}${mdLeaks.length ? " -> " + mdLeaks.map((r) => r.name).join(", ") : ""}`);
console.log(`5xx / network errs:  ${errors.length}${errors.length ? " -> " + errors.map((r) => r.name + ":" + r.status).join(", ") : ""}`);
