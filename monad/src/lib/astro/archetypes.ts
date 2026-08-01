import type { Sign } from './zodiac';

/**
 * The twelve founder archetypes — the free hook.
 *
 * Mapped one-to-one onto the Sun sign deliberately. Everyone already knows
 * their sign, so the archetype costs zero seconds to explain, while the name
 * itself is proprietary and business-framed. The depth comes from the reading,
 * which draws on the whole chart plus numerology and the Chinese animal.
 */

export interface Archetype {
  sign: Sign;
  name: string;
  /** One line for the reveal screen. */
  oneLine: string;
  /** The business this wiring is built for. */
  builtFor: string;
  /** Two sentences for the free reading. */
  tease: string;
  /** Where they consistently undercut themselves. */
  blindSpot: string;
  /** How they should be making decisions. */
  decisionStyle: string;
  /** Who they need next to them. */
  hire: string;
}

export const ARCHETYPES: Record<Sign, Archetype> = {
  Aries: {
    sign: 'Aries',
    name: 'The Initiator',
    oneLine: 'Starts from nothing and moves before the plan is finished.',
    builtFor: 'Category creation, launches, and anything that dies without early momentum.',
    tease: 'Initiators get a business off the ground in a timeframe that looks reckless from outside and obvious from inside. The cost is that the second year of any venture asks for a discipline the first year rewarded you for ignoring.',
    blindSpot: 'You decide fast and then defend the decision instead of revisiting it. Being early is your edge; staying wrong is what it costs you.',
    decisionStyle: 'Trust the first instinct on direction, but force a 24-hour hold on anything irreversible. Speed is your advantage everywhere except the door you cannot reopen.',
    hire: 'A finisher who owns the last 20%, and who is allowed to tell you a thing is not done.',
  },
  Taurus: {
    sign: 'Taurus',
    name: 'The Builder',
    oneLine: 'Compounds slowly and becomes impossible to displace.',
    builtFor: 'Durable margin businesses, brands, and anything where year five beats year one.',
    tease: 'Builders win the categories that reward not quitting, which is most of them. The risk is that the patience that makes you formidable also makes you sit with a broken model far longer than the numbers justify.',
    blindSpot: 'You confuse persistence with strategy. The thing you are refusing to abandon is sometimes the thing that is holding the whole quarter.',
    decisionStyle: 'You are right to move slowly on structure and wrong to move slowly on people. Separate the two and decide them on different clocks.',
    hire: 'Someone with no sunk cost in your history who will name the thing you should have killed.',
  },
  Gemini: {
    sign: 'Gemini',
    name: 'The Connector',
    oneLine: 'Moves information and people faster than anyone in the market.',
    builtFor: 'Marketplaces, media, partnerships, and anything where distribution is the moat.',
    tease: 'Connectors build the network before the product and end up with a distribution advantage competitors cannot buy. The trade is depth: you know everyone and are running several things at 70%.',
    blindSpot: 'You start the next conversation before the last one produced a commitment. Your pipeline looks full and converts thin.',
    decisionStyle: 'Decide out loud, with one person who will not be impressed. Talking is how you think; an audience is how you avoid finishing.',
    hire: 'An operator who converts your relationships into contracts without needing you in the room.',
  },
  Cancer: {
    sign: 'Cancer',
    name: 'The Custodian',
    oneLine: 'Builds businesses people stay inside — customers and staff both.',
    builtFor: 'Retention-led businesses, communities, services, and long client relationships.',
    tease: 'Custodians post retention numbers that make acquisition costs look cheap, because people do not leave. The cost is that the same instinct keeps the wrong people on the payroll a quarter past the point everyone else noticed.',
    blindSpot: 'You read every business problem as a relationship problem. Some of them are just maths, and you will lose money treating them gently.',
    decisionStyle: 'Sleep on anything that involves a person. Your first read is emotional and your second is usually correct.',
    hire: 'A numbers-first second who is measured on unit economics, not harmony.',
  },
  Leo: {
    sign: 'Leo',
    name: 'The Figurehead',
    oneLine: 'Raises money, attention and talent on presence alone.',
    builtFor: 'Brand-led companies, consumer, and anything that needs a face to move.',
    tease: 'Figureheads shortcut years of distribution because people want to be near the thing they are building. The exposure is that the company becomes indistinguishable from you, which caps the exit and the holiday.',
    blindSpot: 'You confuse attention with traction. The room being impressed is not the same as the cohort retaining.',
    decisionStyle: 'Ask what you would do if nobody would ever know you did it. The answer strips the vanity out of the call.',
    hire: 'A deputy the market takes seriously, so the business has a second face.',
  },
  Virgo: {
    sign: 'Virgo',
    name: 'The Operator',
    oneLine: 'Turns chaos into a system that runs without them.',
    builtFor: 'Operationally complex businesses, logistics, agencies, anything with a margin to defend.',
    tease: 'Operators find the 15% of margin everyone else leaves on the table because they will actually read the process end to end. The failure mode is optimising a machine that is pointed in the wrong direction.',
    blindSpot: 'You refine what should be replaced. Precision on the wrong problem reads as productivity for months.',
    decisionStyle: 'Set the decision deadline before you start the analysis. Without it, diligence expands to fill the quarter.',
    hire: 'Someone whose only job is direction, so your rigour has a correct target.',
  },
  Libra: {
    sign: 'Libra',
    name: 'The Dealmaker',
    oneLine: 'Gets terms other people cannot, without leaving damage behind.',
    builtFor: 'Partnerships, enterprise sales, M&A, and two-sided negotiations.',
    tease: 'Dealmakers close rooms of two better than any other archetype and are usually the reason the partnership existed at all. The cost is a tendency to buy agreement with concessions that only show up in the second year of the contract.',
    blindSpot: 'You optimise for the relationship surviving the negotiation. Sometimes the correct outcome is no deal and a clean no.',
    decisionStyle: 'Write your walk-away number before the conversation, and give it to someone else to hold you to.',
    hire: 'A hard second who reviews terms and is rewarded for saying no.',
  },
  Scorpio: {
    sign: 'Scorpio',
    name: 'The Strategist',
    oneLine: 'Plays several moves out and says less than they know.',
    builtFor: 'Competitive markets, turnarounds, and anything where information asymmetry pays.',
    tease: 'Strategists see the board a move or two before the room and are rarely surprised by a competitor. The trade is that the same instinct for holding information back slows your own team, who are guessing at a plan you have already made.',
    blindSpot: 'You withhold context you think is obvious. Your team is not underperforming; they are under-briefed.',
    decisionStyle: 'Decide privately, then over-explain publicly. The second half is the part you skip.',
    hire: 'A communicator who translates your thinking to the company without diluting it.',
  },
  Sagittarius: {
    sign: 'Sagittarius',
    name: 'The Explorer',
    oneLine: 'Finds the market nobody was looking at yet.',
    builtFor: 'New geographies, emerging categories, and first-mover plays.',
    tease: 'Explorers are early to markets that look absurd for eighteen months and obvious afterwards. The exposure is being three markets in before any one of them has a repeatable sales motion.',
    blindSpot: 'You mistake a new opportunity for a better one. The next market is more exciting than the one that is nearly working.',
    decisionStyle: 'Cap yourself at one new bet per quarter, in writing. The constraint is what converts curiosity into a company.',
    hire: 'A closer who goes deep on the market you already opened.',
  },
  Capricorn: {
    sign: 'Capricorn',
    name: 'The Architect',
    oneLine: 'Builds structures designed to outlast the founder.',
    builtFor: 'Institutions, infrastructure, regulated markets, and anything with a ten-year horizon.',
    tease: 'Architects build the thing that is still standing when the market cycles, because they were never optimising for this quarter. The cost is that the standard you hold delays the first version by months you cannot get back.',
    blindSpot: 'You will not ship until the whole system exists. Meanwhile a worse product is compounding customers.',
    decisionStyle: 'Ship at 70% and let the market finish the spec. Your instinct will call this irresponsible; do it anyway.',
    hire: 'Someone impatient enough to push things out of the building.',
  },
  Aquarius: {
    sign: 'Aquarius',
    name: 'The Contrarian',
    oneLine: 'Sees the model everyone else has agreed not to question.',
    builtFor: 'Disruption plays, novel pricing, and businesses that need a structural rethink.',
    tease: 'Contrarians find the assumption a whole category is resting on and price against it, which is where outsized returns actually come from. The risk is being right about the model and wrong about whether anyone wants it yet.',
    blindSpot: 'You resist the obvious move because it is obvious. Sometimes the boring channel is the one that works.',
    decisionStyle: 'Test the conventional version first and let it fail on evidence. It usually costs a week and saves a year.',
    hire: 'A pragmatist who runs the standard playbook while you build the different one.',
  },
  Pisces: {
    sign: 'Pisces',
    name: 'The Visionary',
    oneLine: 'Sells a future the current product has not earned yet, then builds into it.',
    builtFor: 'Brand, creative businesses, and category narratives that pull talent and capital.',
    tease: 'Visionaries attract people and money to a story that is genuinely bigger than the balance sheet, which is how most large companies actually started. The exposure is a gap between the narrative and the numbers that widens quietly until someone audits it.',
    blindSpot: 'You avoid the spreadsheet that would make the story harder to tell. The gap does not close by itself.',
    decisionStyle: 'Put one hard number on every vision before you repeat it publicly. The number keeps the story honest.',
    hire: 'A finance-minded operator with standing to challenge the narrative.',
  },
};

export const ARCHETYPE_LIST = Object.values(ARCHETYPES);
