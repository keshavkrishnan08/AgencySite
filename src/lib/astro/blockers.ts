import type { Chart } from './reading';
import type { AspectHit, Placement } from './chart';
import { SIGNS, type Sign } from './zodiac';

/**
 * Why You're Stuck — the diagnosis.
 *
 * Every other surface describes who someone is. This one names the specific,
 * repeating pattern that costs them money, and says what it costs. It is
 * computed from the HARD aspects in the natal chart — the ones traditional
 * astrology treats as friction — plus where they sit in the Saturn cycle.
 *
 * This is deterministic astronomy, not model output: the same chart always
 * produces the same diagnosis, which is what makes it defensible when someone
 * says "that's just a horoscope".
 */

const HARD = new Set(['Square', 'Opposition', 'Conjunction']);

export interface Blocker {
  /** The pattern, named. */
  title: string;
  /** The placement it comes from, so the claim is checkable. */
  evidence: string;
  /** What it actually costs, in business terms. */
  costs: string;
  /** The specific counter-move. */
  fix: string;
  /** Tighter orb = louder pattern. Drives ordering. */
  severity: number;
}

/**
 * Named patterns for the tense pairs that actually show up in working life.
 * Keyed by the two points involved, order-independent.
 */
const PATTERNS: Record<string, Omit<Blocker, 'evidence' | 'severity'>> = {
  'Sun|Saturn': {
    title: 'You wait to be qualified',
    costs:
      'You under-charge and over-prepare. Work you could have shipped at 80% sits at 95% for another month, and someone less ready takes the position while you are still polishing.',
    fix: 'Set the price you would charge if you already had the credential, then send it. The evidence you are waiting for only arrives after the invoice, never before.',
  },
  'Moon|Saturn': {
    title: 'You absorb the cost rather than name it',
    costs:
      'You carry underperformers, discount quietly, and take on scope that was never agreed — then resent it privately instead of renegotiating it out loud.',
    fix: 'Put the uncomfortable number in writing within 48 hours of noticing it. Written is easier than spoken for this placement, and it stops the drift.',
  },
  'Mercury|Saturn': {
    title: 'You research past the point of decision',
    costs:
      'Diligence becomes the delay. The window you were analysing closes while you are still building confidence you were never going to reach analytically.',
    fix: 'Cap the research with a date, not a feeling. Decide on the date with whatever you have; the last 20% of information almost never changes the call.',
  },
  'Sun|Pluto': {
    title: 'You hold control past the point it helps',
    costs:
      'The business cannot grow beyond your personal bandwidth because the decisions that matter still route through you. You are the bottleneck and the reason it is stable.',
    fix: 'Hand over one decision class entirely — not the task, the decision — and let it be made worse than you would make it for one quarter.',
  },
  'Mars|Saturn': {
    title: 'You start and stall in the same motion',
    costs:
      'Effort goes in hard then meets your own brake. Projects reach 70% and stop, so you accumulate near-finished work that generates nothing.',
    fix: 'Halve the scope before you start, not after you stall. A finished small thing compounds; a stalled large one is a liability with your name on it.',
  },
  'Venus|Saturn': {
    title: 'You price for approval, not for value',
    costs:
      'You discount to stay liked and then work at a margin that cannot fund the thing properly. Your best clients would have paid more and quietly know it.',
    fix: 'Raise the next quote by 30% and say nothing to justify it. Silence after a number is the whole skill here.',
  },
  'Mercury|Neptune': {
    title: 'You describe the vision, not the offer',
    costs:
      'People leave conversations inspired and unclear. Interest is high and conversion is low, because nobody knows exactly what they would be buying.',
    fix: 'Write the offer in one sentence with a number in it. If it needs a second sentence, it is not an offer yet.',
  },
  'Sun|Neptune': {
    title: 'You keep the better version in your head',
    costs:
      'The real business competes with an imagined one that is always more elegant, so the real one never gets your full commitment.',
    fix: 'Write down the imagined version once, in full, then put it away. It is a roadmap, not a rival.',
  },
  'Moon|Pluto': {
    title: 'You avoid the conversation until it is a rupture',
    costs:
      'Small corrections go unsaid until they become exits. Partnerships and hires end in one large conversation that three small ones would have prevented.',
    fix: 'Say the small version within a week. Your instinct is that raising it makes it real — it is already real, and only the timing is still yours.',
  },
  'Mars|Neptune': {
    title: 'Your effort goes where the feedback is softest',
    costs:
      'You drift toward the work that feels good over the work that pays, and the two diverge for months before the numbers make it obvious.',
    fix: 'Pick the metric on Monday and check it on Friday. Not a dashboard — one number, written on paper.',
  },
  'Jupiter|Saturn': {
    title: 'You expand and contract in the same quarter',
    costs:
      'Commitments made in optimism get cut in caution. The stop-start reads to everyone around you as a strategy that keeps changing.',
    fix: 'Separate the two decisions in time. Commit in one week, size it the next — never both in the same conversation.',
  },
  'Mercury|Mars': {
    title: 'You win the argument and lose the room',
    costs:
      'You are right and expensive about it. Deals stall on tone rather than terms, and you rarely find out that is why.',
    fix: 'Make the point once. The second time you make it, you are no longer persuading, you are defending.',
  },
};

