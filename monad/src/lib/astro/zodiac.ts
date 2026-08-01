/** Zodiac primitives. Everything downstream reduces to a sign + degree. */

export type Sign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo'
  | 'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type Element = 'Fire' | 'Earth' | 'Air' | 'Water';
export type Modality = 'Cardinal' | 'Fixed' | 'Mutable';

export const SIGNS: Sign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

/**
 * Each glyph carries U+FE0E (VARIATION SELECTOR-15).
 *
 * Without it iOS, Android and macOS render the zodiac characters as full-colour
 * emoji — purple rounded squares, not typography. Appending it here rather than
 * at each render site means a new call site cannot reintroduce the bug.
 */
export const SIGN_GLYPH: Record<Sign, string> = {
  Aries: '♈\uFE0E', Taurus: '♉\uFE0E', Gemini: '♊\uFE0E', Cancer: '♋\uFE0E',
  Leo: '♌\uFE0E', Virgo: '♍\uFE0E', Libra: '♎\uFE0E', Scorpio: '♏\uFE0E',
  Sagittarius: '♐\uFE0E', Capricorn: '♑\uFE0E', Aquarius: '♒\uFE0E', Pisces: '♓\uFE0E',
};

export const ELEMENT: Record<Sign, Element> = {
  Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
  Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
  Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
  Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
};

export const MODALITY: Record<Sign, Modality> = {
  Aries: 'Cardinal', Cancer: 'Cardinal', Libra: 'Cardinal', Capricorn: 'Cardinal',
  Taurus: 'Fixed', Leo: 'Fixed', Scorpio: 'Fixed', Aquarius: 'Fixed',
  Gemini: 'Mutable', Virgo: 'Mutable', Sagittarius: 'Mutable', Pisces: 'Mutable',
};

export const RULER: Record<Sign, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Pluto',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Uranus', Pisces: 'Neptune',
};

export function norm360(d: number): number {
  return ((d % 360) + 360) % 360;
}

export interface Position {
  /** Ecliptic longitude, 0–360. */
  lon: number;
  sign: Sign;
  /** Degrees into the sign, 0–30. */
  degree: number;
  minute: number;
  /** e.g. "12°34' Leo" */
  label: string;
}

export function toPosition(lon: number): Position {
  const l = norm360(lon);
  const idx = Math.floor(l / 30) % 12;
  const into = l - idx * 30;
  const degree = Math.floor(into);
  const minute = Math.floor((into - degree) * 60);
  const sign = SIGNS[idx];
  return { lon: l, sign, degree, minute, label: `${degree}°${String(minute).padStart(2, '0')}' ${sign}` };
}

/** Shortest angular separation between two longitudes, 0–180. */
export function separation(a: number, b: number): number {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
}
