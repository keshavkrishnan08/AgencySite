# Getting paying customers — go-live runbook

Axon Careers already has the conversion machine built in. This is the checklist to turn it on and start collecting real money.

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
1. In the Stripe dashboard, create a **Product** "Axon Careers Premium" with two **Prices**: $9.99/month and $79/year (recurring).
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

## Step 3 — Make Premium stick across devices
Today the Premium flag lives in the buyer's browser (`localStorage`). That's fine for a demo, but to enforce Premium for real you need server-side truth. Most of this is now wired:

1. Run `supabase/schema.sql` in your Supabase project (creates `profiles`, `sessions`, `subscriptions` with RLS).
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. Done automatically: `/api/stripe-webhook` now records each subscription to Supabase, and `lib/supabase.ts` exposes `isEmailPremium(email)` for enforcement.

The one remaining piece is client auth: swap the demo email capture for Supabase Auth (email + Google), then read the plan via `isEmailPremium` instead of localStorage. That's the last step between "collects money" and "enforces access," and it needs your Supabase project to build and test against.

## Step 4 — Deploy (10 min)
```bash
# Vercel: import the repo, add the env vars above, deploy.
# Point your domain (axoncareers.com) at it. Add the webhook endpoint URL in Stripe.
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

## Measure the funnel (analytics)
The app fires PostHog-compatible events with zero setup cost (no-op until keyed). Set `NEXT_PUBLIC_POSTHOG_KEY` and you'll see the whole funnel:

`landing_cta_click` → `onboarding_situation` → `onboarding_complete` → `session_complete` → `upgrade_view` → `upgrade_click` → `upgrade_success`, plus `tool_opened`, `interview_tracked`, and `offer_logged`.

Watch two numbers: free-to-first-session (activation) and first-session-to-upgrade (conversion). Those two tell you whether to fix the product or buy more traffic.

## Launch checklist (zero to first dollar)
1. **Charge for real.** Add Stripe keys (Step 2 above) and the Supabase persistence (Step 3). Until the webhook writes plan state to a DB, Premium is per-browser only.
2. **Deploy.** Import the repo on Vercel, add every env var from `.env.example`, deploy, point `axoncareers.com` at it, and register the Stripe webhook URL.
3. **Turn on analytics.** Add the PostHog key so you can see where people drop.
4. **Send 100 visitors.** Run one Meta ad set (below) at $20/day to the landing page.
5. **Read the funnel after 100 visitors.** Low activation means fix onboarding. Low conversion means fix the paywall moment. High both means raise spend.

## Ad creatives that match the build
- **"The Gap"** (returning parents): "You took years off for your kids. You'd do it again. But you freeze when they ask about the gap. Axon Careers writes three answers and lets you practice out loud. Free." → Gap Story Builder.
- **"The Filler Words"** (everyone): a typed answer with "um, I guess, I just" highlighted, then a confidence score. "You don't hear it. Interviewers do." → Anxiety Detector.
- **"The 3 AM Panic"** (everyone): dark screen, phone glow, score climbs to 78, eyes close. "Your interview is in 6 hours. You're ready."
- **"Paste the posting"** (career changers): the Question Predictor result. "See the 5 questions they'll ask before you walk in. Free."

Target: women 30-50 "return to work"; all 35-55 "recently laid off"; 28-45 "career change". Exclude current tech workers.

## Honest LTV math
COGS ~$0.92/user/mo (Claude + Stripe fee). Price $9.99/mo → ~91% gross margin. Annual at $79 front-loads cash and cuts churn. Job seekers churn when they land a job — that's a success, and the share card + tracker turn it into referrals.
