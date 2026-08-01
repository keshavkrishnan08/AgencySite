/**
 * The reading's fixed spine, in its own module so client components can import
 * the labels without pulling the Anthropic SDK into the browser bundle.
 *
 * `label` is the chip the reader taps. The `title` the model writes is a punchy
 * headline for this specific chart, which is what makes a section feel authored
 * rather than templated.
 */
export const SECTIONS = [
  ['archetype', 'Who You Are', 'Who you are as an operator, from the Sun, the archetype, and the chart weighting.'],
  ['decisions', 'How Your Mind Works', 'The decision process this chart actually supports, and the failure mode under pressure.'],
  ['strengths', 'Strengths', 'The three things you do better than the people you compare yourself to.'],
  ['blindspots', 'Blind Spot', 'Where you consistently undercut yourself. Be direct; this is the section people forward.'],
  ['communication', 'Communication With Others', 'How you land on other people versus how you think you land, and the one adjustment that changes the most.'],
  ['business', 'Built For', 'Models, sectors and structures that fit this wiring — and the ones that drain it.'],
  ['timing', 'Your Timing', 'How you should sequence launches, asks, hiring and rest. Cadence, not prediction.'],
] as const;

/** The chip labels, in order. Shared with the UI so the two cannot drift. */
export const SECTION_LABELS = SECTIONS.map(([key, label]) => ({ key, label }));

export interface ReadingSection {
  key: string;
  title: string;
  standfirst: string;
  paragraphs: string[];
  /** True when the body was truncated server-side because the reader hasn't paid. */
  locked?: boolean;
}

/** Hard ceiling on a teaser, whatever the source length. */
const TEASER_CHARS = 90;

/**
 * The opening fragment of a paid string, for rendering blurred.
 *
 * Exported because every blurred string has the same problem: whatever the
 * browser receives is readable, blur or no blur.
 *
 * The cap is *also* proportional. A fixed ceiling alone looked fine against
 * 400-character test paragraphs and did nothing at all to the real ones, which
 * average nearer ninety — the fix truncated a paragraph to its own full length
 * and reported success. Half, capped at ninety, holds for both.
 */
export function teaser(text: string): string {
  const limit = Math.min(TEASER_CHARS, Math.floor(text.length / 2));
  if (text.length <= limit) return text;

  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Strips paid copy out of the payload before it reaches the browser.
 *
 * A CSS blur is a conversion device, not a boundary: the full text was sitting
 * in the HTML of every unpaid page view, readable from view-source. Sections
 * past `freeCount` now leave the server as a single truncated paragraph, so the
 * blur has nothing behind it worth extracting. The title and standfirst stay —
 * they are the part that has to stay legible to sell the section.
 */
export function redactSections(
  sections: ReadingSection[] | null,
  freeCount: number,
): ReadingSection[] | null {
  if (!sections) return null;
  return sections.map((section, i) =>
    i < freeCount
      ? section
      : {
          ...section,
          paragraphs: section.paragraphs.length ? [teaser(section.paragraphs[0])] : [],
          locked: true,
        },
  );
}
