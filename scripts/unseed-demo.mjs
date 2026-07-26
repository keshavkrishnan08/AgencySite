/* Revert seed-demo.mjs: remove every seeded practice session (client_id demo_*)
   and clear the derived overview/insights so the account reads clean. Uses the
   REST API with the service role key, so the deletes actually persist. */
import fs from "fs";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };
const EMAIL = process.env.DEMO_EMAIL || "premium-test@axoncareers.app";

const prof = await (await fetch(`${SB}/rest/v1/profiles?email=eq.${encodeURIComponent(EMAIL)}&select=id`, { headers: H })).json();
if (!prof?.[0]?.id) { console.log("no profile for", EMAIL); process.exit(1); }
const uid = prof[0].id;

// small helper: authoritative row count via the count=exact header
async function countDemo() {
  const r = await fetch(`${SB}/rest/v1/sessions?client_id=like.demo*&select=client_id`, {
    method: "HEAD", headers: { ...H, Prefer: "count=exact" },
  });
  const cr = r.headers.get("content-range") || "*/?"; // e.g. "*/0"
  return cr.split("/")[1];
}

// 1) delete seeded sessions (client_id like 'demo%'). return=minimal + a real
//    re-count afterward, since a representation length can mislead.
const delSessions = await fetch(`${SB}/rest/v1/sessions?client_id=like.demo*`, {
  method: "DELETE", headers: { ...H, Prefer: "return=minimal" },
});

// 2) clear the standardized overview built from that data
const patch = await fetch(`${SB}/rest/v1/profiles?id=eq.${uid}`, {
  method: "PATCH", headers: { ...H, Prefer: "return=minimal" },
  body: JSON.stringify({ overview: null, overview_updated_at: null }),
});

// 3) clear any saved insights/news history
const delInsights = await fetch(`${SB}/rest/v1/insights_history?user_id=eq.${uid}`, {
  method: "DELETE", headers: { ...H, Prefer: "return=minimal" },
});

// 4) verify by authoritative count
const remaining = await countDemo();
console.log(`unseeded ${EMAIL}: delete HTTP ${delSessions.status}, overview cleared (${patch.status}), insights cleared (${delInsights.status})`);
console.log(`demo sessions remaining in DB: ${remaining}`);
if (remaining !== "0") { console.log("WARNING: demo rows still present"); process.exit(1); }
