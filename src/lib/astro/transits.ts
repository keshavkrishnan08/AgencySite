import * as A from 'astronomy-engine';
import { BODIES, allLongitudes, isRetrograde, type BodyName } from './ephemeris';
import { separation, toPosition, type Position } from './zodiac';
import type { Chart } from './reading';

/**
 * Today's sky, and specifically what it touches in *this* chart. A generic
 * transit list is worthless on its own — the value is the hits against the
 * user's own placements.
 */

export interface TransitHit {
  transiting: BodyName;
  natal: string;
  type: 'Conjunction' | 'Sextile' | 'Square' | 'Trine' | 'Opposition';
  orb: number;
  /** Tightening rather than separating — the ones that actually matter today. */
  applying: boolean;
}

export interface TransitReport {
  date: string;
  positions: (Position & { body: BodyName; retrograde: boolean })[];
  hits: TransitHit[];
  moonPhase: string;
  moonSign: string;
  retrogrades: BodyName[];
}

const ASPECTS = [
  { type: 'Conjunction', angle: 0, orb: 3 },
  { type: 'Sextile', angle: 60, orb: 2 },
  { type: 'Square', angle: 90, orb: 3 },
  { type: 'Trine', angle: 120, orb: 3 },
  { type: 'Opposition', angle: 180, orb: 3 },
] as const;

/** The fast movers dominate a single day; the slow ones set the season. */
const DAILY_RELEVANT: BodyName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
];

function phaseName(angle: number): string {
  if (angle < 22.5 || angle >= 337.5) return 'New Moon';
  if (angle < 67.5) return 'Waxing Crescent';
  if (angle < 112.5) return 'First Quarter';
  if (angle < 157.5) return 'Waxing Gibbous';
  if (angle < 202.5) return 'Full Moon';
  if (angle < 247.5) return 'Waning Gibbous';
  if (angle < 292.5) return 'Last Quarter';
  return 'Waning Crescent';
}

export function transitReport(chart: Chart, when: Date): TransitReport {
  const time = A.MakeTime(when);
  const now = allLongitudes(time);

  const positions = BODIES.map((b) => ({
    body: b,
    ...toPosition(now[b]),
    retrograde: isRetrograde(b, time),
  }));

  // Natal points worth being hit: the luminaries, the angles, and the personals.
  const natalPoints: [string, number][] = [
    ['Sun', chart.natal.sun.lon],
    ['Moon', chart.natal.moon.lon],
  ];
  if (chart.natal.ascendant) natalPoints.push(['Ascendant', chart.natal.ascendant.lon]);
  if (chart.natal.midheaven) natalPoints.push(['Midheaven', chart.natal.midheaven.lon]);
  for (const p of chart.natal.placements) {
    if (['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(p.point)) {
      natalPoints.push([p.point, p.lon]);
    }
  }

  const later = time.AddDays(1);
  const nextLons = allLongitudes(later);

  const hits: TransitHit[] = [];
  for (const t of DAILY_RELEVANT) {
    for (const [name, natalLon] of natalPoints) {
      const sep = separation(now[t], natalLon);
      for (const asp of ASPECTS) {
        const orb = Math.abs(sep - asp.angle);
        if (orb > asp.orb) continue;
        const nextOrb = Math.abs(separation(nextLons[t], natalLon) - asp.angle);
        hits.push({
          transiting: t,
          natal: name,
          type: asp.type,
          orb: Number(orb.toFixed(2)),
          applying: nextOrb < orb,
        });
        break;
      }
    }
  }

  const moonPhaseAngle = A.MoonPhase(time);

  return {
    date: when.toISOString().slice(0, 10),
    positions,
    hits: hits.sort((a, b) => a.orb - b.orb),
    moonPhase: phaseName(moonPhaseAngle),
    moonSign: toPosition(now.Moon).sign,
    retrogrades: BODIES.filter((b) => isRetrograde(b, time)),
  };
}

/** Prose form for the model. */
/**
 * One transit contact as a readable English sentence.
 *
 * Shared because it was being written inline in three places and had already
 * drifted into "Mercury is separating opposition your Saturn" — the aspect
 * name needs both an article and its prepositions, and "opposition" takes
 * "an", not "a".
 */
export function describeHit(hit: TransitHit): string {
  const aspect = hit.type.toLowerCase();
  const article = /^[aeiou]/.test(aspect) ? 'an' : 'a';
  const motion = hit.applying ? 'is tightening into' : 'is separating from';
  return `${hit.transiting} ${motion} ${article} ${aspect} to your ${hit.natal}`;
}

export function transitBrief(r: TransitReport): string {
  const pos = r.positions
    .map((p) => `  ${p.body.padEnd(8)} ${p.label}${p.retrograde ? ' ℞' : ''}`)
    .join('\n');

  const hits = r.hits.length
    ? r.hits
        .map(
          (h) =>
            `  transiting ${h.transiting} ${h.type.toLowerCase()} natal ${h.natal} (orb ${h.orb}°, ${h.applying ? 'applying — tightening today' : 'separating'})`,
        )
        .join('\n')
    : '  no exact contacts to their chart today';

  return `DATE: ${r.date}
MOON: ${r.moonPhase}, in ${r.moonSign}
RETROGRADE: ${r.retrogrades.length ? r.retrogrades.join(', ') : 'none'}

SKY TODAY
${pos}

CONTACTS TO THEIR CHART (this is what makes today different for THEM)
${hits}`;
}
