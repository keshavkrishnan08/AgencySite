import { NextResponse } from 'next/server';
import { guard } from '@/lib/ratelimit';
import { activeModel, generateReading } from '@/lib/ai';
import { getChart } from '@/lib/charts';
import { supabaseAdmin } from '@/lib/supabase/server';
import { recallSections, rememberSections } from '@/lib/charts-ephemeral';
import type { ReadingSection } from '@/lib/sections';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Generates the six-section reading once, then serves it from the database.
 * The free portion is public to whoever holds the chart token; the paywall is
 * applied at render, not here — the reading itself is cheap to store and the
 * user paid for it with their email.
 */
export async function POST(request: Request) {
  // Keyed by IP here, not user: the reading is generated before signup and is
  // the single most expensive call in the product.
  const limited = guard(request, 'reading', null, 'Too many readings from this connection. Try again shortly.');
  if (limited) return limited;

  const { chartId } = await request.json().catch(() => ({ chartId: null }));
  if (typeof chartId !== 'string') {
    return NextResponse.json({ error: 'Missing chart.' }, { status: 400 });
  }

  const chart = await getChart(chartId);
  if (!chart) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  // Cached copy, from the database or from the ephemeral store.
  let cached = recallSections(chart.id);
  if (!cached) {
    try {
      const { data } = await supabaseAdmin()
        .from('readings')
        .select('sections')
        .eq('chart_id', chart.id)
        .maybeSingle();
      cached = (data?.sections ?? null) as ReadingSection[] | null;
    } catch {
      cached = null;
    }
  }
  if (cached) return NextResponse.json({ sections: cached });

  let sections: ReadingSection[];
  try {
    sections = await generateReading(chart.chart, chart.first_name);
  } catch (e) {
    console.error('[reading] generation failed', e);
    return NextResponse.json(
      { error: 'The reading could not be written just now. Try again in a moment.' },
      { status: 503 },
    );
  }

  // Storing is best-effort. A reading the user is already reading must not be
  // withheld because the write failed — it is regenerated next time at worst.
  try {
    // upsert, not insert: two tabs racing the first load would otherwise hit
    // the unique constraint and surface as an error.
    await supabaseAdmin()
      .from('readings')
      .upsert({ chart_id: chart.id, user_id: chart.user_id, sections, model: activeModel() },
              { onConflict: 'chart_id' });
  } catch (e) {
    console.error('[reading] persist failed, serving from memory', e);
    rememberSections(chart.id, sections);
  }

  return NextResponse.json({ sections });
}
