# Axon

Astrology for business. Computes a natal chart, numerology life path and Chinese
zodiac sign from birth date, time and place, then generates a business-framed
reading: founder archetype, strengths, blind spots, timing.

Built 1:1 against `axon.app` — structure, funnel, design tokens and type
scale captured live. See `../MONAD-CLONE-PRD.md` for the full teardown.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router + Tailwind |
| Database & auth | Supabase (Postgres, RLS, magic link + Google) |
| Payments | Stripe Checkout + webhooks + billing portal |
| Generation | Anthropic `claude-opus-5`, structured outputs |
| Email | Resend |
| Analytics | PostHog + Meta Pixel |
| Astronomy | `astronomy-engine` — no external ephemeris service |
| Geocoding | Open-Meteo (free, keyless, returns IANA timezone) |

---

## The engine

Three systems, all computed locally.

### 1. Western natal chart

- **Ecliptic of date**, not J2000. Using J2000 directly drifts by the
  accumulated precession since 2000 — enough to put a planet in the wrong sign
  near a cusp.
- **Ascendant**: `atan2(cos RAMC, −(sin RAMC·cos ε + tan φ·sin ε))`
- **Midheaven**: `atan2(sin RAMC, cos RAMC·cos ε)`
- **Houses**: whole sign. Chosen over Placidus deliberately — it is exact, has
  no iterative solution to get subtly wrong, and does not break above the polar
  circle where Placidus is undefined. Ascendant and Midheaven are computed
  independently and are identical under any system.
- **True lunar node** from the instantaneous orbital plane (`r × v`), not the
  nearest crossing, which can be ~13 days away and therefore ~0.7° stale.
- **Aspects** with conventional orbs, luminaries widened, applying/separating
  determined by re-evaluating an hour later.

### 2. Numerology

Pythagorean life path. Month, day and year reduced separately, summed, reduced
again, with master numbers (11, 22, 33) preserved at every step.

### 3. Chinese zodiac

The year boundary is **Chinese New Year, not 1 January**. A naive `year % 12`
puts everyone born in January or early February in the wrong animal — roughly
one user in nine. CNY is computed as the second new moon after the December
solstice in China standard time, which is the actual rule, so it never runs out
the way a lookup table would.

### Verification

```bash
npm run verify
```

| Check | Result |
|---|---|
| Midheaven at solar transit | **0.00035°** — exact identity |
| Ascendant on the horizon, every hour, every latitude | **1.07e-13°** |
| Ascendant/MC quadrant relation | holds at every RAMC and latitude |
| Chinese New Year, 10 published dates 1971–2026 | all exact |
| Animal boundary either side of CNY | correct |
| Life path incl. master numbers | correct |
| Historical DST (incl. British Standard Time, Jan 1970 = UTC+1) | 9/9 |
| Forgiving time parser | 15/15 |
| No birth time → angles withheld, not fabricated | pass |

The Ascendant test is worth calling out: rather than compare against another
app, it places the computed Ascendant on the ecliptic, rotates it into the
observer's horizontal frame, and asserts its altitude is zero and that it is
rising. That is the definition of the Ascendant, so it either holds exactly or
the formula is wrong. It holds to machine precision.

---

## Features

All six advertised in the pricing block are built. `npm run verify:parity` fails
the build if that ever stops being true — charging for a feature that does not
exist is both a 1:1 failure and a consumer-protection problem.

| Feature | Route | Notes |
|---|---|---|
| Full Reading | `/reading` | Six sections, generated once then cached |
| Daily Briefings | `/brief` | One per day, plus live contacts to your chart |
| Chat With Your Chart | `/chat` | Full chart in context, last 20 turns kept |
| Timing & Windows | `/outlook` | Week/month as windows, not predictions |
| Compatibility Reads | `/compat` | Up to 10 people, strictly business |
| Weekly & Monthly Outlooks | `/outlook` | Sky sampled across the period |

Free tier: archetype reveal, the big six data points, and the first two reading
sections. The remaining four render for real underneath a blur — a solid panel
converts noticeably worse than visible-but-obscured content.

## The funnel

```
/                 landing page, 8 blocks, every CTA → /start
/start            3-step modal over a dimmed page
                    1. birth data   (three selects, type-ahead place, forgiving time)
                    2. name + email ("Building your chart… Where should we send it?")
                    3. reveal → /r/[id]
/r/[id]           archetype reveal + 2 free sections + blurred rest + paywall
/login            passwordless magic link
/brief /chat /reading /account    paid
```

### Two bugs from the reference, fixed here

