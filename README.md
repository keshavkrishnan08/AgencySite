# Axon Careers

**An AI mock interview coach for the people the other tools forgot.**

Final Round, Pramp, Interview Kickstart — they all aim at the same person: a 25-year-old software engineer who lives on Reddit. Axon Careers is for everyone else. The 38-year-old returning to work after raising kids. The 52-year-old laid off after fifteen years. The teacher switching into corporate training. They're the most anxious job seekers out there, and almost nobody builds for them.

Axon Careers gives them a private room to practice in. You answer real interview questions, an AI scores you on five dimensions, and you watch the number climb session after session. A score of 44 today becomes an 82 next week — and you proved it to yourself.

---

## One main feature, two that feed it

The product does one job and does it deep. Everything else was cut.

### The main thing: Practice

Eight questions matched to your role, situation, and the actual company and posting you paste in. Every answer is scored on **clarity, relevance, specificity, confidence, and conciseness**, with one specific fix. Then the interviewer asks a real follow-up that probes what you actually said — the way a live one tests whether your story holds up. You can speak your answers; the browser transcribes them and measures your pace, pauses, and words per minute.

The **Anxiety Detector** runs on every answer, counting the filler words, hedges, apologies, and self-undermining qualifiers you don't hear yourself say.

### The metrics page

This is why people come back. Everything is computed from your own sessions in `lib/metrics.ts`:

- **Readiness** and the **percentile** it puts you in ("you answer better than 73% of candidates")
- **Estimated time to a top 1% interview** — a trend line fit through your last ten sessions gives your points-per-session, divided into the gap to 94 at your current practice frequency, projected to a real calendar date
- **Trajectory chart** — your actual scores, plus a dashed line extending your pace to the Ready (80) and Top 1% (94) bars
- **Streaks**, a 28-day activity strip, consistency percentage, week-over-week, best week, rest days
- **Per-skill breakdown** — current, best, delta, rank, pace, and days-to-80 for each of the five dimensions
- **Anxiety trends** — fillers, hedges, apologies and underminers per 100 words, versus where you started
- **Answer spread**, performance by question type, delivery metrics, personal records
- An **11-step milestone ladder** with the next one always in progress

### The two builders that feed it

| Tool | What it's for |
|---|---|
| **Question Predictor** | Paste the posting, get the five questions they'll likely ask, ranked by probability — then drill all five in a scored session with one tap |
| **Gap Story Builder** | Turns any résumé gap into three confident 30-second answers |

Both exist because they make the practice loop better. Nothing else does, so nothing else ships.

---

## It works with zero setup

**Axon Careers runs fully without any API keys.** Every score, every piece of feedback, and the Anxiety Detector are powered by a real heuristic engine (`lib/scoring.ts`) that analyzes your actual words — filler density, STAR structure, concrete numbers, hedging, length. So the product is demonstrable the second you start it.

Add an `ANTHROPIC_API_KEY` and the same routes quietly upgrade to live Claude scoring and generation. If a call ever fails, it falls straight back to the local engine. Nothing breaks.

```bash
npm install
npm run dev          # → http://localhost:3000
```

Optional, in `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

---

## Pricing

Two plans, both sized to a real job search. Defined once in `lib/pricing.ts`, read by the landing page, the paywall, and the upgrade screen.

| Plan | Price | Effective |
|---|---|---|
| Monthly | $9.99 / month | $9.99 a month |
| **3 months** | **$19.99 once** | **$6.66 a month — save 33%** |

Three months, not a year: that's roughly how long a search runs, so it's the plan that actually covers the job you're interviewing for. And it costs less than buying two months alone.

---

## Design

The look is **"calm confidence, elevated."** The demographic is anxious, so the interface had to feel like a trusted mentor's office — warm, never clinical.

- **Canvas:** a warm ivory with a faint grain and radial warmth, not flat white.
- **Color:** deep ink navy text, a calm **teal** primary, sage / amber / coral for score states, and warm **gold** for premium (no cliché purple gradients).
- **Type:** **Fraunces** (a warm editorial serif) for emotional headlines, **Hanken Grotesk** for the UI, **JetBrains Mono** for scores and data.
- **Surfaces:** layered soft shadows, glass panels, a custom glass logo emblem, and count-up score animations.
- **Charts:** Recharts with gradient fills, custom tooltips, and dashed reference lines at Ready and Top 1%.

The whole system lives in `app/globals.css` and `tailwind.config.ts`.

---

## Architecture

```
app/
  page.tsx                 Landing
  start/                   Dedicated ad landing page for paid traffic
  onboarding/              3-screen intake
  practice/                The core Practice → Score loop
  session/[id]/            Session results: radar, progress, per-answer review
  dashboard/               The metrics page
  tools/question-predictor Paste a posting → 5 questions → practice them
  tools/gap-story          Three 30-second gap answers
  signin/ upgrade/ settings/
  api/                     11 routes — Claude when keyed, heuristic otherwise
components/                ui / charts / layout / landing / practice
lib/
  scoring.ts               Heuristic scoring + Anxiety Detector engine
  metrics.ts               Every number on the dashboard, computed from sessions
  pricing.ts               Single source of truth for what we charge
  stripe.ts supabase.ts    Payments and server-side subscription truth
  store.ts cloud.ts        localStorage, mirrored to Supabase when signed in
  ai.ts client.ts questions.ts examples.ts roles.ts share.ts
```

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Framer Motion · Recharts · Anthropic SDK · Supabase · Stripe.

**Access is gated.** `components/layout/AppShell.tsx` is the single gate: not signed in goes to `/signin`, signed in without a subscription goes to `/upgrade`, and the decision is authoritative from the `subscriptions` table — never from a localStorage flag. A canceled-at-period-end subscriber keeps access until their paid time runs out. The gate is inert until the Supabase anon key is set, so local development keeps working.

**Persistence** is `localStorage`, mirrored to Supabase when signed in. See `supabase/schema.sql` — three tables (`profiles`, `sessions`, `subscriptions`), all RLS-protected, with `subscriptions` writable only by the service role.

**Payments** are real, key-gated Stripe Checkout. The full go-live runbook is in **[MONETIZATION.md](./MONETIZATION.md)**.

---

Built by Keshav Krishnan. Axon Careers is a practice tool, not a guarantee of employment.
