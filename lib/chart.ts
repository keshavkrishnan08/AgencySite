/**
 * chart.ts — Pure date-math chart calculation engine
 *
 * Three calculation pillars:
 *   1. Western zodiac sun sign  (exact date boundaries)
 *   2. Numerology life path     (reduces to 1-9 or master numbers 11, 22, 33)
 *   3. Chinese zodiac animal    (year-based, ~Feb 4 lunar-new-year cutoff)
 *
 * No external dependencies — only native Date arithmetic.
 */

import type {
  BirthData,
  Chart,
  ChineseAnimal,
  Element,
  LifePath,
  Modality,
  ZodiacSign,
} from "./astrology-types";
import { assignArchetype } from "./archetypes";

// ─── 1. Western Zodiac Sun Sign ──────────────────────────────────────────────
//
// Boundaries use the conventional tropical zodiac dates.
// Each entry: [month (1-12), day] marks the START of the sign.
// The sign runs until the day before the next boundary.
//
// Cusp dates are well-established; this table matches the most widely used
// tropical ephemeris cutoffs (±1 day variance exists in real charts but
// Feb 4 approximation matches Swiss Ephemeris within that tolerance).

interface SignBoundary {
  month: number; // 1-12
  day: number;
  sign: ZodiacSign;
}

const SIGN_BOUNDARIES: SignBoundary[] = [
  { month: 1, day: 1, sign: "Capricorn" }, // Jan 1 — still Capricorn
  { month: 1, day: 20, sign: "Aquarius" }, // Jan 20
  { month: 2, day: 19, sign: "Pisces" }, // Feb 19
  { month: 3, day: 21, sign: "Aries" }, // Mar 21
  { month: 4, day: 20, sign: "Taurus" }, // Apr 20
  { month: 5, day: 21, sign: "Gemini" }, // May 21
  { month: 6, day: 21, sign: "Cancer" }, // Jun 21
  { month: 7, day: 23, sign: "Leo" }, // Jul 23
  { month: 8, day: 23, sign: "Virgo" }, // Aug 23
  { month: 9, day: 23, sign: "Libra" }, // Sep 23
  { month: 10, day: 23, sign: "Scorpio" }, // Oct 23
  { month: 11, day: 22, sign: "Sagittarius" }, // Nov 22
  { month: 12, day: 22, sign: "Capricorn" }, // Dec 22
];

/**
 * Returns the Western tropical zodiac sun sign for a given birth date.
 * Uses month/day only; year is irrelevant for sun-sign calculation.
 */
export function getSunSign(birthDate: Date): ZodiacSign {
  const month = birthDate.getMonth() + 1; // 1-12
  const day = birthDate.getDate();

  // Convert to a simple ordinal for easy comparison (e.g., Jan 20 → 120)
  const ordinal = month * 100 + day;

  // Walk boundaries in reverse; the last one whose ordinal ≤ birth ordinal wins.
  let result: ZodiacSign = "Capricorn"; // default for very early Jan

  for (const boundary of SIGN_BOUNDARIES) {
    const boundaryOrdinal = boundary.month * 100 + boundary.day;
    if (ordinal >= boundaryOrdinal) {
      result = boundary.sign;
    }
  }

  return result;
}

// ─── 2. Numerology Life Path Number ─────────────────────────────────────────
//
// Traditional method: reduce each component (month, day, full year) to a
// single digit or master number BEFORE summing, then reduce the total.
// Master numbers 11, 22, 33 are preserved at each reduction step.

/** Reduce a positive integer to a single digit or master number (11, 22, 33). */
function reduceToLifePath(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n)
      .split("")
      .reduce((acc, d) => acc + Number(d), 0);
  }
  return n;
}

/**
 * Returns the numerology life path number (1-9, 11, 22, or 33).
 *
 * Algorithm:
 *   step 1 — reduce month to single digit / master number
 *   step 2 — reduce day to single digit / master number
 *   step 3 — reduce full year to single digit / master number
 *   step 4 — sum the three reduced values, then reduce the sum
 */
