// ─── Astrology-for-business types ───────────────────────────────────────────

export type ZodiacSign =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces";

export type Element = "Fire" | "Earth" | "Air" | "Water";

export type Modality = "Cardinal" | "Fixed" | "Mutable";

export type ChineseAnimal =
  | "Rat"
  | "Ox"
  | "Tiger"
  | "Rabbit"
  | "Dragon"
  | "Snake"
  | "Horse"
  | "Goat"
  | "Monkey"
  | "Rooster"
  | "Dog"
  | "Pig";

export type LifePath =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 11
  | 22
  | 33;

export type ArchetypeName =
  | "The Builder"
  | "The Strategist"
  | "The Initiator"
  | "The Connector"
  | "The Visionary";

// ─── Input ───────────────────────────────────────────────────────────────────

export interface BirthData {
  /** Full birth date (time-of-day is ignored for these calculations) */
  birthDate: Date;
  /** Whether the user knows their birth time (affects ascendant accuracy, noted for future use) */
  birthTimeKnown: boolean;
  /** Optional birth city / country (stored, used in future expansions) */
  birthPlace?: string;
}

// ─── Archetype ───────────────────────────────────────────────────────────────

export interface Archetype {
  name: ArchetypeName;
  tagline: string;
  strengths: [string, string, string];
  blindSpots: [string, string, string];
  bestBusinessModels: [string, string, string];
  worstBusinessModels: [string, string];
  timingAdvice: string;
  decisionStyle: string;
}

// ─── Chart ───────────────────────────────────────────────────────────────────

export interface Chart {
  /** Raw input that produced this chart */
  birthData: BirthData;

  // ── Three pillars ──
  sunSign: ZodiacSign;
  lifePath: LifePath;
  chineseAnimal: ChineseAnimal;

  // ── Derived attributes ──
  element: Element;
  modality: Modality;

  // ── Archetype assignment ──
  archetype: Archetype;
}

// ─── Reading (higher-level narrative wrapper) ────────────────────────────────

export interface Reading {
  chart: Chart;
  /** Short paragraph interpreting the combination for business context */
  summary: string;
  /** ISO 8601 timestamp when this reading was generated */
  generatedAt: string;
}
