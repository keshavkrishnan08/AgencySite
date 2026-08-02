import { redirect } from 'next/navigation';
import { ChartView, type SystemCard, type TimingRow } from '@/components/app/ChartView';
import { getEntitlement } from '@/lib/entitlement';
import { resolveChart } from '@/lib/charts';
import { supabaseAdminOrNull } from '@/lib/supabase/server';
import { cached } from '@/lib/db';
import { recallSections } from '@/lib/charts-ephemeral';
import { describeHit, transitReport } from '@/lib/astro/transits';
import { SIGN_GLYPH, type Sign } from '@/lib/astro/zodiac';
import { LIFE_PATHS } from '@/lib/astro/numerology';
import { ANIMAL_CONTENT } from '@/lib/astro/chinese';
import { ROLES } from '@/lib/astro/roles';
import { chartCode } from '@/lib/code';
import { currentChapter, findBlockers, pressurePoint } from '@/lib/astro/blockers';
import { BRAND } from '@/lib/brand';
import { redactSections, teaser, type ReadingSection } from '@/lib/sections';

export const metadata = { title: 'My Chart' };

/** A headline for today, named after what the Moon is actually doing. */
function moonHeadline(r: ReturnType<typeof transitReport>): string {
  if (!r.hits.length) return 'A day for the work that needs no momentum';
  const t = r.hits[0].type.toLowerCase();
  if (t === 'square' || t === 'opposition') return 'A friction day — use it on the hard conversation';
  if (t === 'trine' || t === 'sextile') return 'An open day — spend it on the ask';
  return 'A foundation day — close loops, restore the ground';
}

