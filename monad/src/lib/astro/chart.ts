import * as A from 'astronomy-engine';
import {
  BODIES,
  allLongitudes,
  bodyLongitude,
  isRetrograde,
  obliquity,
  ramc,
  type BodyName,
  type PointName,
} from './ephemeris';
import {
  ELEMENT,
  MODALITY,
  SIGNS,
  norm360,
  separation,
  toPosition,
  type Element,
  type Modality,
  type Position,
  type Sign,
} from './zodiac';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export interface Placement extends Position {
  point: PointName;
  retrograde: boolean;
  house: number;
}

export interface AspectHit {
  a: PointName;
  b: PointName;
  type: 'Conjunction' | 'Sextile' | 'Square' | 'Trine' | 'Opposition';
  exact: number;
  orb: number;
  applying: boolean;
}

export interface NatalChart {
  /** Exact UTC instant used. */
  birthUtc: string;
  lat: number;
  lon: number;
  /** True when no birth time was given and noon was substituted. */
  partial: boolean;

  sun: Position;
  moon: Position;
  ascendant: Position | null;
  midheaven: Position | null;

  placements: Placement[];
  /** 12 cusp longitudes, index 0 = house 1. Null when the time is unknown. */
  houses: number[] | null;
  houseSystem: 'whole-sign' | null;
  aspects: AspectHit[];

  /** Counts across the ten bodies — drives the "how you're weighted" read. */
  elements: Record<Element, number>;
  modalities: Record<Modality, number>;
  dominantElement: Element;
  dominantModality: Modality;
  /** Sign holding the most bodies, if any stands out. */
  stellium: Sign | null;
}

/**
 * Ascendant — the ecliptic degree rising on the eastern horizon.
 *
 *   Asc = atan2( cos(RAMC), −(sin(RAMC)·cos ε + tan φ·sin ε) )
 *
 * Verified in scripts/verify-angles.ts: at sunrise the Ascendant equals the
 * Sun's longitude, which is the definition of sunrise and therefore an exact
 * self-check.
 */
export function ascendant(ramcDeg: number, latDeg: number, eps: number): number {
  const r = ramcDeg * D2R;
  const phi = latDeg * D2R;
  const e = eps * D2R;
  const y = Math.cos(r);
  const x = -(Math.sin(r) * Math.cos(e) + Math.tan(phi) * Math.sin(e));
  return norm360(Math.atan2(y, x) * R2D);
}

/**
 * Midheaven — where the local meridian cuts the ecliptic.
 *
 *   MC = atan2( sin(RAMC), cos(RAMC)·cos ε )
 *
 * Verified: at solar transit the MC equals the Sun's longitude.
 */
export function midheaven(ramcDeg: number, eps: number): number {
  const r = ramcDeg * D2R;
  const e = eps * D2R;
  return norm360(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(e)) * R2D);
}

/**
 * Whole-sign houses: house 1 is the entire sign containing the Ascendant.
 *
 * Chosen over Placidus deliberately. Whole sign is exact, has no iterative
 * solution to get subtly wrong, and does not break above the polar circle
 * where Placidus is undefined. The Ascendant and Midheaven — the two angles
 * the product actually talks about — are computed independently and are
 * identical under any system.
 */
export function wholeSignHouses(ascLon: number): number[] {
  const start = Math.floor(norm360(ascLon) / 30) * 30;
  return Array.from({ length: 12 }, (_, i) => norm360(start + i * 30));
}

function houseOf(lon: number, cusps: number[] | null): number {
  if (!cusps) return 0;
  const l = norm360(lon);
  for (let i = 0; i < 12; i++) {
    const a = cusps[i];
    const b = cusps[(i + 1) % 12];
    if (a < b ? l >= a && l < b : l >= a || l < b) return i + 1;
  }
  return 1;
}

const ASPECTS: { type: AspectHit['type']; angle: number; orb: number }[] = [
  { type: 'Conjunction', angle: 0, orb: 8 },
  { type: 'Sextile', angle: 60, orb: 6 },
  { type: 'Square', angle: 90, orb: 7 },
  { type: 'Trine', angle: 120, orb: 8 },
  { type: 'Opposition', angle: 180, orb: 8 },
];

