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

// 1) delete seeded sessions (client_id like 'demo%')
const delSessions = await fetch(`${SB}/rest/v1/sessions?client_id=like.demo*`, {
  method: "DELETE", headers: { ...H, Prefer: "return=representation" },
});
const deleted = delSessions.ok ? (await delSessions.json()).length : `ERR ${delSessions.status}`;

// 2) clear the standardized overview built from that data
const patch = await fetch(`${SB}/rest/v1/profiles?id=eq.${uid}`, {
  method: "PATCH", headers: { ...H, Prefer: "return=minimal" },
  body: JSON.stringify({ overview: null, overview_updated_at: null }),
});

// 3) clear any saved insights/news history
const delInsights = await fetch(`${SB}/rest/v1/insights_history?user_id=eq.${uid}`, {
  method: "DELETE", headers: { ...H, Prefer: "return=minimal" },
});

// 4) verify
const left = await (await fetch(`${SB}/rest/v1/sessions?user_id=eq.${uid}&select=client_id`, { headers: H })).json();
console.log(`unseeded ${EMAIL}: deleted ${deleted} sessions, overview cleared (${patch.status}), insights cleared (${delInsights.status})`);
console.log(`sessions remaining for account: ${Array.isArray(left) ? left.length : left}`);
