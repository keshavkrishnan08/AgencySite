# Getting paying customers — go-live runbook

Axon Careers already has the conversion machine built in. This is the checklist to turn it on and start collecting real money.

## What's real vs demo right now

| Piece | Demo (no keys) | Live (with keys) |
|---|---|---|
| AI scoring, questions, follow-ups | Heuristic engine | Claude (`ANTHROPIC_API_KEY`) |
| Voice input (listening) | Browser Web Speech API — already real, no key | same |
| Checkout | Optimistic local upgrade | Real Stripe Checkout |
| Subscription truth | `localStorage` flag (per browser) | Stripe + your DB (see step 3) |

The code paths are wired. You're flipping switches, not building.

## Step 1 — Turn on real AI (5 min)
```bash
```
Every `/api/*` route already prefers Claude and falls back to the heuristic engine. Nothing else to change.

## Step 2 — Turn on real payments (20 min)
1. In the Stripe dashboard, create a **Product** "Axon Careers Premium" with two recurring **Prices**: **$9.99 every 1 month** and **$19.99 every 3 months**.
2. Grab your keys and price IDs, then set:
```bash
STRIPE_SECRET_KEY=sk_live_...        # or sk_test_... to rehearse
STRIPE_PRICE_ID=price_...            # $9.99 / month
STRIPE_PRICE_ID_QUARTERLY=price_...  # $19.99 / 3 months
STRIPE_TRIAL_DAYS=0                  # charge immediately
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```
3. Rehearse locally:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe-webhook
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
```
4. Hit `/upgrade` → "Subscribe" → it now opens real Stripe Checkout. Use test card `4242 4242 4242 4242`.

`/api/checkout` builds the session; `/api/stripe-webhook` verifies the signature and reacts to subscription events. Both no-op safely until keys exist.

## Step 3 — Make Premium stick across devices
Today the Premium flag lives in the buyer's browser (`localStorage`). That's fine for a demo, but to enforce Premium for real you need server-side truth. Most of this is now wired:

1. Run `supabase/schema.sql` in your Supabase project (creates `profiles`, `sessions`, `subscriptions` with RLS). It is idempotent and safe to re-run.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`), and `SUPABASE_SERVICE_ROLE_KEY`.
3. Done automatically: `/api/stripe-webhook` now records each subscription to Supabase, and `lib/supabase.ts` exposes `isEmailPremium(email)` for enforcement.

Enforcement is live: `components/layout/AppShell.tsx` checks `/api/subscription-status` on every authed page and treats the `subscriptions` row as the truth, so a paying customer keeps access on any device and a lapsed one loses it. A canceled-at-period-end subscriber keeps access until their paid time runs out.

## Step 4 — Deploy (10 min)
```bash
# Vercel: import the repo, add the env vars above, deploy.
# Point your domain at it. Add the webhook endpoint URL in Stripe.
```

## Step 5 — Get traffic (the actual hard part)
The product converts; now feed it people. From the PRD, the wedge is Meta ads to the underserved demographic:
- **Audience:** women 30-50 "returning to work"; all 35-55 "recently laid off"; 28-45 "career change". Exclude current tech workers.
- **Creatives that match the build:** "The Gap" (Gap Story Builder), "The Filler Words" (Anxiety Detector), "The 3 AM Panic", "Paste the job posting" (Question Predictor).
- **Funnel:** ad → landing → onboarding → first scored answer (peak emotion) → paywall → `/upgrade` → subscribe.

## Conversion levers already in the app
- Free practice with **no signup** (try before commit), account capture at peak emotion (first good score).
- Hard paywall after the first scored answer, with the real score visible behind a blur.
- **3-month plan (save 33%)** sized to the length of a real search, which prepays the whole thing.
- Retention: the metrics page. Streaks, milestones, percentile, and a projected date for reaching a top 1% interview.

## Measure the funnel (analytics)
The app fires PostHog-compatible events with zero setup cost (no-op until keyed). Set `NEXT_PUBLIC_POSTHOG_KEY` and you'll see the whole funnel:

`landing_cta_click` → `onboarding_situation` → `onboarding_complete` → `session_complete` → `paywall_hit` → `upgrade_view` → `upgrade_click` → `upgrade_success`, plus `tool_opened`, `questions_predicted`, and `gap_story_built`.

Watch two numbers: free-to-first-session (activation) and first-session-to-upgrade (conversion). Those two tell you whether to fix the product or buy more traffic.

## Launch checklist (zero to first dollar)
1. **Charge for real.** Add Stripe keys (Step 2 above) and the Supabase persistence (Step 3). Until the webhook writes plan state to a DB, Premium is per-browser only.
2. **Deploy.** Import the repo on Vercel, add every env var from `.env.example`, deploy, point your domain at it, and register the Stripe webhook URL.
3. **Turn on analytics.** Add the PostHog key so you can see where people drop.
4. **Send 100 visitors.** Run one Meta ad set (below) at $20/day to the landing page.
5. **Read the funnel after 100 visitors.** Low activation means fix onboarding. Low conversion means fix the paywall moment. High both means raise spend.

## Ad creatives that match the build
- **"The Gap"** (returning parents): "You took years off for your kids. You'd do it again. But you freeze when they ask about the gap. Axon Careers writes three answers and lets you practice out loud. Free." → Gap Story Builder.
- **"The Filler Words"** (everyone): a typed answer with "um, I guess, I just" highlighted, then a confidence score. "You don't hear it. Interviewers do." → Anxiety Detector.
- **"The 3 AM Panic"** (everyone): dark screen, phone glow, score climbs to 78, eyes close. "Your interview is in 6 hours. You're ready."
- **"Paste the posting"** (career changers): the Question Predictor result. "See the 5 questions they'll ask before you walk in."

Target: women 30-50 "return to work"; all 35-55 "recently laid off"; 28-45 "career change". Exclude current tech workers.

## Honest LTV math
COGS ~$0.92/user/mo (Claude + Stripe fee). Monthly at $9.99 → ~91% gross margin. The 3-month plan at $19.99 nets ~$2.76 of COGS over the period (~86% margin) and front-loads the cash. Job seekers churn when they land a job — that's a success, and the share card turns it into a referral. The 3-month plan means most of them have already paid for the whole search before that happens.
