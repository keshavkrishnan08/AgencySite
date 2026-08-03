import { NextResponse } from 'next/server';
import { guard } from '@/lib/ratelimit';
import { getChartPublic } from '@/lib/charts';
import { supabaseAdmin } from '@/lib/supabase/server';
import { provider } from '@/lib/ai/provider';
import { chartBrief, type Chart } from '@/lib/astro/reading';

export const runtime = 'nodejs';
export const maxDuration = 60;

const INSIGHT_TYPES: Record<string, { system: string; prompt: (chart: Chart, name: string) => string }> = {
  unusual: {
    system: 'You write a short, specific insight about a birth chart for an astrology-for-business product. Three paragraphs, each two sentences. Sound like an advisor who just noticed something in the data. Never predict events. Never use "energy", "vibration", "manifest", or "universe". Reference specific placements by name and degree.',
    prompt: (chart, name) => `Write an insight about what is unusual in ${name}'s chart. Focus on the tension between their ${chart.sunSign} Sun and ${chart.moonSign} Moon, and what it means for how they operate in business.\n\n${chartBrief(chart, name)}`,
  },
  blindspot: {
    system: 'You write a short, diagnostic insight about a birth chart blind spot for an astrology-for-business product. Three paragraphs, each two sentences. Be direct and specific — name the pattern, name what it costs. Never predict events.',
    prompt: (chart, name) => `Write about the blind spot in ${name}'s chart — the repeating pattern that costs them. Ground it in specific placements.\n\n${chartBrief(chart, name)}`,
  },
  timing: {
    system: 'You write a short timing insight from a birth chart for an astrology-for-business product. Three paragraphs, each two sentences. Describe what kind of month this is for them based on their natal chart. Never predict specific events or outcomes.',
    prompt: (chart, name) => `Write about ${name}'s timing right now — what kind of period this is for someone with their chart, and what type of move it favours.\n\n${chartBrief(chart, name)}`,
  },
  decision: {
    system: 'You write a short insight about decision-making style from a birth chart for an astrology-for-business product. Three paragraphs, each two sentences. Name the specific pattern under pressure.',
    prompt: (chart, name) => `Write about how ${name} makes decisions based on their chart — their default mode and the specific failure pattern under pressure.\n\n${chartBrief(chart, name)}`,
  },
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const chartId = url.searchParams.get('chart');
  const token = url.searchParams.get('token');
  const type = url.searchParams.get('type') ?? 'unusual';

  if (!chartId || !token) {
    return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
  }

  const limited = guard(request, 'reading', null, 'Too many requests.');
  if (limited) return limited;

  const chart = await getChartPublic(chartId);
  if (!chart || chart.access_token !== token) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const insightType = INSIGHT_TYPES[type] ?? INSIGHT_TYPES.unusual;

  // Check cache first
  const admin = supabaseAdmin();
  const cacheKey = `insight_${type}`;
  const { data: existing } = await admin
    .from('email_events')
    .select('kind')
    .eq('chart_id', chartId)
    .eq('kind', cacheKey)
    .maybeSingle();

  // Generate with cheap model
  const p = provider();
  if (!p) {
    return NextResponse.json({ error: 'AI not configured.' }, { status: 503 });
  }

  const content = await p.generate<string>({
    maxTokens: 600,
    effort: 'low',
    system: insightType.system,
    user: insightType.prompt(chart.chart, chart.first_name),
  });

  // Split into paragraphs — first ~25% is free, rest is locked
  const paragraphs = content.split('\n').filter((p) => p.trim().length > 0);

  return NextResponse.json({
    firstName: chart.first_name,
    archetype: chart.chart.archetype.name,
    sunSign: chart.chart.sunSign,
    type,
    paragraphs,
  });
}
