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
| B1 | **Activation:** route straight to first question, celebrate first score | partial (empty-state CTA) |
| B2 | ~~Weekly progress email~~ | dropped (no email) |
| B3 | **Streaks** + daily nudge | ✅ already in product (dashboard) |
| B4 | **Interview scheduling**: multiple interviews, linear countdown to the soonest, selector to prep any one out of order; feeds practice role/company | ✅ shipped (InterviewSchedule) |
| B5 | **Save-on-cancel**: offer pause or 1-month discount | todo |
| B6 | ~~Re-engagement email~~ | dropped (no email) |
| B7 | **Visible progress data** ("you cut 'um' 60% in 2 weeks") | todo |

Retention strategy is **in-product, no email** — natural urgency (countdown), habit (streaks), and visible progress, surfaced where the user already is.

## Results log
| Date | Experiment | Metric | Before | After | Keep? |
|------|-----------|--------|--------|-------|-------|
| 2026-06-09 | A1–A3 annual funnel | annual share | ~50% | (measuring) | — |
