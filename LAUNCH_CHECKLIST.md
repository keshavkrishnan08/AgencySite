# Axon Careers — Pre-Launch Checklist

What you need to do before submitting. Grouped by "must do," "should do," and "already done" so you can see exactly what's left.

Last verified: against Supabase project `iszclgghrubxmshllwwc` and Stripe test mode.

---

## 🔴 Must do before launch

These block real users from paying or getting in. Do all of them.

- [x] **Supabase email confirmation — DONE (off).** Verified: a client signup
  returns a session immediately, so onboarding → create account → payment runs
  with no email step in the way.

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
- [x] **Rate limiting is serverless-safe** — backed by an atomic Supabase counter (works across Vercel instances), with an in-memory fallback. Upstash/Redis only needed at very high scale.
- [ ] **Set a real domain** and update `NEXT_PUBLIC_APP_URL` + the `metadataBase` / email links (currently `axoncareers.com` placeholder).
- [ ] **Substantiate or soften the "12,000+ / 4.9" claims.** You chose to keep them; make sure you can back them up, or treat as illustrative, to avoid a false-advertising issue.
- [ ] **Add `RESEND_API_KEY`** if you want the welcome/plan emails to actually send.

---

## 📊 Analytics (wired — just add the keys)

The funnel is instrumented; it no-ops until you set the keys.

- [ ] **Meta Pixel** — set `NEXT_PUBLIC_META_PIXEL_ID`. The Pixel is wired (`components/MetaPixel.tsx`) and fires standard events so the ad campaign can optimize and attribute: `PageView` (all pages), **Lead** (onboarding complete), **ViewContent** (paywall view), **InitiateCheckout** (clicked subscribe), **Subscribe** (paid, with $9.99 value). Verify with the Meta Pixel Helper extension.
- [ ] **PostHog** — set `NEXT_PUBLIC_POSTHOG_KEY` (and `NEXT_PUBLIC_POSTHOG_HOST`). Captures the full funnel (`landing_cta_click`, `onboarding_complete`, `paywall_hit`, `upgrade_click`, `upgrade_success`, etc.) for product analytics. Verify in PostHog Live Events.
- [ ] **Meta Conversions API (recommended).** Client Pixel events get blocked by ad-blockers/iOS. Fire **Subscribe** server-side from the Stripe webhook (you already get the event there) for accurate, durable attribution. This noticeably improves Meta's optimization on small budgets.
- [ ] **Add UTM tracking** on ad links (`?utm_source=meta&utm_campaign=…&utm_content={{creative}}`) so you can attribute paid subs back to the winning creative.

---

## 📈 What the campaign model says (run `node scripts/campaign-abm.mjs`)

At **$5/creative × 6 = $30/day**, the deep agent-based sim (averaged over 25 runs) shows:
- No free trial: people pay $9.99 immediately at the paywall (`scripts/campaign-abm-notrial.mjs`).
- ~34k people reached/mo, ~1k clicks (1.6% CTR), **~24 paying subs**, **CAC ~$38**.
- **Biggest leak is the paywall:** ~83% of people who reach `/upgrade` don't buy (mostly "not ready," then price, then mobile-card-averse). Onboarding mid-screens are the second leak.
- **Heavy AI usage matters:** at ~$3.8/paying-user/month in Anthropic tokens, net margin is ~$5.6/mo (not $9.40), and the 12-month cohort is roughly **break-even (≈0.96× ROAS)**. Watch token cost per active user closely.
- **Most pick monthly** (~99%); with 12% churn that's **~0.82× ROAS / slightly unprofitable over 12 months** at these assumptions.
- **You're underwater month 1** (~$118 first-month revenue vs $900 spend) → budget ~4–5 months of runway before payback.
- Levers that flip it positive: lower churn (≤8%), push the annual plan, reduce paywall friction, kill weak creatives faster. Re-run the script after changing assumptions.

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

# Analytics (client-safe; wired, no-op until set)
NEXT_PUBLIC_META_PIXEL_ID=...                         # Meta Pixel for ad optimization
NEXT_PUBLIC_POSTHOG_KEY=...                           # product funnel analytics
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com     # optional override

# Optional
NEXT_PUBLIC_APP_URL=https://yourdomain.com
RESEND_API_KEY=...
EMAIL_FROM=Axon Careers <hello@yourdomain.com>
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
