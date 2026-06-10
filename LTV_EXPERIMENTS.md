# LTV Experiments — the steady-improvement loop

The two levers that move LTV are **plan mix** (more annual = churn-immune + prepaid) and **churn** (lower = longer life). They multiply. Run `node scripts/ltv-ladder.mjs` to see the ladder; today ~1.2× LTV:CAC, the full ladder ~1.7×.

## The loop
1. **North Star:** paid → *activated* (finished a first session) → *retained at month 1*. Activation is the leading indicator of churn.
2. Ship **one experiment per week** against it.
3. Instrument it in PostHog, read after ~2 weeks of data, **keep what moves the metric**, kill what doesn't.
4. Log the result below. Update `scripts/ltv-ladder.mjs` assumptions as real numbers land.

## Backlog (ranked by impact ÷ effort)

### A — funnel into annual
| # | Idea | Status |
|---|------|--------|
| A1 | Default the paywall to **annual** | ✅ shipped |
| A2 | Price annual as **"$6.58/mo"**, lead with yearly on the pricing page | ✅ shipped |
| A3 | **"Pay yearly, save $41"** nudge when monthly is selected | ✅ shipped |
| A4 | Annual-only bonus pack (no price cut) | todo |
| A5 | Seasonal deeper annual discount ($69 launch) | todo (Stripe price) |

### B — make customers stay longer
| # | Idea | Status |
|---|------|--------|
| B1 | **Activation:** route straight to first question, celebrate first score | todo |
| B2 | **Weekly progress email** (RESEND wired; needs send) | todo |
| B3 | **Streaks** + daily question nudge | todo |
| B4 | **Interview-date goal + countdown** for urgency/return | todo |
| B5 | **Save-on-cancel**: offer pause or 1-month discount | todo |
| B6 | **Re-engagement email** at 7 days inactive | todo |
| B7 | **Visible progress data** ("you cut 'um' 60% in 2 weeks") | todo |

## Results log
| Date | Experiment | Metric | Before | After | Keep? |
|------|-----------|--------|--------|-------|-------|
| 2026-06-09 | A1–A3 annual funnel | annual share | ~50% | (measuring) | — |