export default async function MyChartPage() {
  const ent = await getEntitlement();
  const chart = await resolveChart(ent.userId);
  if (!chart) redirect('/start');

  const c = chart.chart;
  const sun = c.natal.sun.sign as Sign;
  const lp = LIFE_PATHS[c.lifePath];
  const animal = ANIMAL_CONTENT[c.chinese.animal];
  const fit = ROLES[sun];

  // Check the ephemeral store first, exactly as /r/[id] does. Without this a
  // reading generated while the database was unreachable is invisible here and
  // the page sits on "still being written" forever.
  let sections = recallSections(chart.id);
  if (!sections) {
    const { data: reading } = await cached<{ sections: unknown }>(() =>
      supabaseAdminOrNull()
        ?.from('readings')
        .select('sections')
        .eq('chart_id', chart.id)
        .maybeSingle() ?? Promise.resolve({ data: null }),
    );
    sections = (reading?.sections ?? null) as ReadingSection[] | null;
  }

  // Tab one is free, so only tab one leaves the server intact. Without this the
  // whole reading ships in the HTML and the blur is decorative.
  sections = redactSections(sections, ent.isPaid ? sections?.length ?? 0 : 1);

  const placements = [
    `${SIGN_GLYPH[sun]} ${c.sunSign} Sun`,
    `${SIGN_GLYPH[c.natal.moon.sign as Sign]} ${c.moonSign} Moon`,
    ...(c.risingSign ? [`${SIGN_GLYPH[c.risingSign as Sign]} ${c.risingSign} Rising`] : []),
    `Life path ${c.lifePath}`,
    c.chinese.label,
  ];

  // Headings mirror the reference: the system's own name, nothing else. The
  // interpretation lives in the body, which is where it belongs.
  const systems: SystemCard[] = [
    {
      eyebrow: 'Astrology',
      title: c.sunSign,
      body: `${c.archetype.name}. ${c.archetype.tease}`,
    },
    {
      eyebrow: 'Life path',
      title: `${c.lifePath} · ${lp.title}`,
      body: `${lp.drive} ${lp.underPressure}`,
    },
    {
      eyebrow: 'Chinese new year',
      title: c.chinese.label,
      body: `${animal.title}. ${animal.operating} Pairs with ${animal.pairsWith.join(' and ')}; friction with ${animal.clashesWith}.`,
    },
  ];

  // Real windows from real contacts. The unpaid user sees today; the rest blur.
  const report = transitReport(c, new Date());
  const week = transitReport(c, new Date(Date.now() + 3 * 86_400_000));
  const month = transitReport(c, new Date(Date.now() + 15 * 86_400_000));

  // Each horizon gets a headline, a visible sentence and a tail. The tail is
  // what blurs behind the paywall on every horizon but today.
  const horizon = (
    r: ReturnType<typeof transitReport>,
    headline: string,
    visible: string,
    tail: string,
  ): TimingRow => ({
    span: 'Today',
    headline,
    line: r.hits.length
      ? `${describeHit(r.hits[0])} — orb ${r.hits[0].orb}°. ${visible}`
      : visible,
    tail,
  });

  const timing: TimingRow[] = [
    {
      span: 'Today',
      headline: moonHeadline(report),
      line: `The Moon is in ${report.moonSign}, in a ${report.moonPhase} phase, activating the part of your chart that governs foundations and the private base your work stands on. ${
        report.hits.length ? `${describeHit(report.hits[0])} at ${report.hits[0].orb}°.` : 'Nothing is making an exact contact.'
      } For a ${c.risingSign ?? c.sunSign} chart with a ${c.sunSign} Sun, this is not a day to chase more noise. It is a day to clean the container, close loops, and restore the ground under your ambition.`,
      tail: `${
        report.retrogrades.length
          ? `${report.retrogrades.join(' and ')} ${report.retrogrades.length > 1 ? 'are' : 'is'} retrograde, so the real work is internal structure, not public proof.`
          : 'No planet is retrograde, so what you commit to today is likely to hold its shape.'
      } Work on the systems behind the work, not the performance of the work. Different: it means the thing you have been meaning to fix quietly is the highest-leverage hour you have available. Your life path ${c.lifePath} pulls you toward visible output; today that pull is the thing to resist.`,
    },
    {
      span: 'This week',
      headline: `Your ${c.sunSign} Sun and Life Path ${c.lifePath} want reach, but this week asks for proof before noise`,
      line: `${
        week.hits.length ? `${describeHit(week.hits[0])} at ${week.hits[0].orb}°.` : 'The week runs quiet against your chart.'
      } The front half is best for quiet work: pricing, terms, edits, and operational cleanup. Build one clean asset that turns attention into structure — a pitch, an offer page, a script, or a partnership memo.`,
      tail: `The back half is better for outward moves: outreach, community touchpoints, and testing the message in public. Your ${c.moonSign} Moon can mistake momentum for progress here, so hold the exit rule you set on Monday. If you only do one thing, make it the asset — a week spent talking about the work leaves you where you started, and a week spent building the proof leaves you with something that keeps arguing for you after you stop.`,
    },
    {
      span: 'This month',
      headline: 'This month asks you to separate visibility from ego',
      line: `${
        month.hits.length ? `${describeHit(month.hits[0])} at ${month.hits[0].orb}°.` : 'No slow contact dominates the month.'
      } The launch window favours announcements, demos, publishing, and putting your name on the work. Your ${c.sunSign} core, life path ${c.lifePath}, and ${c.chinese.label} pattern all point to the same assignment: build proof, package it cleanly, then let the work be seen without overexplaining it.`,
      tail: `The friction is perfectionism — you go one more round refining what already has enough structure to ship. The second half of the month is the sell window: choose one clear campaign, one offer, one message, and repeat it until it lands rather than replacing it the moment it stops feeling novel to you. What you decide structurally this month will still be paying out, or still costing you, in six.`,
    },
  ];

  // Server-side redaction: nothing paid reaches the browser in full.
  // A CSS blur is a conversion device, not a boundary — the text behind it
  // must be truncated server-side or it is readable from view-source.
  // Every horizon's tail (the advice) is paywalled. Today's line (the
  // observation) stays free — it proves the data is real and personal.
  const gatedTiming = timing.map((row, i) =>
    ent.isPaid
      ? row
      : i === 0
        ? { ...row, tail: teaser(row.tail) }
        : { ...row, line: teaser(row.line), tail: teaser(row.tail) },
  );

  const gatedSystems = systems.map((s, i) =>
    ent.isPaid || i === 0 ? s : { ...s, body: teaser(s.body) },
  );

  return (
    <ChartView
      chartId={chart.id}
      firstName={chart.first_name}
      archetype={c.archetype.name}
      oneLine={c.archetype.oneLine}
      code={chartCode(sun)}
      glyph={SIGN_GLYPH[sun]}
      placements={placements}
      systems={gatedSystems}
      sections={sections}
      roles={ent.isPaid ? fit.fits : fit.fits.slice(0, 2)}
      avoid={ent.isPaid ? fit.avoid : teaser(fit.avoid)}
      builtFor={ent.isPaid ? c.archetype.builtFor : teaser(c.archetype.builtFor)}
      rot={ent.isPaid ? fit.rot : teaser(fit.rot)}
      timing={gatedTiming}
      blockers={findBlockers(c)}
      chapter={currentChapter(new Date(chart.birth_utc))}
      pressure={pressurePoint(c)}
      shareUrl={`${BRAND.domain}/r/${chart.id}`}
    />
  );
}
