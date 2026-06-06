# Getting paying customers — go-live runbook

PrepPath already has the conversion machine built in. This is the checklist to turn it on and start collecting real money.

## What's real vs demo right now

| Piece | Demo (no keys) | Live (with keys) |
|---|---|---|
| AI scoring, questions, follow-ups | Heuristic engine | Claude (`ANTHROPIC_API_KEY`) |
| Voice input (listening) | Browser Web Speech API — already real, no key | same |
| Checkout | Optimistic local upgrade | Real Stripe Checkout + 7-day trial |
| Subscription truth | `localStorage` flag (per browser) | Stripe + your DB (see step 3) |

The code paths are wired. You're flipping switches, not building.

## Step 1 — Turn on real AI (5 min)
```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> .env.local
```
Every `/api/*` route already prefers Claude and falls back to the heuristic engine. Nothing else to change.

## Step 2 — Turn on real payments (20 min)
1. In the Stripe dashboard, create a **Product** "PrepPath Premium" with two **Prices**: $9.99/month and $79/year (recurring).
2. Grab your keys and price IDs, then set:
```bash
STRIPE_SECRET_KEY=sk_live_...        # or sk_test_... to rehearse
STRIPE_PRICE_ID=price_...            # monthly
STRIPE_PRICE_ID_ANNUAL=price_...     # annual
STRIPE_TRIAL_DAYS=7
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```
3. Rehearse locally:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe-webhook
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
```
4. Hit `/upgrade` → "Start 7-day free trial" → it now opens real Stripe Checkout. Use test card `4242 4242 4242 4242`.

`/api/checkout` builds the session; `/api/stripe-webhook` verifies the signature and reacts to subscription events. Both no-op safely until keys exist.

## Step 3 — Make Premium stick across devices (the one real gap)
Today the Premium flag lives in the buyer's browser (`localStorage`). That's fine for a demo and even for launch-day, but to gate Premium for real you need server-side truth:

1. Stand up Supabase (the `lib/store.ts` API is already shaped to match — swap the localStorage reads/writes for Supabase queries).
2. In `/api/stripe-webhook`, at the two `TODO(persistence)` marks, write `plan = premium/free` keyed by customer email.
3. On load, read the plan from the DB instead of localStorage.

That's the only piece between "collects money" and "enforces access" for real customers.

## Step 4 — Deploy (10 min)
```bash
# Vercel: import the repo, add the env vars above, deploy.
# Point your domain (preppath.ai) at it. Add the webhook endpoint URL in Stripe.
```

## Step 5 — Get traffic (the actual hard part)
The product converts; now feed it people. From the PRD, the wedge is Meta ads to the underserved demographic:
- **Audience:** women 30-50 "returning to work"; all 35-55 "recently laid off"; 28-45 "career change". Exclude current tech workers.
- **Creatives that match the build:** "The Gap" (Gap Story Builder), "The Filler Words" (Anxiety Detector), "The 3 AM Panic", "Paste the job posting" (Question Predictor).
- **Funnel:** ad → landing → free practice (no signup) → first score (peak emotion) → account → free limit hit → `/upgrade` → 7-day trial.

## Conversion levers already in the app
- Free practice with **no signup** (try before commit), account capture at peak emotion (first good score).
- Hard free limit (2 sessions/week) that routes to `/upgrade` exactly when motivation is highest.
- **7-day free trial** framing + **annual plan (save 34%)** for LTV.
- Retention: streaks, the climbing readiness score, the **interview tracker** (offers, not just scores), per-tool upgrade nudges.

## Honest LTV math
COGS ~$0.92/user/mo (Claude + Stripe fee). Price $9.99/mo → ~91% gross margin. Annual at $79 front-loads cash and cuts churn. Job seekers churn when they land a job — that's a success, and the share card + tracker turn it into referrals.
