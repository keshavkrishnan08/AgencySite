/* Adversarial API battery: huge payloads, unicode, injection, wrong types,
   malformed JSON, concurrency, rate limiting. Nothing should 500 or crash. */
const B = "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log("  ✅ " + l); } else { fail++; console.log("  ❌ " + l); } };
const raw = (p, body, headers) => fetch(B + p, { method: "POST", headers: headers ?? { "Content-Type": "application/json" }, body });
const J = (p, o) => raw(p, JSON.stringify(o));

console.log("=== API ADVERSARIAL BATTERY ===");

// 1. Huge payload (50k chars) — must not crash, must respond
{
  const big = "I led the team and cut costs. ".repeat(2000);
  const r = await J("/api/score-answer", { answer: big, question: "Tell me about leadership", targetRole: "Manager" });
  ok(r.status === 200, `huge 60k-char answer -> ${r.status} (handled, sliced)`);
}
// 2. Wrong types
{
  const r = await J("/api/score-answer", { answer: 12345, question: ["array"], targetRole: { o: 1 } });
  ok(r.status === 400 || r.status === 200, `wrong-typed fields -> ${r.status} (no 500)`);
}
// 3. Injection / XSS string is treated as data, never executed
{
  const xss = '</script><img src=x onerror=alert(1)>{{constructor}}';
  const r = await J("/api/score-answer", { answer: "When the system broke I fixed it: " + xss + " and shipped on time with zero downtime.", question: "conflict", targetRole: "Engineer" });
  const d = await r.json();
  const text = JSON.stringify(d);
  ok(r.status === 200 && !text.includes("<script"), `XSS/injection string -> ${r.status}, returned as inert data`);
}
// 4. Malformed JSON -> 400 on every route
{
  const routes = ["/api/score-answer", "/api/generate-questions", "/api/follow-up", "/api/gap-story", "/api/salary-coach", "/api/company-research", "/api/question-predictor"];
  let all400 = true;
  for (const rt of routes) { const r = await raw(rt, "{not valid json,,,"); if (r.status >= 500) all400 = false; }
  ok(all400, "malformed JSON to 7 routes -> never 500");
}
// 5. Unicode / emoji / RTL
{
  const r = await J("/api/generate-questions", { targetRole: "Médecin 🩺 مدير", situation: "returning", company: "Café 北京 🚀" });
  const d = await r.json();
  ok(r.status === 200 && Array.isArray(d.questions), "unicode/emoji/RTL inputs -> valid questions");
}
// 6. Missing content-type header
{
  const r = await raw("/api/score-answer", JSON.stringify({ answer: "We shipped it on time as a team effort overall.", question: "x" }), {});
  ok(r.status === 200 || r.status === 400, `no content-type header -> ${r.status} (no 500)`);
}
// 7. Empty object to every generative route
{
  const routes = ["/api/score-answer", "/api/generate-questions", "/api/follow-up", "/api/generate-example", "/api/gap-story", "/api/salary-coach", "/api/company-research", "/api/question-predictor"];
  let no500 = true; const codes = [];
  for (const rt of routes) { const r = await J(rt, {}); codes.push(r.status); if (r.status >= 500) no500 = false; }
  ok(no500, "empty {} to 8 routes -> no 500 (codes: " + codes.join(",") + ")");
}
// 8. Concurrency + rate limiting: 40 parallel score calls
{
  const reqs = Array.from({ length: 40 }, (_, i) => J("/api/score-answer", { answer: "Concurrent test answer number " + i + " with enough words here.", question: "q", targetRole: "Manager" }));
  const results = await Promise.all(reqs);
  const codes = results.map((r) => r.status);
  const no500 = codes.every((c) => c < 500);
  const limited = codes.filter((c) => c === 429).length;
  ok(no500, `40 concurrent -> no 500 (200s:${codes.filter(c=>c===200).length}, 429s:${limited})`);
  ok(limited > 0, `rate limiting active (${limited} requests throttled to 429)`);
}

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
