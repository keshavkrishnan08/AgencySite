/**
 * archetypes.ts — Founder archetype assignment
 *
 * Maps combinations of sun-sign element, life path number (and optionally
 * the raw sign) onto one of five business archetypes.
 *
 * Priority order (first match wins, ensuring determinism):
 *   1. Visionary  — master numbers (11, 22, 33) or specific power combos
 *   2. Builder    — earth signs + life paths 4 or 8
 *   3. Strategist — water signs + life paths 7 or 9
 *   4. Initiator  — fire signs + life paths 1 or 3
 *   5. Connector  — air signs + life paths 2 or 6
 *   6. Fallback   — element-only match (any life path)
 */

import type {
  Archetype,
  ArchetypeName,
  Element,
  LifePath,
  ZodiacSign,
} from "./astrology-types";

// ─── Archetype Definitions ───────────────────────────────────────────────────

const ARCHETYPES: Record<ArchetypeName, Archetype> = {
  "The Builder": {
    name: "The Builder",
    tagline: "You don't just dream it — you build it to last.",
    strengths: [
      "Exceptional ability to create sustainable systems and repeatable processes",
      "Disciplined work ethic that turns long-term visions into concrete results",
      "Natural talent for resource management, financial prudence, and operational efficiency",
    ],
    blindSpots: [
      "Can become so focused on execution that pivoting feels like failure",
      "Risk-aversion may cause hesitation when bold moves are needed",
      "May undervalue relationship-building and soft influence as business levers",
    ],
    bestBusinessModels: [
      "Franchise or licensing models with clear, replicable systems",
      "SaaS or subscription businesses where compounding retention matters",
      "Manufacturing, construction, or infrastructure businesses with tangible output",
    ],
    worstBusinessModels: [
      "Hyper-trendy DTC brands requiring constant reinvention and viral moments",
      "Purely speculative investment vehicles with no operational component",
    ],
    timingAdvice:
      "Favor multi-year horizons over quick exits. Your edge compounds over time — resist pressure to harvest too early.",
    decisionStyle:
      "Deliberate and data-driven. You make fewer decisions than peers but execute each one with higher conviction and follow-through.",
  },

  "The Strategist": {
    name: "The Strategist",
    tagline: "You see the board three moves ahead — and you remember everything.",
    strengths: [
      "Deep analytical intelligence that identifies patterns others miss",
      "Comfort with ambiguity and complexity; thrives where problems are layered",
      "Ability to build trust through expertise and quiet authority",
    ],
    blindSpots: [
      "Analysis paralysis — gathering more data when action is already overdue",
      "Can hold strategy close rather than delegating, creating bottlenecks",
      "Emotional depth may be underutilised as a leadership and sales asset",
    ],
    bestBusinessModels: [
      "Consulting, advisory, or fractional-executive businesses",
      "Research-driven SaaS or intelligence platforms with defensible data moats",
      "Private equity, venture, or fund management requiring deep due diligence",
    ],
    worstBusinessModels: [
      "High-volume, low-margin transactional businesses that require speed over depth",
      "Celebrity-brand or influencer-driven ventures where personality trumps substance",
    ],
    timingAdvice:
      "Trust your timing instincts — they are unusually well-calibrated. The moment you feel 'ready enough' is usually past the optimal entry point.",
    decisionStyle:
      "Systematic and evidence-based. You map second-order consequences before committing, which makes your decisions slower but more durable.",
  },

  "The Initiator": {
    name: "The Initiator",
    tagline: "You are the spark — markets move because you showed up.",
    strengths: [
      "Explosive energy for launching new ventures, categories, or movements",
      "Charismatic leadership that attracts early believers and top talent",
      "High risk tolerance and speed-to-market advantage over more cautious peers",
    ],
    blindSpots: [
      "Boredom sets in post-launch — sustaining operational rhythm feels constraining",
      "Optimism bias can lead to under-modelling downside scenarios",
      "Tendency to start new initiatives before prior ones reach full potential",
    ],
    bestBusinessModels: [
      "Venture-backed startups aiming for rapid market capture",
      "Agency or creative studio where every project is a fresh start",
      "Category-defining consumer brands built on founder personality and story",
    ],
    worstBusinessModels: [
      "Slow-moving regulated industries requiring multi-year compliance cycles",
      "Mature, commoditised markets where differentiation demands patience over boldness",
    ],
    timingAdvice:
      "Your windows open fast and close fast. Act during high-energy cycles; delegate maintenance to operators who thrive on stability.",
    decisionStyle:
      "Intuitive and fast. You gather just enough signal to move, then course-correct in real time — a genuine strength in fast-moving markets.",
  },

  "The Connector": {
    name: "The Connector",
    tagline: "Your network is your net worth — and yours is vast.",
    strengths: [
      "Natural ability to synthesise diverse perspectives and build coalition",
      "Skilled communicator who makes complex ideas accessible and compelling",
      "Creates ecosystems of mutual value — partnerships, communities, platforms",
    ],
    blindSpots: [
      "Conflict avoidance can delay necessary hard conversations or pivots",
      "May over-index on harmony at the expense of competitive urgency",
      "Indecision when options feel equally valid from multiple stakeholder views",
    ],
    bestBusinessModels: [
      "Marketplace or platform businesses where value grows with each new participant",
      "Media, content, or community businesses that monetise engaged audiences",
      "Partnership-led or channel-sales models where relationship depth is the moat",
    ],
    worstBusinessModels: [
      "Solo deep-tech R&D requiring solitary focus over long periods",
      "Zero-sum competitive markets where ruthless pricing is the primary weapon",
    ],
    timingAdvice:
      "Relationship capital accumulates slowly and pays off exponentially. Invest in people during calm periods so the network activates when you need it most.",
    decisionStyle:
      "Consultative and consensus-oriented. You factor stakeholder input broadly — valuable for buy-in, though a clear tie-breaker process prevents drift.",
  },

  "The Visionary": {
    name: "The Visionary",
    tagline: "You don't predict the future — you architect it.",
    strengths: [
      "Rare capacity to hold a 10-year horizon while navigating daily operations",
      "Magnetic articulation of futures that don't yet exist, inspiring investors and talent",
      "Comfort operating at the intersection of multiple disciplines and timelines",
    ],
    blindSpots: [
      "Vision can outpace execution capacity, leaving teams overwhelmed or directionless",
      "Tendency to assume others see what you see — communication scaffolding is often missing",
      "Emotional intensity around the mission can make objective self-assessment difficult",
    ],
    bestBusinessModels: [
      "Deep-tech, biotech, or space ventures requiring sustained belief before proof",
      "Transformational education or media platforms shaping how people think",
      "Impact-driven enterprises where mission and margin reinforce each other",
    ],
    worstBusinessModels: [
      "Short-cycle retail or services where quarterly pivots override long-range thinking",
      "Commoditised B2B services where vision is irrelevant and price is everything",
    ],
    timingAdvice:
      "Your work is time-zone agnostic — you operate in decades. Protect that long view fiercely; avoid business models that force short-term thinking.",
    decisionStyle:
      "Principle-led and future-anchored. You filter every choice through the question 'does this move us closer to the world we're building?' — which keeps strategy coherent over years.",
  },
};

