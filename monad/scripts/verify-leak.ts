import { redactSections, teaser, type ReadingSection } from '../src/lib/sections';

/**
 * The paywall must be a boundary, not a blur.
 *
 * The full reading used to ship inside the HTML of every unpaid page view:
 * `filter: blur(5px)` hides it from a reader, not from view-source, reader
 * mode, or a disabled stylesheet. These gates assert that paid copy is removed
 * on the server, and — separately — that a live unpaid page does not contain it.
 *
 * Run with BASE set to exercise the HTTP half:
 *   BASE=http://localhost:3000 npx tsx scripts/verify-leak.ts
 */
const BASE = process.env.BASE ?? '';
let bad = 0;

function check(name: string, pass: boolean, detail = '') {
  if (!pass) bad++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(56)} ${detail}`);
}

/* ------------------------------------------------------- unit: redaction */

// Deliberately the length real sections actually are. A 400-character sample
// passed this suite while the truncation was doing nothing to production copy.
const LONG = `${'word '.repeat(17)}end.`;
const sample: ReadingSection[] = [
  { key: 'archetype', title: 'One', standfirst: 's', paragraphs: [LONG, LONG, LONG] },
  { key: 'decisions', title: 'Two', standfirst: 's', paragraphs: [LONG, LONG, LONG] },
  { key: 'strengths', title: 'Three', standfirst: 's', paragraphs: [LONG, LONG, LONG] },
];

const free = redactSections(sample, 1)!;

check('the free section survives intact', free[0].paragraphs.length === 3 && free[0].paragraphs[0] === LONG);
check('locked sections collapse to one paragraph', free.slice(1).every((s) => s.paragraphs.length === 1));
check('locked sections are flagged for the UI', free.slice(1).every((s) => s.locked === true));
check('the free section is not flagged locked', !free[0].locked);

const leakedChars = free.slice(1).reduce((n, s) => n + s.paragraphs.join('').length, 0);
const originalChars = sample.slice(1).reduce((n, s) => n + s.paragraphs.join('').length, 0);
check(
  'locked copy is cut by at least 80%',
  leakedChars < originalChars * 0.2,
  `${leakedChars}/${originalChars} chars`,
);

check('titles survive — they have to sell the section', free.slice(1).every((s) => s.title.length > 0));
check('a paid reader is redacted at no index', redactSections(sample, sample.length)!.every((s) => !s.locked));
check('an empty reading stays null rather than throwing', redactSections(null, 1) === null);
check('a section with no paragraphs does not crash', redactSections([{ key: 'k', title: 't', standfirst: 's', paragraphs: [] }], 0)![0].paragraphs.length === 0);
check('teaser cuts on a word boundary', !teaser('word '.repeat(60)).slice(0, -1).endsWith('wor'));
check('teaser halves a short line too', teaser('Short line of copy here.').length < 'Short line of copy here.'.length);
check('teaser caps long text at the ceiling', teaser('x'.repeat(4000)).length <= 91);

/* --------------------------------------------------- live: unpaid HTML */

if (!BASE) {
  console.log('\nskip  HTTP gates (set BASE to run them)');
} else {
  const birth = {
    year: 1990, month: 11, day: 14, hour: 9, minute: 30, timeKnown: true,
    firstName: 'Leak', email: `leak-${Date.now()}@example.com`,
    place: { label: 'London, England, United Kingdom', lat: 51.5074, lon: -0.1278, timezone: 'Europe/London' },
  };

  const created = await fetch(`${BASE}/api/chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(birth),
  }).then((r) => r.json());

  const id: string = created.id;
  check('a chart can be created anonymously', Boolean(id), id ?? JSON.stringify(created).slice(0, 80));

  if (id) {
    const reading = await fetch(`${BASE}/api/reading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chartId: id }),
    }).then((r) => r.json());

    const sections: ReadingSection[] = reading.sections ?? [];
    check('the reading generates', sections.length > 0, `${sections.length} sections`);

    const html = await fetch(`${BASE}/r/${id}`).then((r) => r.text());
    // Next escapes copy into the flight payload; normalise before searching.
    const flat = html.replace(/\\"/g, '"').replace(/\\u0026/g, '&').replace(/\\n/g, ' ');

    // Sections 0 and 1 are the free sample on /r/:id; everything after is paid.
    //
    // Probe the TAIL, never the opening: a teaser legitimately contains the
    // first words of paragraph one, so a head probe passes against a paywall
    // that is leaking everything. The end of the last paragraph is the part
    // that must be absent.
    // Match whole paragraphs, not fragments. Short fragments legitimately
    // recur in free copy — a life-path line appears both in Strengths and in
    // the free systems card — and a fragment probe reports those as leaks.
    // A complete paid paragraph appearing verbatim is unambiguous.
    for (const s of sections.slice(2)) {
      const dropped = s.paragraphs.slice(1);
      const present = dropped.filter((p) => flat.includes(p));
      check(
        `/r/:id withholds the body of "${s.key}"`,
        present.length === 0,
        present.length ? `${present.length}/${dropped.length} paragraphs still in the HTML` : `${dropped.length} dropped`,
      );
    }
    for (const s of sections.slice(0, 2)) {
      const present = s.paragraphs.filter((p) => flat.includes(p));
      check(
        `/r/:id still serves the free section "${s.key}"`,
        present.length === s.paragraphs.length,
        `${present.length}/${s.paragraphs.length} paragraphs`,
      );
    }
  }
}

console.log(bad ? `\n${bad} leak(s) — paid copy is reaching unpaid browsers` : '\nPAYWALL IS A BOUNDARY, NOT A BLUR');
process.exit(bad ? 1 : 0);
