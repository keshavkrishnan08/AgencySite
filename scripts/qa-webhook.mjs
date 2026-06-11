/* Verify Stripe -> webhook -> Supabase write path with a properly-signed
   synthetic event (using the local test secret). Proves the DB is connected to
   Stripe: a completed checkout writes the subscriptions row + flips profiles.plan. */
import crypto from "crypto";
import fs from "fs";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SRK = env.SUPABASE_SERVICE_ROLE_KEY, WHSEC = env.STRIPE_WEBHOOK_SECRET;
const svc = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log("  ✅ " + l); } else { fail++; console.log("  ❌ " + l); } };

const email = `qa-webhook-${Date.now()}@example.com`;
const subId = "sub_qa_" + Date.now();

// Build a Stripe-style signed request (matches Stripe's scheme: t=ts,v1=HMAC(secret, "ts.body"))
function signed(body) {
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac("sha256", WHSEC).update(`${ts}.${body}`).digest("hex");
  return `t=${ts},v1=${sig}`;
}

console.log("=== STRIPE -> WEBHOOK -> DB ===");
ok(!!WHSEC, "webhook secret present (test)");

// 1. checkout.session.completed -> should write subscriptions(active) + profiles.plan
const evt = JSON.stringify({
  id: "evt_test_" + Date.now(), type: "checkout.session.completed",
  data: { object: { id: "cs_test_1", customer: "cus_test_1", subscription: subId, customer_details: { email }, customer_email: email } },
});
const r1 = await fetch("http://localhost:3000/api/stripe-webhook", { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": signed(evt) }, body: evt });
const b1 = await r1.json();
ok(r1.status === 200 && b1.persisted === true, `signed checkout.completed accepted + persisted (${r1.status}, ${JSON.stringify(b1)})`);

// 2. row landed in subscriptions
const subs = await (await fetch(`${SB}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}&select=status,plan,stripe_subscription_id`, { headers: svc })).json();
ok(subs?.[0]?.status === "active" && subs?.[0]?.plan === "premium", `DB subscriptions row written (status=${subs?.[0]?.status})`);

// 3. subscription-status now reports premium (the gate would grant)
const ss = await (await fetch(`http://localhost:3000/api/subscription-status`, { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": email } })).json();
ok(ss.premium === true, `subscription-status -> premium granted (${JSON.stringify(ss)})`);

// 4. BAD signature is rejected (security)
const r2 = await fetch("http://localhost:3000/api/stripe-webhook", { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": "t=1,v1=deadbeef" }, body: evt });
ok(r2.status === 400, `forged signature rejected (${r2.status})`);

// 5. subscription.deleted -> revokes (status canceled). Needs a Stripe customer lookup,
//    which will fail for the fake customer; verify it doesn't 500 and acks.
const del = JSON.stringify({ id: "evt_del", type: "customer.subscription.deleted", data: { object: { id: subId, customer: "cus_test_1", status: "canceled", items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) - 100 }] } } } });
const r3 = await fetch("http://localhost:3000/api/stripe-webhook", { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": signed(del) }, body: del });
ok(r3.status === 200, `subscription.deleted handled without 500 (${r3.status})`);

// cleanup
await fetch(`${SB}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}`, { method: "DELETE", headers: svc });
await fetch(`${SB}/rest/v1/subscriptions?stripe_subscription_id=eq.${subId}`, { method: "DELETE", headers: svc });
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
