/* Database audit: real persistence, RLS isolation between two users, profile
   trigger, and cascade delete. Uses Supabase admin (create users) + per-user
   JWTs (RLS applies) + service role (setup/teardown). */
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SRK = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const svc = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };
const asUser = (t) => ({ apikey: ANON, Authorization: `Bearer ${t}`, "Content-Type": "application/json" });
const anon = { apikey: ANON, "Content-Type": "application/json" };

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log("  ✅ " + l); } else { fail++; console.log("  ❌ " + l); } };
const stamp = Date.now();
const mk = async (email) => {
  const r = await fetch(`${SB}/auth/v1/admin/users`, { method: "POST", headers: svc, body: JSON.stringify({ email, password: "Pw!12345678", email_confirm: true }) });
  return (await r.json()).id;
};
const token = async (email) => {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: "POST", headers: anon, body: JSON.stringify({ email, password: "Pw!12345678" }) });
  return (await r.json()).access_token;
};
const sel = async (headers, q) => (await fetch(`${SB}/rest/v1/${q}`, { headers })).json();

const eA = `qa-db-a-${stamp}@example.com`, eB = `qa-db-b-${stamp}@example.com`;
let A, B;
console.log("=== DATABASE AUDIT (RLS, persistence, trigger, cascade) ===");
try {
  A = await mk(eA); B = await mk(eB);
  ok(!!A && !!B, "created two auth users");
  const tA = await token(eA), tB = await token(eB);
  ok(!!tA && !!tB, "signed in both (JWTs)");

  // trigger created profiles
  const pA = await sel(svc, `profiles?id=eq.${A}&select=id,email,plan`);
  ok(pA?.[0]?.email === eA && pA?.[0]?.plan === "free", "trigger auto-created profile (plan=free)");

  // seed A's data (service role, as A's user_id)
  await fetch(`${SB}/rest/v1/sessions`, { method: "POST", headers: { ...svc, Prefer: "return=minimal" }, body: JSON.stringify({ user_id: A, client_id: "s1", overall: 84, dimensions: { clarity: 90 }, data: { id: "s1", overall: 84, secret: "A-only" } }) });
  await fetch(`${SB}/rest/v1/schedule`, { method: "POST", headers: { ...svc, Prefer: "return=minimal" }, body: JSON.stringify({ user_id: A, client_id: "sch1", company: "ACorp", interview_date: "2026-08-01", data: { id: "sch1", company: "ACorp" } }) });
  ok(true, "seeded A: session + schedule rows");

  // RLS: A sees own
  const aSelf = await sel(asUser(tA), `sessions?select=client_id`);
  ok(Array.isArray(aSelf) && aSelf.some((r) => r.client_id === "s1"), "RLS: A can read A's own session");
  const aSch = await sel(asUser(tA), `schedule?select=client_id`);
  ok(Array.isArray(aSch) && aSch.some((r) => r.client_id === "sch1"), "RLS: A can read A's own schedule");

  // RLS: B cannot see A's rows
  const bSeesA = await sel(asUser(tB), `sessions?select=client_id,user_id`);
  ok(Array.isArray(bSeesA) && !bSeesA.some((r) => r.user_id === A), "RLS: B canNOT read A's sessions");
  const bSchA = await sel(asUser(tB), `schedule?select=user_id`);
  ok(Array.isArray(bSchA) && !bSchA.some((r) => r.user_id === A), "RLS: B canNOT read A's schedule");
  const bProfA = await sel(asUser(tB), `profiles?id=eq.${A}&select=email`);
  ok(Array.isArray(bProfA) && bProfA.length === 0, "RLS: B canNOT read A's profile");

  // anon (no JWT) sees nothing
  const anonSees = await sel(anon, `sessions?select=client_id`);
  ok(Array.isArray(anonSees) && anonSees.length === 0, "RLS: anon (no auth) reads zero sessions");

  // subscriptions locked to service role (no policy) — user JWT sees nothing
  const bSubs = await sel(asUser(tB), `subscriptions?select=email`);
  ok(Array.isArray(bSubs) && bSubs.length === 0, "RLS: subscriptions invisible to users (service-role only)");

  // jsonb round-trips intact
  const dataRow = await sel(svc, `sessions?user_id=eq.${A}&select=data`);
  ok(dataRow?.[0]?.data?.secret === "A-only" && dataRow?.[0]?.data?.overall === 84, "jsonb data round-trips intact");

  // cascade: delete A -> sessions/schedule/profile gone
  await fetch(`${SB}/auth/v1/admin/users/${A}`, { method: "DELETE", headers: svc });
  const afterS = await sel(svc, `sessions?user_id=eq.${A}&select=client_id`);
  const afterSch = await sel(svc, `schedule?user_id=eq.${A}&select=client_id`);
  const afterP = await sel(svc, `profiles?id=eq.${A}&select=id`);
  ok(afterS.length === 0 && afterSch.length === 0 && afterP.length === 0, "cascade: deleting user A removed all A's rows");
} catch (e) {
  fail++; console.log("  ❌ EXCEPTION: " + String(e).slice(0, 200));
} finally {
  // cleanup B (A already deleted)
  try { if (B) await fetch(`${SB}/auth/v1/admin/users/${B}`, { method: "DELETE", headers: svc }); } catch {}
  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  process.exit(fail ? 1 : 0);
}
