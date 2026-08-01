import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer, Glyph, Wordmark } from '@/components/Chrome';
import { Paywall } from '@/components/Paywall';
import { ReadingBody } from '@/components/ReadingBody';
import { getChart } from '@/lib/charts';
import { getEntitlement } from '@/lib/entitlement';
import { supabaseAdminOrNull } from '@/lib/supabase/server';
import { recallSections } from '@/lib/charts-ephemeral';
import { ANIMAL_CONTENT } from '@/lib/astro/chinese';
import { LIFE_PATHS } from '@/lib/astro/numerology';
import { SIGN_GLYPH } from '@/lib/astro/zodiac';
import { redactSections } from '@/lib/sections';
import type { ReadingSection } from '@/lib/ai';

export const metadata: Metadata = {
  title: 'Your reading',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** How much of the reading is free. The rest renders blurred under the veil. */
const FREE_SECTIONS = 2;

export default async function ReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chart = await getChart(id);
  if (!chart) notFound();

  const ent = await getEntitlement();
  const c = chart.chart;
  const animal = ANIMAL_CONTENT[c.chinese.animal];
  const lp = LIFE_PATHS[c.lifePath];

  // A cached reading is an optimisation, never a precondition. If the store is
  // unreachable the page still renders and ReadingBody generates on mount.
  let sections: ReadingSection[] | null = recallSections(chart.id);
  if (!sections) {
    try {
      const { data } = await supabaseAdminOrNull()
        ?.from('readings')
        .select('sections')
        .eq('chart_id', chart.id)
        .maybeSingle() ?? { data: null };
      sections = (data?.sections ?? null) as ReadingSection[] | null;
    } catch {
      sections = null;
    }
  }

  return (
    <>
      <header className="border-b rule">
        <div className="mx-auto flex max-w-band items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Glyph size={20} />
            <Wordmark className="text-lg" />
          </Link>
          <Link
            href={ent.isPaid ? '/updates' : '/login'}
            className="font-mono text-[11px] uppercase tracking-nav text-ink/65"
          >
            {ent.isPaid ? 'Dashboard' : 'Log in'}
          </Link>
        </div>
      </header>

      <main>
        {/* ---------------------------------------------- the reveal */}
        <section className="px-5 pb-12 pt-10 text-center sm:pt-14">
          <div className="mx-auto max-w-2xl animate-fade-up">
            <p className="eyebrow">
              {chart.first_name}&rsquo;s chart · {chart.birth_place}
            </p>

            <p className="mt-6 font-mono text-[10.5px] uppercase tracking-eyebrow text-ink/45">
              Your archetype
            </p>
            <h1 className="mt-3 font-serif text-[46px] font-normal leading-[1.02] sm:text-7xl">
              {c.archetype.name}
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-ink/72">
              {c.archetype.oneLine}
            </p>

            {/* The big three — the fastest credibility signal there is. */}
            <dl className="mx-auto mt-9 grid max-w-lg gap-px overflow-hidden rounded-[3px] border sm:grid-cols-3 rule">
              <Datum label="Sun" glyph={SIGN_GLYPH[c.natal.sun.sign]} value={c.natal.sun.label} />
              <Datum label="Moon" glyph={SIGN_GLYPH[c.natal.moon.sign]} value={c.natal.moon.label} />
              <Datum
                label="Rising"
                glyph={c.natal.ascendant ? SIGN_GLYPH[c.natal.ascendant.sign] : '—'}
                value={c.natal.ascendant?.label ?? 'Needs birth time'}
              />
            </dl>

            <div className="mx-auto mt-3 grid max-w-lg gap-px overflow-hidden rounded-[3px] border sm:grid-cols-3 rule">
              <Datum
                label="Midheaven"
                glyph={c.natal.midheaven ? SIGN_GLYPH[c.natal.midheaven.sign] : '—'}
                value={c.natal.midheaven?.label ?? 'Needs birth time'}
              />
              <Datum label="Life path" glyph={String(c.lifePath)} value={lp.title} />
              <Datum label="Chinese" glyph="" value={`${c.chinese.label} · ${animal.title}`} />
            </div>

            <p className="mx-auto mt-9 max-w-measure text-pretty text-[16px] leading-relaxed text-ink/78">
              {c.archetype.tease}
            </p>

            {c.partial && (
              <p className="mx-auto mt-6 max-w-measure rounded-[3px] border border-brass/40 bg-brass/[0.07] px-4 py-3 text-[13px] leading-relaxed text-ink/70">
                Computed without a birth time, so your Rising sign, Midheaven and
                house placements are unavailable — those are the parts that move
                fastest. Everything else here is exact.
              </p>
            )}
          </div>
        </section>

        {/* ------------------------------- reading, part free / part locked */}
        <ReadingBody
          chartId={chart.id}
          sections={redactSections(sections, ent.isPaid ? 99 : FREE_SECTIONS)}
          freeSections={ent.isPaid ? 99 : FREE_SECTIONS}
        />

        {!ent.isPaid && (
          <section className="relative -mt-16 pb-20">
            <Paywall
              chartId={chart.id}
              authed={Boolean(ent.userId)}
              firstName={chart.first_name}
              archetype={c.archetype.name}
            />
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}

function Datum({ label, glyph, value }: { label: string; glyph: string; value: string }) {
  return (
    <div className="bg-paper px-4 py-4">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 font-serif text-[17px] leading-tight">
        {glyph && <span className="mr-1.5 text-brass">{glyph}</span>}
        {value}
      </dd>
    </div>
  );
}
