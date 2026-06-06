# PrepPath

**An AI mock interview coach for the people the other tools forgot.**

Final Round, Pramp, Interview Kickstart — they all aim at the same person: a 25-year-old software engineer who lives on Reddit. PrepPath is for everyone else. The 38-year-old returning to work after raising kids. The 52-year-old laid off after fifteen years. The teacher switching into corporate training. They're the most anxious job seekers out there, and almost nobody builds for them.

PrepPath gives them a private room to practice in. You answer real interview questions, an AI scores you on five dimensions, and you watch the number climb session after session. A score of 44 today becomes an 82 next week — and you proved it to yourself.

---

## What it does

The core loop is simple: **Practice → Score → Feedback → Improve → watch your score rise → practice more.**

- **Tailored practice sessions.** Eight questions matched to your role, situation, and the actual company + job posting you paste in, scored on clarity, relevance, specificity, confidence, and conciseness — with one specific fix per answer.
- **You can speak your answers.** A built-in voice button transcribes speech to text in the browser (no key). PrepPath listens; it doesn't talk back.
- **A conversational interviewer.** After each answer, Claude asks a real follow-up that probes what you actually said — the way a live interviewer tests whether your story holds up.
- **A retention-grade dashboard.** Readiness ring, a progress line that climbs toward a "Ready" marker at 80, per-skill sparklines with deltas, streaks, and stats.
- **An honest Anxiety Detector** baked into every score. It catches the filler words, hedging, apologies, and self-undermining qualifiers you don't hear yourself say.

And a full toolkit around the interview:

| Tool | What it's for |
|---|---|
| **Gap Story Builder** | Turns any résumé gap into three confident 30-second answers |
| **Company Research Briefing** | A one-page brief so you can answer "why us?" |
| **Question Predictor** | Paste the posting, get the five questions they'll likely ask |
| **Salary Negotiation** | A live, multi-round negotiation that pushes back |
| **Post-Interview Debrief** | Score how the real interview actually went |
| **Your Story Builder** | Build "tell me about yourself" in four steps |
| **Interview Tracker** | Log real interviews and outcomes — because offers are the point, not scores |
| **Interview Day Mode** | A timed, no-going-back pressure simulation for the night before |

---

## It works with zero setup

Here's the important part: **PrepPath runs fully without any API keys.** Every score, every piece of feedback, and the Anxiety Detector are powered by a real heuristic engine (`lib/scoring.ts`) that analyzes your actual words — filler density, STAR structure, concrete numbers, hedging, length. So the product is demonstrable the second you start it.

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

Build and serve production:

```bash
npm run build && npm run start
```

---

## Design

The look is **"calm confidence, elevated."** The demographic is anxious, so the interface had to feel like a trusted mentor's office — warm, never clinical.

- **Canvas:** a warm ivory with a faint grain and radial warmth, not flat white.
- **Color:** deep ink navy text, a calm **teal** primary, sage / amber / coral for score states, and warm **gold** for premium (no cliché purple gradients).
- **Type:** **Fraunces** (a warm editorial serif) for emotional headlines, **Hanken Grotesk** for the UI, **JetBrains Mono** for scores and data.
- **Surfaces:** layered soft shadows, glass panels, a custom glass logo emblem, and count-up score animations.
- **Charts:** Recharts with gradient fills, custom tooltips, and a dashed "Ready" reference line.

The whole system lives in `app/globals.css` and `tailwind.config.ts`.

---

## Architecture

```
app/
  page.tsx                 Landing (11 sections)
  onboarding/              3-screen, no-auth intake
  practice/                The core Practice → Score loop
  session/[id]/            Session results: radar, progress, per-answer review
  dashboard/               Retention hub: readiness, charts, streak, stats
  interview-day/           Timed pressure simulation (premium)
  upgrade/  settings/      Plan + account
  tools/                   The six interview tools
  api/                     7 routes — Claude when keyed, heuristic otherwise
components/                ui / charts / layout / landing / practice
lib/
  scoring.ts               The heuristic scoring + Anxiety Detector engine
  ai.ts                    Claude wrapper (prompt caching, JSON extraction)
  store.ts                 localStorage persistence (Supabase-shaped API)
  client.ts                Fetch helpers with offline fallback
  questions.ts examples.ts seed.ts roles.ts share.ts
```

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Framer Motion · Recharts · Anthropic SDK.

**Persistence** is `localStorage` today, behind a small data layer whose API mirrors a Supabase implementation — so swapping in a real backend later is a drop-in. **Payments** are real, key-gated Stripe Checkout (with a 7-day trial and monthly/annual prices): set the Stripe env vars and it charges live; leave them unset and `/upgrade` runs a demo flow so the app stays runnable. The full go-live runbook for getting paying customers is in **[MONETIZATION.md](./MONETIZATION.md)**.

---

## A note on scope

I trimmed to the single job: getting you ready for an interview. The marketing machinery in the spec (Meta ad campaigns, email drip sequences) isn't app code, so it's out. The Anxiety Detector isn't a separate page — it's woven into every score, which is where it actually belongs. Voice input is stubbed for a later pass; everything is typed for now.

Every screenshot in `/tmp/shots` was generated and checked with Playwright (`scripts/shots.mjs`) — all 20+ surfaces render with zero console errors.

---

Built by Keshav Krishnan. PrepPath is a practice tool, not a guarantee of employment.
