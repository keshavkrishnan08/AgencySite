import type { Chart } from '../astro/reading';
import { LIFE_PATHS } from '../astro/numerology';
import { ANIMAL_CONTENT } from '../astro/chinese';
import { ROLES } from '../astro/roles';
import { ELEMENT, MODALITY, type Sign } from '../astro/zodiac';
import { SECTIONS } from '../sections';
import type { ReadingSection } from '../sections';

/**
 * Authored output for when no model key is configured.
 *
 * Deliberately NOT placeholder text. Every sentence is assembled from the
 * chart's own computed values — sign, degree, house, life path, animal — so a
 * deploy without an API key still ships something true and specific rather
 * than an error screen. It is thinner than a generated reading, and it says so.
 */

function opener(chart: Chart, firstName: string): string {
  // The placement list carries the house; the bare Position does not.
  const sun = chart.natal.placements.find((pl) => pl.point === 'Sun');
  const house = sun?.house ? ` in the ${ordinal(sun.house)} house` : '';
  return `Your Sun sits at ${chart.natal.sun.label}${house}, which is where ${firstName}'s centre of gravity is. ${chart.archetype.oneLine}`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export function fallbackReading(chart: Chart, firstName: string): ReadingSection[] {
  const sun = chart.sunSign as Sign;
  const lp = LIFE_PATHS[chart.lifePath];
  const animal = ANIMAL_CONTENT[chart.chinese.animal];
  const fit = ROLES[sun];
  const a = chart.archetype;

  const bodies: Record<string, { title: string; standfirst: string; paragraphs: string[] }> = {
    archetype: {
      title: `Built To ${a.name.replace(/^The /, '')}`,
      standfirst: a.oneLine,
      paragraphs: [
        opener(chart, firstName),
        a.tease,
        `${ELEMENT[sun]} and ${MODALITY[sun]} is the shape of it: ${elementLine(sun)}`,
      ],
    },
    decisions: {
      title: 'How You Actually Decide',
      standfirst: a.decisionStyle.split('.')[0] + '.',
      paragraphs: [
        a.decisionStyle,
        `Your Moon in ${chart.moonSign} sets the speed you process a setback, which is not the same speed you present. ${lp.drive}`,
        `Under pressure the pattern is consistent: ${lp.underPressure.toLowerCase()}`,
      ],
    },
    strengths: {
      title: 'What You Do Better Than Them',
      standfirst: `The ${a.name.replace(/^The /, '').toLowerCase()} advantage, stated plainly.`,
      // Deliberately does NOT open on a.builtFor: that line is the spine of the
      // "Built For" section, and repeating it here made the reading read as
      // templated — the same sentence arriving three times is the loudest tell
      // that nobody wrote this for you.
      paragraphs: [
        `${a.tease} That is the edge, and it compounds in rooms where nobody else is tracking the second-order effects.`,
        `${animal.title} in the ${chart.chinese.label} year: ${animal.operating}`,
        `Life path ${chart.lifePath} — ${lp.title}. ${lp.drive}`,
      ],
    },
    blindspots: {
      title: 'The Thing Nobody Tells You',
      standfirst: a.blindSpot.split('.')[0] + '.',
      // "The seat to refuse" belongs to Built For; naming it here as well was
      // the same duplication in a second place.
      paragraphs: [
        a.blindSpot,
        fit.rot,
        `None of that shows up in a quarterly review. It shows up as a year that felt busy and moved nothing, which is why ${firstName} tends to find it late.`,
      ],
    },
    communication: {
      title: 'How You Land On People',
      standfirst: 'The gap between what you meant and what they heard.',
      paragraphs: [
        `With the Moon in ${chart.moonSign} you process privately and arrive with a conclusion, which reads to others as either decisiveness or as a decision already made without them.`,
        `Your ${chart.chinese.animal} year pairs cleanly with ${animal.pairsWith.join(' and ')} and grinds against ${animal.clashesWith}. That is a working-style read, not a verdict on anyone.`,
        `The one adjustment: say the reasoning out loud once, early, even when it feels redundant. ${a.hire}`,
      ],
    },
    business: {
      title: 'The Business That Fits',
      standfirst: 'Where this wiring is an advantage rather than a tax.',
      paragraphs: [
        a.builtFor,
        `Roles where your default behaviour is the correct behaviour: ${fit.fits.join(', ')}.`,
        `The seat to refuse: ${fit.avoid}`,
      ],
    },
    timing: {
      title: 'The Cadence To Run',
      standfirst: 'Windows, not predictions.',
      paragraphs: [
        `${MODALITY[sun]} signs run a distinct rhythm: ${modalityLine(sun)}`,
        chart.risingSign
          ? `With ${chart.risingSign} rising, the first impression you make is doing work the Sun is not. Front-load the visible moves.`
          : `Your birth time is not on file, so the rising sign and midheaven are withheld rather than guessed. Add an exact time and the timing windows sharpen considerably.`,
        `Your daily briefings compute today's sky against these placements and name the window. This section is the standing pattern underneath them.`,
      ],
    },
  };

  return SECTIONS.map(([key]) => ({ key, ...bodies[key] })) as ReadingSection[];
}

function elementLine(sun: Sign): string {
  switch (ELEMENT[sun]) {
    case 'Fire': return 'you commit before the evidence is complete and are usually early rather than wrong.';
    case 'Earth': return 'you compound, and the thing you build outlasts the people who moved faster.';
    case 'Air': return 'you think by talking, and the network is the asset the balance sheet never shows.';
    default: return 'you read the room before the numbers, and you are right about people more often than about forecasts.';
  }
}

function modalityLine(sun: Sign): string {
  switch (MODALITY[sun]) {
    case 'Cardinal': return 'you start well and lose interest at the maintenance phase, so sequence launches close together and hand off the running.';
    case 'Fixed': return 'you hold a position long past the point others fold, which wins slowly and loses expensively — set the exit rule in advance.';
    default: return 'you adapt faster than you commit, so put a decision date on the calendar or the option stays open until it closes itself.';
  }
}

export function fallbackBrief(chart: Chart, moonSign: string, hit: string | null) {
  return {
    headline: hit
      ? 'Move on the thing already in motion.'
      : 'A day for the work that does not need momentum.',
    body: hit
      ? `${hit} The Moon is in ${moonSign}. Against your ${chart.sunSign} Sun that favours the conversation you have been circling rather than a new one. ${chart.archetype.decisionStyle}`
      : `Nothing is making an exact contact to your chart today, and the Moon is in ${moonSign}. Run on what you reliably have rather than momentum you would have to borrow. ${chart.archetype.builtFor}`,
    action: hit
      ? 'Send the message you drafted and did not send. Today it lands as decisiveness.'
      : 'Close one open loop rather than opening a new one.',
  };
}

export const FALLBACK_CHAT =
  'The chart advisor is not configured on this deployment yet, so I cannot answer in your context right now. Your chart, your reading and your timing windows above are all computed and correct — they do not depend on this.';

/** Shown wherever authored copy stands in for a generated reading. */
export const FALLBACK_NOTICE = 'Written from your computed chart.';
