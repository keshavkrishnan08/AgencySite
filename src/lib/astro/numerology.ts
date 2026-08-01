/**
 * Pythagorean life path number — one of the three inputs Axon's reading is
 * built on, alongside the zodiac sign and the Chinese animal.
 *
 * Method: reduce month, day and year separately, sum them, reduce again.
 * Master numbers (11, 22, 33) are preserved at every step, which is the
 * standard convention.
 */

export type LifePath = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33;

const MASTERS = new Set([11, 22, 33]);

function reduce(n: number): number {
  while (n > 9 && !MASTERS.has(n)) {
    n = String(n)
      .split('')
      .reduce((sum, d) => sum + Number(d), 0);
  }
  return n;
}

export function lifePath(year: number, month: number, day: number): LifePath {
  const total = reduce(reduce(month) + reduce(day) + reduce(year));
  return reduce(total) as LifePath;
}

export interface LifePathContent {
  number: LifePath;
  title: string;
  /** One line, business-framed. */
  drive: string;
  /** The failure mode this number produces under pressure. */
  underPressure: string;
}

export const LIFE_PATHS: Record<LifePath, LifePathContent> = {
  1: {
    number: 1,
    title: 'The Originator',
    drive: 'Builds from a standing start and needs the decision to be yours.',
    underPressure: 'You stop delegating, then resent the workload you refused to share.',
  },
  2: {
    number: 2,
    title: 'The Diplomat',
    drive: 'Wins through partnership, reads the room before the numbers.',
    underPressure: 'You defer the hard conversation until the terms have already moved against you.',
  },
  3: {
    number: 3,
    title: 'The Communicator',
    drive: 'Sells the vision, makes complexity feel obvious.',
    underPressure: 'You start the next thing before the last one had a system underneath it.',
  },
  4: {
    number: 4,
    title: 'The Builder',
    drive: 'Compounds through structure and repetition. Slow start, hard to displace.',
    underPressure: 'You over-engineer the process and miss the window you built it for.',
  },
  5: {
    number: 5,
    title: 'The Operator',
    drive: 'Moves fast, thrives on variance, finds the shortcut nobody costed.',
    underPressure: 'You mistake motion for progress and change direction one pivot too early.',
  },
  6: {
    number: 6,
    title: 'The Steward',
    drive: 'Builds loyalty and keeps people. Retention is your quiet advantage.',
    underPressure: 'You carry underperformers for a quarter longer than the business can afford.',
  },
  7: {
    number: 7,
    title: 'The Analyst',
    drive: 'Sees the flaw in the model before anyone has run the numbers.',
    underPressure: 'You research past the point of decision and call the delay diligence.',
  },
  8: {
    number: 8,
    title: 'The Executive',
    drive: 'Reads leverage and capital instinctively. Comfortable with scale.',
    underPressure: 'You optimise the number and lose the people who produce it.',
  },
  9: {
    number: 9,
    title: 'The Visionary',
    drive: 'Sells a bigger story than the current product justifies, and grows into it.',
    underPressure: 'You chase the mission and let the unit economics drift.',
  },
  11: {
    number: 11,
    title: 'The Catalyst',
    drive: 'Moves rooms. People change their plans after meeting you.',
    underPressure: 'The intensity that attracts people also exhausts them, and you notice late.',
  },
  22: {
    number: 22,
    title: 'The Architect',
    drive: 'Builds things designed to outlast you. Thinks in decades.',
    underPressure: 'You will not ship until the whole system exists, so nothing compounds.',
  },
  33: {
    number: 33,
    title: 'The Mentor',
    drive: 'Multiplies through the people you develop rather than the hours you work.',
    underPressure: 'You teach when you should be deciding, and the call slips.',
  },
};
