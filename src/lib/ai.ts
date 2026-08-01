import { SECTIONS, type ReadingSection } from './sections';
import { chartBrief, type Chart } from './astro/reading';
import { provider } from './ai/provider';
import { fallbackBrief, fallbackReading, FALLBACK_CHAT } from './ai/fallback';

export type { ReadingSection };

/**
 * Thrown where there is no honest authored substitute — a compatibility read or
 * an outlook is either computed against two real charts or it does not exist.
 * Routes turn this into a 503, never a 500.
 */
export class ProviderUnavailable extends Error {
  constructor() {
    super('The reading service is not configured yet.');
    this.name = 'ProviderUnavailable';
  }
}

/** True when a model is wired up. Callers use it to label authored output. */
export function aiConfigured(): boolean {
  return provider() !== null;
}

/** What actually produced the text, recorded alongside every stored reading. */
export function activeModel(): string {
  return provider()?.model ?? 'authored-fallback';
}

/**
 * House voice. The free reading has one job: be specific enough that a sceptic
 * forwards a section to someone before they have finished reading it.
 */
const VOICE = `You write readings for a business-astrology product used by founders and operators.

Voice rules, in order:
1. Lead with the specific placement, then the business consequence. "Your Midheaven in Scorpio" then what it means for how they are hired and trusted.
2. Every paragraph must end somewhere actionable — a decision, a hire, a timing call, a structure.
3. Sound like an advisor who has read a thousand charts, not a mystic. Confident, dry, unsentimental.
4. Banned: "the universe", "energy" (say capacity or drive), "vibration", "manifest", "spiritual journey", "cosmic", "soul", "destined". No emoji. No exclamation marks.
5. Be specific to the point of discomfort. Name the thing they have not admitted. The blind-spots section should feel like being read.
6. Second person throughout. Use their first name at most twice in the entire document.
7. Three sentences per paragraph, maximum.
8. Never promise income, returns, or business outcomes. Never predict events. You describe how they are built and how to operate it.
9. Never reference a placement that is not in the supplied chart data. If the birth time is missing, say which parts are unavailable rather than inventing them.`;




const READING_SCHEMA = {
  type: 'object',
  properties: {
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string', enum: SECTIONS.map((s) => s[0]) },
          title: { type: 'string', description: 'A punchy Title Case headline of three to six words, specific to this chart. Not the section name.' },
          standfirst: { type: 'string', description: 'One sentence, under 140 characters.' },
          paragraphs: {
            type: 'array',
            items: { type: 'string' },
            description: 'Three to five paragraphs, each at most three sentences.',
          },
        },
        required: ['key', 'title', 'standfirst', 'paragraphs'],
        additionalProperties: false,
      },
    },
  },
  required: ['sections'],
  additionalProperties: false,
} as const;

/** The full six-section reading. Generated once, then cached forever. */
export async function generateReading(chart: Chart, firstName: string): Promise<ReadingSection[]> {
  const outline = SECTIONS.map(([k, t, d], i) => `${i + 1}. key "${k}" — subject "${t}". ${d}`).join('\n');

  const p = provider();
  if (!p) return fallbackReading(chart, firstName);

  return (
    await p.generate<{ sections: ReadingSection[] }>({
      maxTokens: 16000,
      effort: 'high',
      schema: READING_SCHEMA as unknown as Record<string, unknown>,
      schemaName: 'reading',
      system: `${VOICE}

Write exactly seven sections, in this order, using these keys. The quoted name is the section's subject, NOT its title — write a fresh Title Case headline of three to six words for each:
${outline}

Every section must cite at least one concrete element of THIS chart — a sign and degree, a house, an aspect, the life path number, or the Chinese animal — rather than generic sun-sign traits. Specificity is the entire product.`,
      user: `Write the full reading.\n\n${chartBrief(chart, firstName)}`,
    })
  ).sections;
}

export interface DailyBrief {
  headline: string;
  body: string;
  action: string;
}

const DAILY_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'Under 60 characters. No colon.' },
    body: { type: 'string', description: 'One paragraph, three sentences maximum.' },
    action: { type: 'string', description: 'One concrete business action for today. Under 160 characters.' },
  },
  required: ['headline', 'body', 'action'],
  additionalProperties: false,
} as const;

