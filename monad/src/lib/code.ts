import { ELEMENT, MODALITY, type Sign } from './astro/zodiac';

const ELEMENT_LETTER = { Fire: 'A', Earth: 'B', Air: 'C', Water: 'D' } as const;
const MODALITY_NUMBER = { Cardinal: 1, Fixed: 2, Mutable: 3 } as const;

/**
 * The short classification code shown beside the archetype, e.g. "C-3".
 * Element letter + modality number — a real taxonomy, not a decoration, so two
 * people with the same code genuinely share a temperament.
 */
export function chartCode(sun: Sign): string {
  return `${ELEMENT_LETTER[ELEMENT[sun]]}-${MODALITY_NUMBER[MODALITY[sun]]}`;
}