Axon's own build log names both as conversion-killers on mobile, where 75% of
paid traffic lands:

1. **Place of birth silently mis-resolved.** Typing "London, United Kingdom" on
   the live site resolves to *Londonthorpe* — a village of ~200 people, 160km
   away — with no confirmation, and every downstream calculation is then wrong.
   Here the place field is a type-ahead that **requires explicit selection** and
   shows the resolved IANA timezone before accepting it.
2. **Time field required a colon and never said so**, leaving the submit button
   silently dead. Here `8:10`, `810`, `8.10`, `8 10` and `8` all parse, and the
   button **always explains why it is disabled**.

### The email gate

Step 2 captures name and email **before** the reading is shown, framed as a
delivery address for a chart that is already being computed. This is the
mechanic that makes the nurture sequence possible — without it the drip has
almost nobody in it. The hero says "no card required", never "no email".

---

## Setup

```bash
npm install
cp .env.example .env.local
```

1. **Supabase** — run `supabase/schema.sql` in the SQL editor (idempotent).
   Enable Email and optionally Google under Authentication → Providers, and add
   `https://yourdomain.com/auth/callback` to the redirect allow-list.
2. **Stripe** — create two prices and set `STRIPE_PRICE_WEEKLY` ($8.99/week) and
   `STRIPE_PRICE_ANNUAL` ($98/year). Add a webhook at
   `/api/webhooks/stripe` for `checkout.session.completed`,
   `customer.subscription.{created,updated,deleted}`, `invoice.payment_failed`.
   Locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
3. **Anthropic, Resend, PostHog** — set the keys.
4. `npm run dev`

> **Rename before you ship.** `src/lib/brand.ts` holds every brand string in one
> place. It defaults to "Axon" because this build mirrors that product —
> change it and the domain before pointing paid traffic at it.

---

## Access control

`npm run verify:protection` audits all of this statically. Payment is checked in
depth, not just in the UI:

1. **`middleware.ts`** — redirects unauthenticated users away from `/brief`,
   `/chat`, `/reading`, `/account`. No database read.
2. **`(paid)/layout.tsx`** — reads `subscription_status` **and**
   `subscription_expiry`, bouncing unpaid users back to their free reading. A
   lapsed subscription whose webhook never landed still loses access.
3. **Every paid API route** re-checks entitlement and returns `402`.

The client is never trusted to report a payment. Access is granted only by the
Stripe webhook, which verifies the signature against the **raw** request body
and de-duplicates replays via the `stripe_events` primary key.

Anonymous charts are protected by an unguessable `access_token` in an httpOnly
cookie — knowing a chart's UUID is not enough to read it.

---

## Email automation

Two Vercel cron jobs (`vercel.json`), both requiring
`Authorization: Bearer $CRON_SECRET`:

| Path | UTC | Does |
|---|---|---|
| `/api/cron/daily` | 11:00 | Generates and emails each subscriber's daily briefing |
| `/api/cron/sequence` | 14:30 | Sends the day 0/2/3/5/7 nurture email to leads who have not converted |

The sequence claims each send by inserting into `email_events` **before**
sending — the unique constraint on `(chart_id, kind)` makes a double-run a
no-op, and a failed send releases the claim so tomorrow retries it. Anyone who
has since subscribed is skipped.

---

## Deploy

```bash
npx vercel deploy --prod
```

Set every variable from `.env.example`, add the domain, then update
`NEXT_PUBLIC_SITE_URL` and the Stripe webhook URL.

### Before spending over $50/day

- [ ] Walk the whole funnel on a real phone — 75% of paid traffic is mobile
- [ ] Both prices visible on the paywall without scrolling
- [ ] Checkout opens without navigating away
- [ ] Access unlocks with no manual refresh after payment
- [ ] Geo targeting set **before** going live (a suspiciously cheap CPC is the tell)
- [ ] Paywall verified firing — a silent auth bug cost the reference a full day of spend

---

## Images

`public/titans/` holds three public-domain portraits from Wikimedia Commons:
J.P. Morgan by Edward Steichen, Ronald Reagan's official portrait by Michael
Evans, and the Augustus of Prima Porta photographed by Till Niermann. The credit
line under the titans band names all three — keep it. Citing sources is part of
what makes the section read as credible rather than as a scam.

---

## Compliance

Every surface carries the disclaimer that this is for entertainment and
self-reflection, not financial, legal, business or medical advice, and that no
outcome is promised. The generation prompts explicitly ban prediction and
outcome claims. Keep it that way — the category attracts scrutiny and the ad
account is the thing you cannot easily replace.
