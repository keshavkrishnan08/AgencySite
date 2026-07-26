/* Seed the premium test account with realistic practice history so every graph
   populates and you can watch them update. Inserts into Supabase; the app pulls
   them on sign-in. Re-runnable (upsert on user_id,client_id). */
import fs from "fs";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };
const EMAIL = process.env.DEMO_EMAIL || "premium-test@axoncareers.app";

const prof = await (await fetch(`${SB}/rest/v1/profiles?email=eq.${encodeURIComponent(EMAIL)}&select=id,target_role`, { headers: H })).json();
if (!prof?.[0]?.id) { console.log("no profile for", EMAIL); process.exit(1); }
const uid = prof[0].id;
const role = prof[0].target_role || "Office Manager";

const DIMS = ["clarity", "relevance", "specificity", "confidence", "conciseness"];
const CATS = ["warmup", "behavioral", "behavioral", "gap", "technical", "closer"];
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

function makeAnswer(qn, cat, base, progress) {
  const scores = {};
  DIMS.forEach((d) => (scores[d] = clamp(base + rnd(-11, 11))));
  scores.overall = clamp(DIMS.reduce((s, d) => s + scores[d], 0) / 5);
  const fillers = Math.max(0, Math.round(rnd(0, 6) * (1 - progress * 0.8)));
  const words = Math.round(rnd(55, 155));
  return {
    questionNumber: qn, questionText: `Demo ${cat} question ${qn} for a ${role}.`, category: cat,
    answerText: "Seeded demo answer.", scores,
    feedback: Object.fromEntries(DIMS.map((d) => [d, "Demo note."])),
    strengthSummary: "Clear and specific.", growthSummary: "Add one number.",
    anxiety: { fillers: [], hedges: [], apologies: [], underminers: [], fillerCount: fillers, hedgeCount: Math.round(rnd(0, 3) * (1 - progress)), apologyCount: 0, underminerCount: Math.round(rnd(0, 2) * (1 - progress)), total: fillers },
    exampleAnswer: "", wordCount: words,
    delivery: { durationSec: Math.round(rnd(40, 110)), wordCount: words, wpm: Math.round(rnd(118, 158)), pauseCount: Math.round(rnd(0, 4) * (1 - progress)), longestPauseSec: Math.round(rnd(1, 4)) },
    secondsOnQuestion: Math.round(rnd(40, 120)), source: "ai",
  };
}

const N = 16;
const rows = [];
for (let i = 0; i < N; i++) {
  const progress = i / (N - 1);
  const base = 54 + progress * 33 + rnd(-4, 4); // climbs 54 -> ~87
  const dims = {}; DIMS.forEach((d) => (dims[d] = clamp(base + rnd(-8, 8))));
  const overall = clamp(DIMS.reduce((s, d) => s + dims[d], 0) / 5);
  const answers = CATS.map((c, idx) => makeAnswer(idx + 1, c, base, progress));
  const daysAgo = Math.round((N - 1 - i) * (28 / (N - 1)));
  const createdAt = new Date(Date.now() - daysAgo * 864e5 - Math.round(rnd(0, 20)) * 3.6e6).toISOString();
  const clientId = `demo_${i}_${createdAt.slice(0, 10)}`;
  const durationSeconds = answers.reduce((s, a) => s + (a.delivery?.durationSec || 0), 0);
  const data = { id: clientId, createdAt, targetRole: role, situation: "returning", mode: "practice", overall, dimensions: dims, durationSeconds, avgSecondsPerQuestion: 70, answers };
  rows.push({ user_id: uid, client_id: clientId, target_role: role, mode: "practice", overall, dimensions: dims, duration_seconds: durationSeconds, answers, data, created_at: createdAt });
}

const res = await fetch(`${SB}/rest/v1/sessions?on_conflict=user_id,client_id`, {
  method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows),
});
console.log(`seeded ${rows.length} sessions for ${EMAIL} — HTTP ${res.status}`);
if (!res.ok) console.log(await res.text());
else console.log("overall range:", rows[0].overall, "->", rows[rows.length - 1].overall);
