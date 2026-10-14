# Axon

**Astrology for business, computed from the sky rather than looked up from a table. Axon turns a birth date, time, and place into a natal chart, a numerology life path, and a Chinese zodiac sign, then frames them as a reading about how someone operates.**

Most astrology apps look a sign up in a table and write the same paragraph for millions of people. The computation is where they cut corners: planet positions in a frame that drifts near sign boundaries, everyone born in January filed under the wrong Chinese animal, birth times converted with today's daylight-saving rules instead of the rules in force that year. Axon treats the chart as an astronomy problem with checkable answers. It computes every position locally, tests the angles against their own definitions, and withholds what it cannot know. Only then does it hand a dense chart summary to a language model, and when no model is configured it ships an authored reading built from the same computed values. The public pages and every email say plainly that it is for entertainment and self-reflection.

```
birth date + time + place
  ->  Open-Meteo geocode (coordinates + IANA timezone, explicit selection)
  ->  local time to UTC (Intl, historical DST rules, two passes across transitions)
  ->  astronomy-engine: 10 bodies + true lunar node, ecliptic and equinox of date
  ->  Ascendant, Midheaven, whole-sign houses, aspects  +  life path  +  Chinese animal
  ->  chart brief  ->  language model (JSON schema) or authored fallback
  ->  reveal page (2 free sections)  ->  Stripe checkout  ->  briefings, timing, chat
```

The math is checkable. The reading is not a prediction.

## The core idea

1. **Compute the sky, do not look it up.** Positions come from `astronomy-engine`, rotated into the true ecliptic and equinox of date. The J2000 frame the library returns by default drifts by about 0.36° per 25 years, enough to put a planet in the wrong sign near a cusp. The lunar node is the osculating true node from the Moon's instantaneous orbital plane (r × v), not the nearest node crossing.
2. **Withhold what cannot be known.** With no birth time, noon local is used for the planets and the Ascendant, Midheaven, and houses are set to null rather than guessed. The model prompt says so explicitly and forbids inventing them.
3. **Deterministic wherever possible.** The founder archetype, the "Why You're Stuck" diagnosis, and the best-day scores are pure computation: the same chart always returns the same answer, instantly, at no cost. A model writes only the prose: the reading, the daily briefing, the outlooks, chat, and one line in a nurture email.

## What it does

| Feature | Route | How |
|---|---|---|
| **Free chart and reveal** | `/start`, `/r/[id]` | A three-step flow (birth data, then name and email, then reveal). The reveal shows the archetype and the first **2** of 7 reading sections. Locked sections leave the server cut to a teaser of at most 90 characters, so the blur hides nothing worth extracting. |
| **Full Reading** | `/chart` | Seven fixed sections, generated once per chart against a JSON schema and cached in `readings`. |
| **Why You're Stuck** | `/stuck` | Hard aspects (square, opposition, conjunction) between named pairs, such as Sun to Saturn or Venus to Saturn, mapped to a pattern with its evidence, its cost, and a fix, ordered by orb. Adds where the user sits in the **29.457**-year Saturn cycle. |
| **Timing and Windows** | `/timing` | Scores each of the next **30** days for one of six intents (launch, ask, pitch, hire, hard conversation, rest) from transits to the natal chart. Harmonious aspects help a launch and hard ones hurt it; for a hard conversation the weights flip. Returns the best three days and a day to avoid. |
| **Daily Briefings** | `/updates` | A cron job generates and emails each subscriber's briefing at 11:00 UTC. |
| **Chat With Your Chart** | `AskPanel` | The full chart in context. **15** answers a day on a paid plan, **1** a day as a free taste. |
| **Decision Journal** | `/updates` | Logs decisions against the day they were made. |
| **Lead email** | `/api/cron/sequence` | Day 0, 1, 2, 3, 5, and 7 emails to leads who have not subscribed, at 14:30 UTC. |
| **Trial notice** | `/api/cron/trial-reminder` | Emails before a trial converts, at 16:00 UTC, regardless of marketing preferences. |
| **Pricing** | `src/lib/brand.ts` | $7.99 a week or $78.99 a year, each with a 24-hour free trial. |

