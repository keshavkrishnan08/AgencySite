/* Purge test/QA residue so analytics reflect real users only. Removes accounts
   on synthetic domains (@example.com, @cropconnect.test) and a few obvious
   throwaway gmails, across events / sessions / subscriptions / insights /
   profiles / auth. Uses REST + the auth admin API (the MCP SQL path is
   read-only). KEEPS the deliberate QA login and anything real-looking. */
import fs from "fs";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

const KEEP = new Set(["premium-test@axoncareers.app", "kkrishnan@parktudor.org"]);
const THROWAWAY = new Set(["123@gmail.com", "123456@gmail.com", "jf@gmail.com", "joh@gmail.com", "dup@example.com"]);
const isTest = (email) => {
  if (!email) return false;
  const e = String(email).toLowerCase();
  if (KEEP.has(e)) return false;
  return e.endsWith("@example.com") || e.endsWith("@cropconnect.test") || THROWAWAY.has(e);
};

const get = async (path) => (await fetch(`${SB}${path}`, { headers: H })).json();
const del = async (path) => { const r = await fetch(`${SB}${path}`, { method: "DELETE", headers: { ...H, Prefer: "return=minimal" } }); return r.status; };
const inList = (vals) => `(${vals.map((v) => `"${v}"`).join(",")})`;

// 1) Gather the test email set from BOTH profiles and events (some event emails
//    have no surviving profile, e.g. deleted e2e users).
const profiles = await get(`/rest/v1/profiles?select=id,email`);
const eventEmails = await get(`/rest/v1/events?select=email`);
const testProfiles = profiles.filter((p) => isTest(p.email));
const testEmails = new Set([
  ...testProfiles.map((p) => p.email),
  ...eventEmails.map((e) => e.email).filter(isTest),
]);
const emails = [...testEmails];
const ids = testProfiles.map((p) => p.id);
console.log(`test emails: ${emails.length}, test profiles: ${ids.length}`);
if (!emails.length) { console.log("nothing to purge"); process.exit(0); }

// 2) Delete dependent rows first, then profiles.
const encList = (arr) => encodeURIComponent(inList(arr));
if (ids.length) {
  await del(`/rest/v1/sessions?user_id=in.${encList(ids)}`);
  await del(`/rest/v1/insights_history?user_id=in.${encList(ids)}`);
}
const evStatus = await del(`/rest/v1/events?email=in.${encList(emails)}`);
const subStatus = await del(`/rest/v1/subscriptions?email=in.${encList(emails)}`);
const profStatus = ids.length ? await del(`/rest/v1/profiles?id=in.${encList(ids)}`) : "n/a";
console.log(`deleted events(${evStatus}) subscriptions(${subStatus}) profiles(${profStatus})`);

// 3) Delete the auth logins (admin API), matched by email.
const au = await get(`/auth/v1/admin/users?per_page=1000`);
const authUsers = (au.users || au || []);
let authDeleted = 0;
for (const u of authUsers) {
  if (isTest(u.email)) {
    const r = await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H });
    if (r.ok) authDeleted++;
  }
}
console.log(`deleted auth logins: ${authDeleted}`);

// 4) Verify: remaining account_created events + remaining profiles.
const remainEvents = await get(`/rest/v1/events?name=eq.account_created&select=email`);
const remainProfiles = await get(`/rest/v1/profiles?select=email`);
console.log(`\nAfter purge:`);
console.log(`  account_created events left: ${remainEvents.length}`);
remainEvents.forEach((e) => console.log(`    ${e.email || "(no email)"}`));
console.log(`  profiles left: ${remainProfiles.length}`);
remainProfiles.forEach((p) => console.log(`    ${p.email || "(none)"}`));
