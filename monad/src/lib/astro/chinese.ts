import * as A from 'astronomy-engine';

/**
 * Chinese zodiac animal — the third input to the reading.
 *
 * The year boundary is Chinese New Year, NOT 1 January. A naive `year % 12`
 * puts everyone born in January or early February in the wrong animal, which
 * is roughly one in nine users.
 *
 * CNY is the second new moon after the December solstice, evaluated in China
 * standard time (UTC+8). That is the actual rule, so it is computed rather
 * than looked up from a table that would eventually run out.
 */

export const ANIMALS = [
  'Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake',
  'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig',
] as const;

export type Animal = (typeof ANIMALS)[number];

export const ELEMENTS_CN = ['Metal', 'Water', 'Wood', 'Fire', 'Earth'] as const;
export type ChineseElement = (typeof ELEMENTS_CN)[number];

const CST_OFFSET_MS = 8 * 3600 * 1000;

/**
 * Chinese New Year for a given Gregorian year, as the CST calendar date
 * represented at UTC midnight — so `toISOString().slice(0, 10)` prints the
 * date people actually publish.
 */
export function chineseNewYear(year: number): Date {
  // December solstice of the previous year.
  const solstice = A.Seasons(year - 1).dec_solstice;

  // Walk forward to the second new moon after it.
  let t = A.SearchMoonPhase(0, solstice, 40);
  if (!t) throw new Error(`no new moon after ${year - 1} solstice`);

  // If that first new moon falls on the same CST day as the solstice or
  // before it, it does not count; SearchMoonPhase already starts after, so
  // take the next one directly.
  const second = A.SearchMoonPhase(0, t.AddDays(1), 40);
  if (!second) throw new Error(`no second new moon for ${year}`);
  t = second;

  // CNY is the CST calendar day containing that new moon. Return it as a
  // date, not an instant — subtracting the offset here would make the ISO
  // string render the previous day.
  const cst = new Date(t.date.getTime() + CST_OFFSET_MS);
  return new Date(Date.UTC(cst.getUTCFullYear(), cst.getUTCMonth(), cst.getUTCDate()));
}

/** YYYY-MM-DD in UTC. */
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface ChineseSign {
  animal: Animal;
  element: ChineseElement;
  /** The zodiac year this birth belongs to, after the CNY adjustment. */
  zodiacYear: number;
  label: string;
}

export function chineseSign(birthUtc: Date): ChineseSign {
  const y = birthUtc.getUTCFullYear();
  // Compare calendar dates, not instants: the animal changes on the CNY
  // calendar day, so anyone born on that date is the new animal regardless of
  // the hour. Comparing timestamps makes the boundary hour-sensitive and wrong.
  const zodiacYear = isoDay(birthUtc) < isoDay(chineseNewYear(y)) ? y - 1 : y;

  // 1984 was a Wood Rat year — the start of a 60-year cycle.
  const animal = ANIMALS[(((zodiacYear - 1984) % 12) + 12) % 12];
  // The element advances every two years across a 10-year cycle.
  const element = ELEMENTS_CN[(((Math.floor((zodiacYear - 1984) / 2) % 5) + 5) % 5 + 2) % 5];

  return { animal, element, zodiacYear, label: `${element} ${animal}` };
}

export interface AnimalContent {
  animal: Animal;
  title: string;
  /** How this animal shows up in business, in one line. */
  operating: string;
  /** Who they work best beside. */
  pairsWith: Animal[];
  /** Predictable friction. */
  clashesWith: Animal;
}

export const ANIMAL_CONTENT: Record<Animal, AnimalContent> = {
  Rat:     { animal: 'Rat',     title: 'The Opportunist', operating: 'Spots the opening before it is priced in and moves on it quietly.', pairsWith: ['Dragon', 'Monkey'], clashesWith: 'Horse' },
  Ox:      { animal: 'Ox',      title: 'The Anchor',      operating: 'Outlasts everyone. Wins the categories that reward not quitting.', pairsWith: ['Snake', 'Rooster'], clashesWith: 'Goat' },
  Tiger:   { animal: 'Tiger',   title: 'The Challenger',  operating: 'Takes the fight to incumbents and is comfortable being disliked.', pairsWith: ['Horse', 'Dog'], clashesWith: 'Monkey' },
  Rabbit:  { animal: 'Rabbit',  title: 'The Negotiator',  operating: 'Gets terms without friction. Rarely leaves an enemy behind.', pairsWith: ['Goat', 'Pig'], clashesWith: 'Rooster' },
  Dragon:  { animal: 'Dragon',  title: 'The Figurehead',  operating: 'Raises money and attention on presence. Scale comes early.', pairsWith: ['Rat', 'Monkey'], clashesWith: 'Dog' },
  Snake:   { animal: 'Snake',   title: 'The Strategist',  operating: 'Plays several moves out and says less than they know.', pairsWith: ['Ox', 'Rooster'], clashesWith: 'Pig' },
  Horse:   { animal: 'Horse',   title: 'The Sprinter',    operating: 'Ships fast and covers ground others plan around.', pairsWith: ['Tiger', 'Dog'], clashesWith: 'Rat' },
  Goat:    { animal: 'Goat',    title: 'The Craftsman',   operating: 'Builds the thing people keep. Quality is the moat.', pairsWith: ['Rabbit', 'Pig'], clashesWith: 'Ox' },
  Monkey:  { animal: 'Monkey',  title: 'The Improviser',  operating: 'Solves in ways nobody costed. Thrives when the plan breaks.', pairsWith: ['Rat', 'Dragon'], clashesWith: 'Tiger' },
  Rooster: { animal: 'Rooster', title: 'The Operator',    operating: 'Runs tight systems and sees the number before the report does.', pairsWith: ['Ox', 'Snake'], clashesWith: 'Rabbit' },
  Dog:     { animal: 'Dog',     title: 'The Loyalist',    operating: 'Builds teams that stay. Trust is the compounding asset.', pairsWith: ['Tiger', 'Horse'], clashesWith: 'Dragon' },
  Pig:     { animal: 'Pig',     title: 'The Provider',    operating: 'Generous operator who builds durable goodwill and repeat business.', pairsWith: ['Rabbit', 'Goat'], clashesWith: 'Snake' },
};
