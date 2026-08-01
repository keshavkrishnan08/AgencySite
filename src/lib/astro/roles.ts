import type { Sign } from './zodiac';

/**
 * The seats each archetype actually holds well, and the seat it should never
 * take. Shown as chips on My Chart — concrete job titles land harder than
 * adjectives, and they are what people screenshot.
 */
export interface RoleFit {
  /** Four roles this wiring is genuinely built for. */
  fits: string[];
  /** The one seat it consistently fails in, named plainly. */
  avoid: string;
  /** Where the energy leaks when nothing is wrong enough to notice. */
  rot: string;
}

export const ROLES: Record<Sign, RoleFit> = {
  Aries: {
    fits: ['Founder, 0→1', 'Head of New Markets', 'Turnaround lead', 'Sales leader'],
    avoid: 'Maintenance ops on a mature product, where the win is that nothing changes.',
    rot: 'In month seven of something that already works. You stay, you stop starting, and you call the boredom burnout.',
  },
  Taurus: {
    fits: ['Founder, durable margin', 'COO', 'Head of Brand', 'Owner-operator'],
    avoid: 'A pre-product-market-fit seat that needs three pivots a quarter.',
    rot: 'Inside a model you have outgrown. It still pays, so you keep servicing it and the ceiling quietly sets.',
  },
  Gemini: {
    fits: ['Head of Partnerships', 'Founder, marketplace', 'CMO', 'Head of Content'],
    avoid: 'A single-account, single-motion role with no new inputs.',
    rot: 'Between four half-projects. Every one is interesting, none is finished, and the calendar hides it.',
  },
  Cancer: {
    fits: ['Founder, services', 'Head of Customer', 'Chief of Staff', 'Head of People'],
    avoid: 'A pure numbers seat where the answer is to cut people quickly.',
    rot: 'Carrying a team that has stopped growing. You protect them from the truth and absorb the cost yourself.',
  },
  Leo: {
    fits: ['Founder, brand-led', 'CEO', 'Head of Marketing', 'Creative director'],
    avoid: 'A back-office function where the work is invisible by design.',
    rot: 'In a business that is running fine without you being seen. You start manufacturing the stage instead of the growth.',
  },
  Virgo: {
    fits: ['COO', 'Head of Ops', 'Founder, systems product', 'Head of Quality'],
    avoid: 'A vision seat that has to sell a thing before it exists.',
    rot: 'Refining something that was good enough two months ago. The polish is real; the compounding stopped.',
  },
  Libra: {
    fits: ['Head of BD', 'Founder, agency', 'Chief Revenue Officer', 'Head of Partnerships'],
    avoid: 'A role where you have to be the one who says no, weekly, alone.',
    rot: 'Holding a partnership that stopped being mutual. You keep the peace and pay for it in terms.',
  },
  Scorpio: {
    fits: ['Founder, defensible tech', 'Head of Strategy', 'Head of Product', 'Investor'],
    avoid: 'A high-transparency seat where you have to think out loud, live, daily.',
    rot: 'Inside a plan you have not told anyone. It is right, it is unfunded, and it stays a plan.',
  },
  Sagittarius: {
    fits: ['Founder, expansion', 'Head of International', 'VC / scout', 'Head of Growth'],
    avoid: 'A tightly-scoped role with a fixed target and no new ground.',
    rot: 'Once the map is drawn. You built the thing, the territory is known, and you leave it undefended.',
  },
  Capricorn: {
    fits: ['Founder, infrastructure', 'CEO', 'CFO', 'Head of Strategy'],
    avoid: 'An experimental seat judged on volume of attempts rather than outcomes.',
    rot: 'Three years into a plan whose premise changed in year one. The discipline is intact; the direction is not.',
  },
  Aquarius: {
    fits: ['Founder, category-defining', 'Head of Product', 'Head of R&D', 'Technical founder'],
    avoid: 'A role that requires defending the standard answer to a conservative room.',
    rot: 'Being right early, alone, and unfunded. You mistake the lack of agreement for proof.',
  },
  Pisces: {
    fits: ['Founder, brand/story', 'Creative director', 'Head of Design', 'Head of Community'],
    avoid: 'A hard-metrics seat where the week is judged on a single number.',
    rot: 'In the version of the business that only exists in your head. It is better than the real one and it never ships.',
  },
};
