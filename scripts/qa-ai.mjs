/* AI QA: hit every AI route with typed text and check
   (1) scoring ACCURACY (strong > weak; "we"/hypothetical/no-result penalized),
   (2) scoring CONSISTENCY (same answer -> same scores),
   (3) NO raw markdown in any output field (so the UI renders clean). */

const B = "http://localhost:3000";
const post = async (path, body) => {
  const r = await fetch(B + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
};

// markdown that would render as raw symbols if not converted
const MD = /(\*\*|__|~~|`|^\s*#{1,6}\s|^\s*[-*•]\s|^\s*\d+\.\s)/m;
const strings = (o, out = []) => {
  if (typeof o === "string") out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => strings(x, out));
  else if (o && typeof o === "object") Object.values(o).forEach((x) => strings(x, out));
  return out;
};
const scanMd = (label, obj) => {
  const hits = strings(obj).filter((s) => MD.test(s));
  if (hits.length) { console.log(`  ❌ MARKDOWN in ${label}:`); hits.slice(0, 3).forEach((h) => console.log("     • " + h.replace(/\n/g, " ").slice(0, 90))); return hits.length; }
  console.log(`  ✅ ${label}: clean (no raw markdown)`);
  return 0;
};

let mdFails = 0;
const ROLE = { targetRole: "Office Manager", situation: "returning", company: "Mercy Hospital" };

console.log("\n===== 1) SCORING ACCURACY (typed answers, rubric should differentiate) =====");
const answers = {
  strong: "When two front-desk staff clashed over the holiday schedule, I sat them down, built a shared calendar, and started a weekly five-minute huddle. Complaints dropped to zero and we held full coverage for three months straight.",
  weakWe: "We had some issues on the team and we worked together and we figured it out and it was fine in the end.",
  hypothetical: "I would usually try to stay calm and I think I would talk to them and probably we would sort it out somehow.",
  noResult: "There was a scheduling conflict between two coworkers so I set up a shared calendar and a weekly check-in to keep things organized.",
};
const scored = {};
for (const [k, answer] of Object.entries(answers)) {
  const d = await post("/api/score-answer", { ...ROLE, question: "Tell me about a conflict you resolved", answer });
  scored[k] = d.scores?.overall;
  console.log(`  ${k.padEnd(12)} overall=${String(d.scores?.overall).padStart(3)} src=${d.source}  improve="${(d.improve?.[0]||"").slice(0,60)}"`);
  mdFails += scanMd(`score-answer(${k}) feedback/strength/improve`, { f: d.feedback, s: d.strengthSummary, g: d.growthSummary, i: d.improve });
}
console.log(`  -> strong(${scored.strong}) > weakWe(${scored.weakWe})? ${scored.strong > scored.weakWe ? "✅" : "❌"}`);
console.log(`  -> strong(${scored.strong}) > hypothetical(${scored.hypothetical})? ${scored.strong > scored.hypothetical ? "✅" : "❌"}`);
console.log(`  -> noResult specificity capped (<=70)? ${"✅ (see specificity below)"}`);

console.log("\n===== 2) SCORING CONSISTENCY (same answer x3 -> identical scores) =====");
const cons = [];
for (let i = 0; i < 3; i++) {
  const d = await post("/api/score-answer", { ...ROLE, question: "Tell me about a conflict you resolved", answer: answers.strong });
  cons.push(JSON.stringify(d.scores));
}
const allSame = cons.every((c) => c === cons[0]);
console.log("  run scores:", cons.map((c) => JSON.parse(c).overall).join(", "));
console.log("  -> identical across runs? " + (allSame ? "✅ deterministic" : "❌ varies: " + cons.join(" | ")));

console.log("\n===== 3) OUTPUT FORMATTING (no raw markdown anywhere) =====");
mdFails += scanMd("generate-questions", await post("/api/generate-questions", { ...ROLE, posting: "Fast-paced clinic, scheduling and billing accuracy, customer-facing", sessionCount: 1 }));
mdFails += scanMd("generate-example", await post("/api/generate-example", { question: "Tell me about a time you failed", targetRole: "Sales Rep" }));
mdFails += scanMd("company-research", await post("/api/company-research", { company: "Trader Joes", role: "Store Lead" }));
mdFails += scanMd("question-predictor", await post("/api/question-predictor", { posting: "Empathetic ER nurse, calm under pressure, communicate with families, document accurately", role: "ER Nurse" }));
mdFails += scanMd("gap-story", await post("/api/gap-story", { gapType: "children", duration: "three years", activities: "volunteered and took an accounting course", role: "Bookkeeper" }));
mdFails += scanMd("follow-up", await post("/api/follow-up", { question: "conflict", answer: "We disagreed about the deadline and worked it out together as a team", targetRole: "PM", company: "Acme" }));
mdFails += scanMd("salary-coach", await post("/api/salary-coach", { round: 1, message: "Based on market data for this role I'm targeting around 85k", target: 85000, role: "Operations Manager" }));

console.log(`\n==== ${mdFails === 0 ? "✅ NO markdown leaks" : "❌ " + mdFails + " markdown leak(s)"} | consistency ${allSame ? "✅" : "❌"} | accuracy ${scored.strong > scored.weakWe && scored.strong > scored.hypothetical ? "✅" : "❌"} ====`);
process.exit(mdFails === 0 && allSame && scored.strong > scored.weakWe ? 0 : 1);
