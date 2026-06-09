# Axon Careers — Pre-Launch Checklist

What you need to do before submitting. Grouped by "must do," "should do," and "already done" so you can see exactly what's left.

Last verified: against Supabase project `iszclgghrubxmshllwwc` and Stripe test mode.

---

## 🔴 Must do before launch

These block real users from paying or getting in. Do all of them.

- [ ] **Turn off (or handle) Supabase email confirmation.**
  Dashboard → Authentication → Providers → Email → toggle **Confirm email** off, OR keep it on and tell users to check their inbox.
  Why it matters: with it on, a new password signup can't log in until they click the email link, so they never reach checkout. Right now this is the single biggest blocker to the signup → pay flow.

- [ ] **Set the Stripe webhook + secret in production.**
  After you deploy, Stripe Dashboard → Developers → Webhooks → Add endpoint → `https://YOUR_DOMAIN/api/stripe-webhook`.
  Subscribe to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
  Copy the signing secret (`whsec_...`) into the deploy env as `STRIPE_WEBHOOK_SECRET`.
  Why it matters: without it, the `subscriptions` table never populates in production, so the "keep access through the paid period, then kick" logic can't run. Locally the app falls back to an optimistic flag, which is not enough for real billing.

- [ ] **Switch Stripe from test keys to live keys** (when you're ready to charge real money).
  Replace `pk_test_…`/`sk_test_…` with the live `pk_live_…`/`sk_live_…`, and recreate the product + prices in live mode (the current price IDs are test-mode only).

- [ ] **Set all production environment variables** on the host (see the env list below). Never commit `.env.local`.

---

## 🟡 Should do before launch

Not blockers, but you want these.

- [ ] **Add `ANTHROPIC_API_KEY`** to turn on real AI scoring/coaching. Without it the app runs on the built-in local engine (works, but less sharp). This is the only key needed to upgrade the whole app to Claude.
- [ ] **Persist gap-story answers and company briefings to the DB.** Today they save to `localStorage` only. Sessions, interviews, plans, profile, usage, and premium status already persist per account.
- [ ] **Move rate limiting to Upstash/Redis** if you deploy on more than one instance. The current limiter is in-memory (correct for a single instance; resets per instance otherwise). Same interface, swap the store.
- [ ] **Set a real domain** and update `NEXT_PUBLIC_APP_URL` + the `metadataBase` / email links (currently `axoncareers.com` placeholder).
- [ ] **Swap sample testimonials/stats for real ones** before making claims publicly (the "12,000+", names, and quotes are placeholders).
- [ ] **Add `RESEND_API_KEY`** if you want the welcome/plan emails to actually send.
- [ ] **Configure PostHog** (`NEXT_PUBLIC_POSTHOG_KEY`) if you want product analytics.

---

## ✅ Already done and verified

- **Auth:** Supabase email/password + magic link; sign-up auto-creates a profile row (trigger verified with 20 users).
- **Paid-only gate:** signed out → `/signin`; signed in but not paying → `/upgrade`; premium → in. Landing, `/start`, onboarding, and the free first practice question stay open.
- **Payment:** Stripe Checkout creates real sessions (monthly $9.99, annual $79.99); success flips premium and syncs to the DB.
- **Subscription lifecycle:** access stays through the paid period even after cancel, then ends. All 6 states simulated against the live DB (active / canceled-in-period / canceled-expired / trialing / past_due / none).
- **Per-account usage counts** stored in the DB (`usage` table, atomic increment, service-role writes).
- **Security:** AI/Anthropic key is server-only (`import "server-only"`, no `NEXT_PUBLIC`), never reaches the client. RLS on every table — the public key reads nothing; each user sees only their own rows.
- **Rate limiting:** per IP (30/min, 300/day) + per account, on every AI route + checkout. Load-tested (35 calls → 429).
- **Token cost:** prompt caching on the stable system prompt; Haiku for light calls, Sonnet for scoring.
- **Every AI endpoint** returns valid structured output; the app works fully on the local engine with no API key.
- **Dashboard graphs** are fully dynamic from session data.

---

## Environment variables (production)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...      # client-safe
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...               # server only, NEVER NEXT_PUBLIC

# Stripe (use live keys for real charges)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...        # client-safe
STRIPE_SECRET_KEY=sk_live_...                         # server only
STRIPE_WEBHOOK_SECRET=whsec_...                       # from the webhook endpoint
STRIPE_PRICE_ID=price_...                             # monthly (live mode)
STRIPE_PRICE_ID_ANNUAL=price_...                      # annual (live mode)

# AI (optional but recommended)
ANTHROPIC_API_KEY=sk-ant-...                          # server only
# ANTHROPIC_MODEL=claude-sonnet-4-6                   # optional override
# ANTHROPIC_MODEL_FAST=claude-haiku-4-5-20251001      # optional override

# Optional
NEXT_PUBLIC_APP_URL=https://yourdomain.com
RESEND_API_KEY=...
EMAIL_FROM=Axon Careers <hello@yourdomain.com>
NEXT_PUBLIC_POSTHOG_KEY=...
```

**Security rule:** only values prefixed `NEXT_PUBLIC_` reach the browser, and those are all meant to be public (Supabase anon, Stripe publishable, PostHog). Every secret (service role, Stripe secret, Anthropic, Resend, webhook secret) has no `NEXT_PUBLIC_` prefix and stays on the server.

---

## Final smoke test before you submit

Run through this as a real user on the deployed site:

1. Land on `/` → click Start free → finish onboarding → answer the first practice question → see the score + hard paywall.
2. Click Unlock → sign up → confirm the account is created (and email-confirm is handled).
3. Pay with a Stripe test card (`4242 4242 4242 4242`) → land on the dashboard as premium.
4. Confirm the webhook wrote a row in `subscriptions` and `profiles.plan = premium`.
5. Sign out, sign back in → still premium.
6. In Stripe, cancel the subscription at period end → confirm you keep access now, and lose it after the period.
7. Open each tool, run one real action in each, confirm it returns something useful.