export async function generateDailyBrief(
  chart: Chart,
  firstName: string,
  date: string,
  transits: string,
): Promise<DailyBrief> {
  const p = provider();
  if (!p) return fallbackBrief(chart, moonSign(transits), firstHit(transits));

  return p.generate<DailyBrief>({
    maxTokens: 4000,
    effort: 'medium',
    schema: DAILY_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'daily_brief',
    system: `${VOICE}

You write one short morning briefing. It reads like a note from an advisor who knows this person's chart, not a horoscope. Never predict events. Describe what today's transits touch in THEIR chart and how they should work because of it. If nothing significant is contacting their chart, say so plainly and give them a steady-state instruction — a quiet day is useful information.`,
    user: `Date: ${date}\n\n${transits}\n\nTHE PERSON:\n${chartBrief(chart, firstName)}`,
  });
}

/* The transit brief is plain text; these pull the two facts the authored
   fallback needs without making the caller pass them separately. */
function moonSign(transits: string): string {
  return transits.match(/Moon[^\n]*?in ([A-Z][a-z]+)/)?.[1] ?? 'transit';
}

function firstHit(transits: string): string | null {
  const line = transits.split('\n').find((l) => /(conjunction|square|trine|opposition|sextile)/i.test(l));
  return line ? line.trim() : null;
}

/** Chat with your chart — the retention feature. */
export async function chatWithChart(
  chart: Chart,
  firstName: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  transits: string,
): Promise<string> {
  const p = provider();
  if (!p) return FALLBACK_CHAT;

  // History is folded into the user turn: the provider interface takes one
  // system and one user message, which keeps both SDKs on the same contract.
  const conversation = history
    .map((m) => `${m.role === 'user' ? 'THEM' : 'YOU'}: ${m.content}`)
    .join('\n\n');

  return p.generate<string>({
    maxTokens: 2000,
    effort: 'medium',
    system: `${VOICE}

You are this person's chart-aware advisor. You have their full natal chart, numerology and Chinese zodiac below, plus today's sky. Answer their business questions through that lens.

Rules specific to chat:
- Answer in two to four short paragraphs. This is a conversation, not a document.
- Always ground the answer in a named placement from their chart. If nothing in the chart is relevant, say so and answer as a plain operator.
- Never give financial, legal or medical advice. Never predict an outcome.
- If they ask something the chart genuinely cannot speak to, say that rather than reaching.

THEIR CHART:
${chartBrief(chart, firstName)}

TODAY:
${transits}`,
    user: `${conversation}\n\nYOU:`,
  });
}

/* ------------------------------------------------------------ outlooks */

export interface OutlookWindow {
  label: string;
  dates: string;
  guidance: string;
}

export interface Outlook {
  headline: string;
  summary: string;
  windows: OutlookWindow[];
}

const OUTLOOK_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'Under 70 characters.' },
    summary: { type: 'string', description: 'Two or three sentences on the shape of the period.' },
    windows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'e.g. "Launch window", "Hold", "Ask window", "Recover".' },
          dates: { type: 'string', description: 'The days this covers, in plain English.' },
          guidance: { type: 'string', description: 'One or two sentences. What to do, concretely.' },
        },
        required: ['label', 'dates', 'guidance'],
        additionalProperties: false,
      },
    },
  },
  required: ['headline', 'summary', 'windows'],
  additionalProperties: false,
} as const;

/** Weekly or monthly outlook — the "plan the month in windows" feature. */
export async function generateOutlook(
  chart: Chart,
  firstName: string,
  period: 'week' | 'month',
  periodLabel: string,
  transits: string,
): Promise<Outlook> {
  const p = provider();
  if (!p) throw new ProviderUnavailable();

  return p.generate<Outlook>({
    maxTokens: 8000,
    effort: 'high',
    schema: OUTLOOK_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'outlook',
    system: `${VOICE}

You are writing the ${period === 'week' ? 'week' : 'month'} ahead as a set of WINDOWS, not a prediction. Each window is a stretch of days plus an instruction: launch, ask, hold, hire, recover.

Give three to five windows covering the whole period. Ground each one in a named transit against a named natal placement. Never predict events; describe when this person's own design is best supported for a given kind of move.`,
    user: `PERIOD: ${periodLabel}\n\n${transits}\n\nTHE PERSON:\n${chartBrief(chart, firstName)}`,
  });
}