### Verification (`npm run verify`)

The chart math is checked against definitions, not against another app.

| Check | Script | Cases | Pass condition |
|---|---|---|---|
| Ascendant lies on the eastern horizon | `verify-angles.ts` | 7 cities x 48 half-hour steps = 336 | altitude under 1e-6° and rising; the script notes the result is about 1e-13° |
| Ascendant equals the Sun at sunrise | `verify-angles.ts` | 7 cities x 4 dates | within 0.1° (root-finding resolution) |
| Midheaven equals the Sun at solar transit | `verify-angles.ts` | 7 cities x 4 dates | within 0.05° |
| Ascendant always 0 to 180° past the Midheaven | `verify-angles.ts` | 52 RAMC values x 7 latitudes | holds everywhere |
| Chinese New Year | `verify-chinese.ts` | **10** published dates, 1971 to 2026 | exact date |
| Animal on either side of New Year | `verify-chinese.ts` | 6 birth dates | exact animal |
| Life path, including a leap day | `verify-chinese.ts` | 3 dates | exact number |
| Local time to UTC | `verify-tz.ts` | **9** cases: Hawaii with no DST, British Standard Time in January 1970, a half-hour offset, Sydney summer time, an ambiguous fall-back hour | exact instant |
| Forgiving time parser | `verify-timeparse.ts` | **15** inputs (`8:10`, `810`, `8.10`, `8 10`, `8`, and rejects) | exact |
| No birth time | `verify-chart.ts` | partial chart | angles and houses withheld |
| Paywall is server side | `verify-protection.ts` | every paid API route | checks entitlement and returns 402 |
| Every advertised feature exists | `verify-parity.ts` | six pricing-block features | each maps to a page and an implementation |

## How it works

**Stack.** Next.js 15 (App Router) and React 19 in TypeScript, Tailwind CSS. Supabase for Postgres, row-level security, and email and password auth. Stripe Checkout, webhooks, and the billing portal. Resend for email. PostHog and the Meta Pixel for analytics. `astronomy-engine` for every position, with no external ephemeris service.

**Angles and houses.** The Ascendant is `atan2(cos RAMC, -(sin RAMC cos e + tan phi sin e))` and the Midheaven is `atan2(sin RAMC, cos RAMC cos e)`, where RAMC is local apparent sidereal time and e is the true obliquity including nutation. Houses are whole sign, chosen over Placidus because whole sign is exact, has no iterative solution to get subtly wrong, and does not break above the polar circle. Retrograde motion is read from the longitude change across one day.

**Aspects.** Conjunction, trine, and opposition at an 8° orb, square at 7°, sextile at 6°, each widened by 1° per luminary involved. Applying versus separating is decided by recomputing the separation one hour later. Daily transits use tighter 2° to 3° orbs against the Sun, the Moon, the angles, and Mercury through Saturn.

**Numerology and Chinese zodiac.** The life path reduces month, day, and year separately, sums them, and reduces again, keeping 11, 22, and 33 at every step. It uses the local calendar date of birth, not UTC. The Chinese year starts at the second new moon after the December solstice, evaluated in China standard time (UTC+8), so it is computed rather than read from a table that eventually runs out. The element advances every two years from the 1984 Wood Rat.

**Place and time.** The city field is a type-ahead over Open-Meteo that requires an explicit pick and returns the IANA timezone. Offsets come from `Intl`, so historical DST applies, and the conversion runs two passes so times near a transition converge. Timezones are validated by constructing a formatter rather than by membership in `Intl.supportedValuesOf`, which lists only one spelling per zone and had rejected `Asia/Kolkata` and `Europe/Kyiv`.