// ─── Assignment Logic ────────────────────────────────────────────────────────

/** Life paths that are considered master numbers */
const MASTER_NUMBERS = new Set<LifePath>([11, 22, 33]);

/** Additional sign + life-path combos that qualify as Visionary (beyond master numbers) */
const VISIONARY_COMBOS: Array<{ signs: ZodiacSign[]; lifePaths: LifePath[] }> =
  [
    // Scorpio or Aquarius with 7 or 9 — the deep-insight power combo
    { signs: ["Scorpio", "Aquarius"], lifePaths: [7, 9] },
    // Sagittarius or Aries with 1 — pure prophetic fire
    { signs: ["Sagittarius", "Aries"], lifePaths: [1] },
  ];

/**
 * Assigns a founder archetype deterministically from sun-sign element and life path.
 *
 * Priority:
 *   1. Master-number life paths (11, 22, 33) → Visionary
 *   2. Specific sign + life-path power combos → Visionary
 *   3. Earth sign + life path 4 or 8 → Builder
 *   4. Water sign + life path 7 or 9 → Strategist
 *   5. Fire sign + life path 1 or 3 → Initiator
 *   6. Air sign + life path 2 or 6 → Connector
 *   7. Element-only fallback (any life path)
 *   8. Ultimate fallback → Visionary (master-number energy implied by 5)
 */
export function assignArchetype(
  sunSign: ZodiacSign,
  lifePath: LifePath,
  element: Element
): Archetype {
  // 1. Master numbers → always Visionary
  if (MASTER_NUMBERS.has(lifePath)) {
    return ARCHETYPES["The Visionary"];
  }

  // 2. Special sign + life-path combos → Visionary
  for (const combo of VISIONARY_COMBOS) {
    if (
      combo.signs.includes(sunSign) &&
      combo.lifePaths.includes(lifePath)
    ) {
      return ARCHETYPES["The Visionary"];
    }
  }

  // 3–6. Element + life-path primary matches
  if (element === "Earth" && (lifePath === 4 || lifePath === 8)) {
    return ARCHETYPES["The Builder"];
  }
  if (element === "Water" && (lifePath === 7 || lifePath === 9)) {
    return ARCHETYPES["The Strategist"];
  }
  if (element === "Fire" && (lifePath === 1 || lifePath === 3)) {
    return ARCHETYPES["The Initiator"];
  }
  if (element === "Air" && (lifePath === 2 || lifePath === 6)) {
    return ARCHETYPES["The Connector"];
  }

  // 7. Element-only fallback (life path doesn't match the primary filter)
  switch (element) {
    case "Earth":
      return ARCHETYPES["The Builder"];
    case "Water":
      return ARCHETYPES["The Strategist"];
    case "Fire":
      return ARCHETYPES["The Initiator"];
    case "Air":
      return ARCHETYPES["The Connector"];
  }

  // 8. Should be unreachable — all elements handled above
  return ARCHETYPES["The Visionary"];
}

// ─── Re-exports ──────────────────────────────────────────────────────────────

export { ARCHETYPES };
export type { Archetype };
