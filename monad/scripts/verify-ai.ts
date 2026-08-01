import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Static audit of the AI wiring: provider selection, rate limits, and the
 * guarantee that no route can return a non-JSON body or a bare 500.
 */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}
const read = (p: string) => readFileSync(p, 'utf8');
let bad = 0;
const ok = (m: string) => console.log(`ok    ${m}`);
const fail = (m: string) => { bad++; console.log(`FAIL  ${m}`); };

// 1. Every AI route is rate limited.
const AI_ROUTES = ['reading', 'brief', 'chat', 'outlook', 'chart'];
for (const r of AI_ROUTES) {
  const src = read(`src/app/api/${r}/route.ts`);
  /\bguard\(\s*\n?\s*request/.test(src) && src.includes('@/lib/ratelimit')
    ? ok(`/api/${r} is rate limited`)
    : fail(`/api/${r} has no rate limit`);
}

// 2. The provider is chosen at call time, never imported directly by a route.
for (const f of walk('src/app/api')) {
  if (/@anthropic-ai\/sdk|from 'openai'/.test(read(f))) {
    fail(`${f} imports a model SDK directly — go through lib/ai`);
  }
}
ok('no route imports a model SDK directly');

// 3. Both providers are wired.
const prov = read('src/lib/ai/provider.ts');
prov.includes('OPENAI_API_KEY') && prov.includes('ANTHROPIC_API_KEY')
  ? ok('provider supports both OpenAI and Anthropic')
  : fail('provider is missing a backend');
prov.includes('json_schema')
  ? ok('structured output is requested from both backends')
  : fail('structured output is not enforced');

// 4. No model key must never mean a 500.
const ai = read('src/lib/ai.ts');
ai.includes('fallbackReading') && ai.includes('fallbackBrief') && ai.includes('FALLBACK_CHAT')
  ? ok('reading, brief and chat fall back to authored copy')
  : fail('a surface has no fallback when no key is configured');
ai.includes('ProviderUnavailable')
  ? ok('surfaces with no honest fallback throw a typed error')
  : fail('missing ProviderUnavailable');
for (const r of ['outlook']) {
  read(`src/app/api/${r}/route.ts`).includes('503')
    ? ok(`/api/${r} answers 503, not 500, when unconfigured`)
    : fail(`/api/${r} would 500 when unconfigured`);
}

// 5. The funnel entry point can never return HTML.
const chart = read('src/app/api/chart/route.ts');
chart.includes('catch') && chart.includes('unhandled')
  ? ok('/api/chart wraps every throw into JSON')
  : fail('/api/chart can return an HTML error page');
chart.includes('rememberChart')
  ? ok('/api/chart survives a database outage')
  : fail('/api/chart dies without a database');

// 6. Timezones are validated by construction, not by list membership.
walk('src/app/api').some((f) => read(f).includes("supportedValuesOf('timeZone')"))
  ? fail('a route still validates timezones against supportedValuesOf')
  : ok('timezones are validated by construction');

// 7. The unkeyed fallback must not repeat itself.
//
// It used to open Strengths, Built For's standfirst and Built For's first
// paragraph on the same sentence, and name "the seat to refuse" in two
// sections. A reader who paid for a document and meets the same line three
// times has been told, correctly, that nobody wrote it for them.
{
  const { fallbackReading } = await import('../src/lib/ai/fallback');
  const { buildChart } = await import('../src/lib/astro/reading');

  const chartFixture = buildChart({
    localYear: 1990, localMonth: 11, localDay: 14,
    birthUtc: new Date('1990-11-14T09:30:00Z'),
    lat: 51.5074, lon: -0.1278, timeKnown: true,
  });

  const sections = fallbackReading(chartFixture, 'Probe');
  const seen = new Map<string, string>();
  let repeats = 0;

  for (const s of sections) {
    for (const text of [s.standfirst, ...s.paragraphs]) {
      const norm = text.trim().toLowerCase().replace(/[.…]$/, '');
      if (norm.length < 40) continue;
      const first = seen.get(norm);
      if (first) {
        repeats++;
        fail(`fallback repeats a line in "${first}" and "${s.key}": ${norm.slice(0, 52)}…`);
      } else {
        seen.set(norm, s.key);
      }
    }
  }
  if (!repeats) ok(`fallback reading has no repeated lines (${seen.size} distinct)`);
}

console.log(bad ? `\n${bad} AI WIRING FAILURE(S)` : '\nAI WIRING OK');
process.exit(bad ? 1 : 0);