**Generation.** One provider interface over the OpenAI and Anthropic SDKs, chosen by which API key is present (OpenAI wins when both are set). Readings use structured JSON output and a house style that bans outcome promises and any placement not in the supplied chart. With no key, readings, briefings, and chat fall back to authored text assembled from the computed chart. An outlook has no honest substitute, so that route returns 503 instead.

**Access and billing.** The app shell needs a chart, not an account: an anonymous visitor holds a cookie with the chart id and a secret token, and a chart is served only to its owner or the token holder. Only `/settings` requires sign-in. Paid API routes re-check entitlement and return 402, and a lapsed subscription loses access at its stored expiry even if a webhook never lands. Paid access is granted only by the Stripe webhook, which verifies the signature against the raw body, de-duplicates replays through the `stripe_events` primary key, and deletes that marker if the handler fails so Stripe's retry can run. Cron routes require a bearer secret. The nurture sequence claims each send through a unique `(chart_id, kind)` row, so a double run is a no-op.

**Spend control and degraded mode.** In-process fixed-window limits on the model routes: reading 4 an hour, briefing 10 an hour, outlook 8 an hour, chat 15 a day, chart computation 20 an hour. If the database write fails, the computed chart is kept in an in-process store (500 rows, 6-hour TTL) so the visitor still sees it.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck
npm run verify       # angles, Chinese calendar, timezones, time parser, chart, paywall, parity
```

Run `supabase/schema.sql` in the Supabase SQL editor first. There is no `.env.example`; the code reads `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `CRON_SECRET`, `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, and optionally `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_META_PIXEL_ID`. Stripe events go to `/api/webhooks/stripe`.

## Layout

```
src/
  lib/astro/
    ephemeris.ts       body longitudes (ecliptic of date), true node, obliquity, sidereal time
    chart.ts           Ascendant, Midheaven, whole-sign houses, aspects, element and modality counts
    numerology.ts      life path with master numbers
    chinese.ts         Chinese New Year from the solstice and new moons, animal and element
    geo.ts             Open-Meteo search, local time to UTC, timezone validation
    transits.ts        today's sky against the natal chart
    bestday.ts         intent-weighted day scoring
    blockers.ts        hard-aspect diagnosis and Saturn cycle
    archetypes.ts roles.ts zodiac.ts reading.ts   content tables and the chart brief
  lib/ai/              provider switch and authored fallback
  lib/                 entitlement, Stripe, email, rate limits, chart storage, brand and pricing
  app/                 landing, /start, /r/[id], /login, legal pages
  app/(app)/           chart, stuck, timing, updates, settings
  app/api/             chart, reading, brief, chat, outlook, decisions, checkout, portal,
                       Stripe webhook, three cron jobs
  components/          start flow, city picker, paywall, app shell and views
scripts/               verify-* checks, webhook and Stripe test helpers, mobile audit
supabase/schema.sql    tables, row-level security, constraints
vercel.json            cron schedule
```

## Honesty

* Axon is for entertainment and self-reflection. The landing page, the reveal page, the legal pages, and every email carry a disclaimer that it is not financial, legal, business, or medical advice and that no outcome is promised, and the generation prompts ban predictions and income claims.
* Exact astronomy does not make astrology predictive. The verification table shows that the chart is computed correctly, not that a reading is true.
* The `verify` scripts are run by hand. There is no CI and no unit test framework in the repo.
* Houses are whole sign only. Users who expect Placidus will see different house placements.
* The rate limiter and the fallback chart store live in process memory, so limits are per server instance and fallback charts vanish on restart. The daily-brief cron handles at most 500 subscribers per run.
* The `/r/[id]` share page treats the chart's random UUID as the authorization and shows no email or raw birth data. Every other chart read needs the owner or the secret token.
* The funnel and positioning follow an existing business-astrology product. Every brand string lives in `src/lib/brand.ts`.