function key(a: string, b: string) {
  return [a, b].sort().join('|');
}

/** How loud this aspect is: tight and applying speaks loudest. */
function severity(hit: AspectHit): number {
  const tight = 1 + (5 - Math.min(hit.orb, 5)) / 5;
  const weight = hit.type === 'Conjunction' ? 0.8 : hit.type === 'Opposition' ? 1.1 : 1;
  return Math.round(tight * weight * 10) / 10;
}

export function findBlockers(chart: Chart): Blocker[] {
  const found: Blocker[] = [];

  for (const hit of chart.natal.aspects) {
    if (!HARD.has(hit.type)) continue;
    const pattern = PATTERNS[key(hit.a, hit.b)];
    if (!pattern) continue;

    found.push({
      ...pattern,
      evidence: `${hit.a} ${hit.type.toLowerCase()} ${hit.b}, orb ${hit.orb}° — ${hit.applying ? 'applying' : 'separating'}.`,
      severity: severity(hit),
    });
  }

  // Strongest first, de-duplicated by title: the same pattern can arrive from
  // two aspects and repeating it reads as padding.
  const seen = new Set<string>();
  return found
    .sort((a, b) => b.severity - a.severity)
    .filter((b) => !seen.has(b.title) && seen.add(b.title));
}

/* ------------------------------------------------------------- the chapter */

export interface Chapter {
  /** e.g. "The Proving Ground". */
  name: string;
  /** Where in the ~29.5-year Saturn cycle they are, 0–1. */
  progress: number;
  /** How many years into this chapter. */
  yearsIn: number;
  /** Plain-English age range of the chapter. */
  span: string;
  what: string;
  /** What ends it, and roughly when. */
  ends: string;
}

const SATURN_YEARS = 29.457;

const CHAPTERS: { upTo: number; name: string; what: string; ends: string }[] = [
  {
    upTo: 0.25,
    name: 'The Build',
    what: 'You are laying foundations that will not pay out for years. Effort is high and evidence is thin, which is exactly what this quarter of the cycle looks like from inside it — and why most people quit here.',
    ends: 'It lifts when the first structure holds weight without you propping it.',
  },
  {
    upTo: 0.5,
    name: 'The Proving Ground',
    what: 'What you built is being tested against reality rather than intention. This is the stretch where the flaw in the model surfaces — not as a crisis, as a slow leak you keep patching.',
    ends: 'It ends when you stop defending the original plan and fix the actual leak.',
  },
  {
    upTo: 0.75,
    name: 'The Harvest',
    what: 'The compounding is real and visible. This is the part of the cycle that rewards the boring work of the last decade, and the part where the temptation is to start something new instead of collecting.',
    ends: 'It closes when you have taken the returns rather than reinvested them all.',
  },
  {
    upTo: 1,
    name: 'The Clearing',
    what: 'Structures you outgrew are coming apart, usually faster than is comfortable. Roles, partnerships and models that were correct for the last cycle stop fitting the next one.',
    ends: 'It resolves at your next Saturn return, when the new foundation gets poured.',
  },
];

/**
 * Where they are in the Saturn cycle, derived from age.
 *
 * Saturn's period is ~29.46 years, so the cycle position is a real astronomical
 * quantity — this is not a personality quiz dressed as a timeline.
 */
export function currentChapter(birthUtc: Date, now = new Date()): Chapter {
  const years = (now.getTime() - birthUtc.getTime()) / (365.2425 * 86_400_000);
  const progress = (years % SATURN_YEARS) / SATURN_YEARS;
  const chapter = CHAPTERS.find((c) => progress <= c.upTo) ?? CHAPTERS[CHAPTERS.length - 1];

  const index = CHAPTERS.indexOf(chapter);
  const startFraction = index === 0 ? 0 : CHAPTERS[index - 1].upTo;
  const yearsIn = (progress - startFraction) * SATURN_YEARS;
  const cycle = Math.floor(years / SATURN_YEARS);
  const from = Math.round(cycle * SATURN_YEARS + startFraction * SATURN_YEARS);
  const to = Math.round(cycle * SATURN_YEARS + chapter.upTo * SATURN_YEARS);

  return {
    name: chapter.name,
    what: chapter.what,
    ends: chapter.ends,
    progress,
    yearsIn: Math.round(yearsIn * 10) / 10,
    span: `age ${from} to ${to}`,
  };
}

/** The sign Saturn is transiting now — the area currently under pressure. */
export function pressurePoint(chart: Chart): string {
  const saturn = chart.natal.placements.find((p: Placement) => p.point === 'Saturn');
  if (!saturn) return SIGNS[0];
  return saturn.sign as Sign;
}
