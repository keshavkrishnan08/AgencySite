import { redirect } from 'next/navigation';
import { Diagnosis } from '@/components/app/Diagnosis';
import { getEntitlement } from '@/lib/entitlement';
import { resolveChart } from '@/lib/charts';
import { currentChapter, findBlockers, pressurePoint } from '@/lib/astro/blockers';
import { teaser } from '@/lib/sections';

export const metadata = { title: "Why You're Stuck" };

/**
 * The diagnosis, on its own route.
 *
 * It sits apart from My Chart because it answers a different question: that
 * page describes how you are built, this one names what it costs you. Folding
 * it into the reading buried the single strongest reason anyone subscribes.
 */
export default async function StuckPage() {
  const ent = await getEntitlement();
  const chart = await resolveChart(ent.userId);
  if (!chart) redirect('/start');

  const chapter = currentChapter(new Date(chart.birth_utc));

  // Pattern one is the free sample; the rest are the product. They leave the
  // server as teasers so the blur has nothing extractable behind it.
  const blockers = findBlockers(chart.chart).map((b, i) =>
    ent.isPaid || i === 0
      ? b
      : { ...b, costs: teaser(b.costs), fix: teaser(b.fix) },
  );

  return (
    <div className="mx-auto max-w-[820px] pb-8">
      <Diagnosis
        blockers={blockers}
        chapter={ent.isPaid ? chapter : { ...chapter, ends: teaser(chapter.ends) }}
        pressure={pressurePoint(chart.chart)}
      />
    </div>
  );
}
