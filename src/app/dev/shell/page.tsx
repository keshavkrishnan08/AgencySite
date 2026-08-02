'use client';

import { notFound, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AppShell } from '@/components/app/AppShell';
import { ChartView } from '@/components/app/ChartView';
import { UpdatesView } from '@/components/app/UpdatesView';
import { SIGN_GLYPH } from '@/lib/astro/zodiac';

/**
 * Dev-only visual check for the three-column shell. 404s in production.
 *
 * The real pages need a signed-in Supabase session and a generated reading,
 * which makes them impossible to eyeball locally. This renders the same
 * components against fixtures so layout regressions are caught without one.
 *
 * ?paid=1 shows the subscribed state, ?view=updates shows the other page.
 */
export default function DevShell() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <Suspense fallback={null}>
      <DevShellInner />
    </Suspense>
  );
}

function DevShellInner() {
  const params = useSearchParams();
  const paid = params.get('paid') === '1';
  const view = params.get('view') ?? 'chart';

  return (
    <AppShell
      firstName="Keshav"
      isPaid={paid}
      authed={false}
      briefingTeaser="Mars is tightening a square to your Mercury and the Moon is waxing in Libra. What that means for the call you have been putting off is"
      suggestions={[
        'Is my current business actually a fit for my chart?',
        'What should I focus on today, given my timing?',
        'What does my chart say about taking on a co-founder?',
      ]}
      transitPrompt="The Moon is in Libra today. Ask what that makes today good for."
      chartId="dev"
    >
      {view === 'updates' ? (
        <UpdatesView
          firstName="Keshav"
          archetype="The Strategist"
          cadence="daily"
          entry={{
            date: new Date().toISOString().slice(0, 10),
            headline: 'Say the number first today.',
            body: 'Mercury is applying to your Midheaven at three degrees, which is the contact that makes you sound more certain than you feel. Use it on the conversation where the price is the whole negotiation. The same contact makes you over-explain, so stop talking after the number.',
            action: 'Send the proposal before 2pm with the price in the first line, not the last.',
          }}
          prevDate="2026-07-30"
          nextDate={null}
          emailOptIn={false}
          decisions={[
            { id: '1', decided_on: '2026-07-30', body: 'Held the price. Told them Friday or we walk.' },
            { id: '2', decided_on: '2026-07-29', body: 'Passed on the agency retainer. Wrong shape.' },
          ]}
          streak={4}
          logged={11}
        />
      ) : (
        <ChartView
          chartId="dev"
          firstName="Keshav"
          archetype="The Strategist"
          oneLine="Plays several moves out and says less than they know."
          code="D-2"
          glyph={SIGN_GLYPH.Scorpio}
          placements={[
            `${SIGN_GLYPH.Scorpio} Scorpio Sun`,
            `${SIGN_GLYPH.Capricorn} Capricorn Moon`,
            `${SIGN_GLYPH.Leo} Leo Rising`,
            'Life path 8',
            'Earth Snake',
          ]}
          systems={[
            {
              eyebrow: 'Astrology',
              title: 'Scorpio',
              body: 'Strategists see the leverage in a situation before anyone has named it, and are comfortable holding that read privately for months. The cost is that the business ends up structured around information only you have.',
            },
            {
              eyebrow: 'Life path',
              title: '8 · The Executive',
              body: 'Reads leverage and capital instinctively. Comfortable with scale. You optimise the number and lose the people who produce it.',
            },
            {
              eyebrow: 'Chinese new year',
              title: 'Earth Snake',
              body: 'Plays several moves out and says less than they know. Pairs with Ox and Rooster; friction with Pig.',
            },
          ]}
          sections={[
            {
              key: 'archetype',
              title: 'Build The Room, Move The Market',
              standfirst: 'You are built to see the whole board, and to say almost none of it out loud.',
              paragraphs: [
                'Your Sun sits at 14° Scorpio in the fourth house, which puts your centre of gravity behind the scenes rather than in front of the room. You do your best thinking where nobody is watching and then arrive with a position already formed.',
                'The Capricorn Moon means the feeling and the plan arrive together. You rarely have an emotional reaction that has not already been converted into a decision by the time you notice it.',
                'This is why you are hard to negotiate against and easy to underestimate. Both of those are advantages until the day you need someone to back a plan you never explained.',
              ],
            },
            {
              key: 'decisions',
              title: 'Decide First, Explain Later',
              standfirst: 'You decide early and then spend weeks looking for the reason to say it.',
              paragraphs: ['Placeholder body for the paid state.'],
            },
          ]}
          roles={['Founder, defensible tech', 'Head of Strategy', 'Head of Product', 'Investor']}
          avoid="A high-transparency seat where you have to think out loud, live, daily."
          builtFor="Defensible positions, information advantages, and anything where the second-order effects decide the winner."
          rot="Inside a plan you have not told anyone. It is right, it is unfunded, and it stays a plan."
          timing={[
            {
              span: 'Today',
              headline: 'A friction day — use it on the hard conversation',
              line: 'Mercury is tightening into a square to your Midheaven — orb 1.4°. The Moon is waning gibbous in Pisces.',
              tail: 'Say the number first and stop talking after it. The contact makes you sound more certain than you feel, which is exactly what the price conversation needs.',
            },
            {
              span: 'This week',
              headline: 'Your Scorpio Sun wants reach, but this week asks for proof first',
              line: 'Venus is separating from a trine to your Venus — orb 2.1°. The back half carries the ask better than the front.',
              tail: 'Build one clean asset that turns attention into structure: a pitch, an offer page, or a partnership memo. Then let it be seen.',
            },
            {
              span: 'This month',
              headline: 'This month asks you to separate visibility from ego',
              line: 'Saturn is tightening into a conjunction to your Sun — orb 0.8°. One structural decision beats four tactical ones.',
              tail: 'The launch window favours announcements, demos and putting your name on the work. Package the proof cleanly, then let it carry itself.',
            },
          ]}
          blockers={[
            {
              title: 'You research past the point of decision',
              evidence: 'Mercury square Saturn, orb 1.8° — applying.',
              costs: 'Diligence becomes the delay. The window you were analysing closes while you are still building confidence you were never going to reach analytically.',
              fix: 'Cap the research with a date, not a feeling. Decide on the date with whatever you have.',
              severity: 2.1,
            },
            {
              title: 'You hold control past the point it helps',
              evidence: 'Sun conjunction Pluto, orb 3.2° — separating.',
              costs: 'The business cannot grow beyond your personal bandwidth because the decisions that matter still route through you.',
              fix: 'Hand over one decision class entirely and let it be made worse than you would make it for one quarter.',
              severity: 1.4,
            },
          ]}
          chapter={{
            name: 'The Proving Ground',
            progress: 0.38,
            yearsIn: 3.8,
            span: 'age 37 to 44',
            what: 'What you built is being tested against reality rather than intention. This is the stretch where the flaw in the model surfaces — not as a crisis, as a slow leak you keep patching.',
            ends: 'It ends when you stop defending the original plan and fix the actual leak.',
          }}
          pressure="Capricorn"
          shareUrl="http://localhost/r/dev"
        />
      )}
    </AppShell>
  );
}
