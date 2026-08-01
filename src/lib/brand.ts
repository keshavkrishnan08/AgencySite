/** Every brand-facing string lives here so the product renames in one edit. */
export const BRAND = {
  name: 'Axon',
  /** Rendered after the wordmark in brass. */
  punctuation: '.',
  tagline: 'Astrology for Business',
  strapline: 'Ancient systems, computed for your decisions.',
  domain: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  supportEmail: 'hello@axon.app',
} as const;

/**
 * Both plans receive `trial_period_days` at checkout, so both badges have to
 * say so. The annual badge previously read "Save 79%" alone while the code
 * still granted the trial — an undisclosed trial term on the more expensive
 * plan, which is the exact disclosure failure the FTC actions turn on.
 */
export const PRICING = {
  weekly: { label: 'Weekly', amount: '$9.99', cadence: '/week', badge: '3 days free' },
  annual: { label: 'Annual', amount: '$79', cadence: '/year', badge: '3 days free · save 85%' },
  trialDays: 3,
} as const;

/** The six things a subscription unlocks, in the order Axon lists them. */
export const FEATURES = [
  ['Full Reading', 'The complete document: archetype, strengths, blind spots'],
  ['Why You Are Stuck', 'The pattern costing you, named and evidenced'],
  ['Daily Briefings', 'The morning read you act on'],
  ['Chat With Your Chart', 'An advisor on call'],
  ['Timing & Windows', 'The date to move, scored on your chart'],
  ['Decision Journal', 'The record of which calls you made, and when'],
] as const;

export const DISCLAIMER =
  'For entertainment and self-reflection purposes only. Not financial, legal, business, or medical advice. No business outcome or income is promised or implied. The chart is information; the decisions are yours.';