/** Luminaries get a wider orb, as is conventional. */
function orbFor(base: number, a: PointName, b: PointName): number {
  const lum = (p: PointName) => p === 'Sun' || p === 'Moon';
  return base + (lum(a) ? 1 : 0) + (lum(b) ? 1 : 0);
}

function findAspects(
  lons: Record<PointName, number>,
  time: A.AstroTime,
): AspectHit[] {
  const points = [...BODIES, 'NorthNode'] as PointName[];
  const out: AspectHit[] = [];

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i];
      const b = points[j];
      const sep = separation(lons[a], lons[b]);

      for (const asp of ASPECTS) {
        const orb = Math.abs(sep - asp.angle);
        const allowed = orbFor(asp.orb, a, b);
        if (orb > allowed) continue;

        // Applying vs separating: does the separation shrink an hour later?
        const later = A.MakeTime(time.date).AddDays(1 / 24);
        const nextA = a === 'NorthNode' ? lons[a] : bodyLon(a, later, lons);
        const nextB = b === 'NorthNode' ? lons[b] : bodyLon(b, later, lons);
        const nextOrb = Math.abs(separation(nextA, nextB) - asp.angle);

        out.push({
          a, b,
          type: asp.type,
          exact: asp.angle,
          orb: Number(orb.toFixed(2)),
          applying: nextOrb < orb,
        });
        break;
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

/** Nodes move too slowly to matter for applying/separating; reuse their value. */
function bodyLon(
  p: PointName,
  time: A.AstroTime,
  fallback: Record<PointName, number>,
): number {
  if (p === 'NorthNode' || p === 'SouthNode') return fallback[p];
  return bodyLongitude(p as BodyName, time);
}

export interface NatalInput {
  birthUtc: Date;
  lat: number;
  lon: number;
  /** False when the birth time was unknown and noon was substituted. */
  timeKnown: boolean;
}

export function calculateNatal({
  birthUtc,
  lat,
  lon,
  timeKnown,
}: NatalInput): NatalChart {
  const time = A.MakeTime(birthUtc);
  const lons = allLongitudes(time);
  const eps = obliquity(time);

  // Angles depend on the exact minute and place. Without a birth time they
  // would be fiction, so they are withheld rather than guessed.
  let asc: number | null = null;
  let mc: number | null = null;
  let cusps: number[] | null = null;
  if (timeKnown) {
    const r = ramc(time, lon);
    asc = ascendant(r, lat, eps);
    mc = midheaven(r, eps);
    cusps = wholeSignHouses(asc);
  }

  const placements: Placement[] = ([...BODIES, 'NorthNode'] as PointName[]).map(
    (p) => ({
      point: p,
      ...toPosition(lons[p]),
      retrograde: p === 'NorthNode' ? true : isRetrograde(p as BodyName, time),
      house: houseOf(lons[p], cusps),
    }),
  );

  const elements: Record<Element, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalities: Record<Modality, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 };
  const signCount = new Map<Sign, number>();

  for (const b of BODIES) {
    const s = toPosition(lons[b]).sign;
    elements[ELEMENT[s]]++;
    modalities[MODALITY[s]]++;
    signCount.set(s, (signCount.get(s) ?? 0) + 1);
  }

  const dominantElement = (Object.keys(elements) as Element[]).reduce((a, b) =>
    elements[a] >= elements[b] ? a : b,
  );
  const dominantModality = (Object.keys(modalities) as Modality[]).reduce((a, b) =>
    modalities[a] >= modalities[b] ? a : b,
  );

  let stellium: Sign | null = null;
  for (const s of SIGNS) if ((signCount.get(s) ?? 0) >= 3) stellium = s;

  return {
    birthUtc: birthUtc.toISOString(),
    lat,
    lon,
    partial: !timeKnown,
    sun: toPosition(lons.Sun),
    moon: toPosition(lons.Moon),
    ascendant: asc === null ? null : toPosition(asc),
    midheaven: mc === null ? null : toPosition(mc),
    placements,
    houses: cusps,
    houseSystem: cusps ? 'whole-sign' : null,
    aspects: findAspects(lons, time),
    elements,
    modalities,
    dominantElement,
    dominantModality,
    stellium,
  };
}