export function getLifePath(birthDate: Date): LifePath {
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();
  const year = birthDate.getFullYear();

  const reducedMonth = reduceToLifePath(month);
  const reducedDay = reduceToLifePath(day);
  const reducedYear = reduceToLifePath(year);

  const total = reduceToLifePath(reducedMonth + reducedDay + reducedYear);

  return total as LifePath;
}

// ─── 3. Chinese Zodiac Animal ────────────────────────────────────────────────
//
// The Chinese zodiac cycles through 12 animals on a 12-year cycle.
// The reference anchor: 1900 is a Rat year.
//
// Lunar New Year falls between Jan 21 and Feb 20 each year.
// We use Feb 4 as a simplified cutoff (approximate "start of spring" /
// 立春 Lìchūn). This matches common simplified implementations and avoids
// the need for a full lunar calendar lookup.
//
// For exact work, a proper lunar calendar library would be required, but
// the spec explicitly requests the Feb 4 approximation.

const CHINESE_ANIMALS: ChineseAnimal[] = [
  "Rat", // 0
  "Ox", // 1
  "Tiger", // 2
  "Rabbit", // 3
  "Dragon", // 4
  "Snake", // 5
  "Horse", // 6
  "Goat", // 7
  "Monkey", // 8
  "Rooster", // 9
  "Dog", // 10
  "Pig", // 11
];

const CHINESE_ANCHOR_YEAR = 1900; // Rat year

/**
 * Returns the Chinese zodiac animal for a given birth year.
 * Accounts for the ~Feb 4 lunar-new-year cutoff: births before Feb 4 belong
 * to the previous year's animal.
 */
export function getChineseAnimal(birthDate: Date): ChineseAnimal {
  let year = birthDate.getFullYear();
  const month = birthDate.getMonth() + 1; // 1-12
  const day = birthDate.getDate();

  // Births in Jan, or before Feb 4, belong to the previous lunar year
  if (month === 1 || (month === 2 && day < 4)) {
    year -= 1;
  }

  // Compute cycle position (JavaScript modulo can return negative; fix that)
  const offset = ((year - CHINESE_ANCHOR_YEAR) % 12 + 12) % 12;

  return CHINESE_ANIMALS[offset];
}

// ─── Element & Modality lookups ──────────────────────────────────────────────

const SIGN_ELEMENT: Record<ZodiacSign, Element> = {
  Aries: "Fire",
  Leo: "Fire",
  Sagittarius: "Fire",
  Taurus: "Earth",
  Virgo: "Earth",
  Capricorn: "Earth",
  Gemini: "Air",
  Libra: "Air",
  Aquarius: "Air",
  Cancer: "Water",
  Scorpio: "Water",
  Pisces: "Water",
};

const SIGN_MODALITY: Record<ZodiacSign, Modality> = {
  Aries: "Cardinal",
  Cancer: "Cardinal",
  Libra: "Cardinal",
  Capricorn: "Cardinal",
  Taurus: "Fixed",
  Leo: "Fixed",
  Scorpio: "Fixed",
  Aquarius: "Fixed",
  Gemini: "Mutable",
  Virgo: "Mutable",
  Sagittarius: "Mutable",
  Pisces: "Mutable",
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Computes a full astrological + numerological chart from a birth date.
 *
 * @param birthDate       - Date of birth (time-of-day ignored)
 * @param birthTimeKnown  - Whether the user knows their birth time
 *                          (stored for future ascendant calculations)
 * @param birthPlace      - Optional birth location (stored for future expansions)
 * @returns               A deterministic Chart object; same inputs → same output
 */
export function computeChart(
  birthDate: Date,
  birthTimeKnown: boolean,
  birthPlace?: string
): Chart {
  const birthData: BirthData = { birthDate, birthTimeKnown, birthPlace };

  const sunSign = getSunSign(birthDate);
  const lifePath = getLifePath(birthDate);
  const chineseAnimal = getChineseAnimal(birthDate);
  const element = SIGN_ELEMENT[sunSign];
  const modality = SIGN_MODALITY[sunSign];
  const archetype = assignArchetype(sunSign, lifePath, element);

  return {
    birthData,
    sunSign,
    lifePath,
    chineseAnimal,
    element,
    modality,
    archetype,
  };
}
