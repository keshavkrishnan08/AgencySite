import { calculateNatal, type NatalChart } from './chart';
import { chineseSign, ANIMAL_CONTENT, type ChineseSign } from './chinese';
import { lifePath, LIFE_PATHS, type LifePath } from './numerology';
import { ARCHETYPES, type Archetype } from './archetypes';
import { ELEMENT, MODALITY } from './zodiac';

/**
 * The full computed chart: western natal + numerology + Chinese animal.
 * These are exactly the three systems the product is built on.
 */
export interface Chart {
  natal: NatalChart;
  chinese: ChineseSign;
  lifePath: LifePath;
  archetype: Archetype;

  /** Denormalised for cheap rendering and for the model prompt. */
  sunSign: string;
  moonSign: string;
  risingSign: string | null;
  midheavenSign: string | null;
  partial: boolean;
}

export interface ChartInput {
  birthUtc: Date;
  /** Local calendar date of birth — numerology uses the local date, not UTC. */
  localYear: number;
  localMonth: number;
  localDay: number;
  lat: number;
  lon: number;
  timeKnown: boolean;
}

export function buildChart(input: ChartInput): Chart {
  const natal = calculateNatal({
    birthUtc: input.birthUtc,
    lat: input.lat,
    lon: input.lon,
    timeKnown: input.timeKnown,
  });

  return {
    natal,
    chinese: chineseSign(input.birthUtc),
    lifePath: lifePath(input.localYear, input.localMonth, input.localDay),
    archetype: ARCHETYPES[natal.sun.sign],
    sunSign: natal.sun.sign,
    moonSign: natal.moon.sign,
    risingSign: natal.ascendant?.sign ?? null,
    midheavenSign: natal.midheaven?.sign ?? null,
    partial: natal.partial,
  };
}

/**
 * Dense, information-first summary handed to the model. Everything the reading
 * can legitimately reference is here; nothing else is.
 */
export function chartBrief(chart: Chart, firstName: string): string {
  const n = chart.natal;
  const a = chart.archetype;
  const lp = LIFE_PATHS[chart.lifePath];
  const animal = ANIMAL_CONTENT[chart.chinese.animal];

  const placements = n.placements
    .map(
      (p) =>
        `  ${p.point.padEnd(10)} ${p.label}${p.retrograde && p.point !== 'NorthNode' ? ' (retrograde)' : ''}${p.house ? ` — house ${p.house}` : ''}`,
    )
    .join('\n');

  const aspects = n.aspects
    .slice(0, 12)
    .map(
      (x) =>
        `  ${x.a} ${x.type.toLowerCase()} ${x.b} (orb ${x.orb}°, ${x.applying ? 'applying' : 'separating'})`,
    )
    .join('\n');

  return `SUBJECT: ${firstName}

FOUNDER ARCHETYPE: ${a.name} — from a ${chart.sunSign} Sun
  Built for: ${a.builtFor}
  Known blind spot: ${a.blindSpot}
  Decision style: ${a.decisionStyle}
  Needs beside them: ${a.hire}

THE BIG THREE
  Sun       ${n.sun.label}  (${ELEMENT[n.sun.sign]}, ${MODALITY[n.sun.sign]}) — core drive
  Moon      ${n.moon.label}  — what they need privately to function
  Rising    ${n.ascendant ? n.ascendant.label : 'UNKNOWN — no birth time supplied'} — how the market reads them
  Midheaven ${n.midheaven ? n.midheaven.label : 'UNKNOWN — no birth time supplied'} — public career point

NUMEROLOGY
  Life path ${lp.number} — ${lp.title}
  Drive: ${lp.drive}
  Under pressure: ${lp.underPressure}

CHINESE ZODIAC
  ${chart.chinese.label} (${animal.title})
  Operating style: ${animal.operating}
  Works well beside: ${animal.pairsWith.join(', ')}
  Predictable friction with: ${animal.clashesWith}

CHART WEIGHTING
  Elements: Fire ${n.elements.Fire}, Earth ${n.elements.Earth}, Air ${n.elements.Air}, Water ${n.elements.Water} — dominant ${n.dominantElement}
  Modalities: Cardinal ${n.modalities.Cardinal}, Fixed ${n.modalities.Fixed}, Mutable ${n.modalities.Mutable} — dominant ${n.dominantModality}
  ${n.stellium ? `Stellium in ${n.stellium} — three or more bodies in one sign, a concentration worth naming.` : 'No stellium.'}

PLACEMENTS
${placements}

TIGHTEST ASPECTS
${aspects || '  none within orb'}

${chart.partial ? 'IMPORTANT: no birth time was given. Rising sign, Midheaven and all house placements are UNAVAILABLE. Do not invent them, do not reference houses, and say plainly which parts of the reading need an exact birth time.' : 'Birth time supplied — houses, Rising and Midheaven are reliable.'}`;
}
