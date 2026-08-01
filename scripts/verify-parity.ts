import { readFileSync } from 'node:fs';

/**
 * The pricing block is a promise. Every feature it advertises must have a
 * surface a paying user can actually reach, and the code behind it.
 *
 * This caught a real gap once: the block sold six features when four existed.
 */
const SURFACES: Record<string, { page: string; api: string }> = {
  'Full Reading':         { page: 'src/app/(app)/chart/page.tsx',       api: 'src/app/api/reading/route.ts' },
  'Why You Are Stuck':    { page: 'src/app/(app)/stuck/page.tsx',       api: 'src/lib/astro/blockers.ts' },
  'Daily Briefings':      { page: 'src/app/(app)/updates/page.tsx',     api: 'src/app/api/brief/route.ts' },
  'Chat With Your Chart': { page: 'src/components/app/AskPanel.tsx',    api: 'src/app/api/chat/route.ts' },
  'Timing & Windows':     { page: 'src/app/(app)/timing/page.tsx',      api: 'src/lib/astro/bestday.ts' },
  'Decision Journal':     { page: 'src/components/app/UpdatesView.tsx', api: 'src/app/api/decisions/route.ts' },
};

const brand = readFileSync('src/lib/brand.ts', 'utf8');
let bad = 0;

// 1. Everything advertised has a surface and an implementation.
const advertised = [...brand.matchAll(/\[\s*'([^']+)',\s*'/g)].map((m) => m[1]);
for (const name of advertised) {
  const s = SURFACES[name];
  if (!s) {
    bad++;
    console.log(`FAIL "${name}" is advertised but has no mapped surface`);
    continue;
  }
  try {
    readFileSync(s.page);
    readFileSync(s.api);
    console.log(`ok   "${name}" -> ${s.page.replace('src/app', '').replace('src/components', '')}`);
  } catch {
    bad++;
    console.log(`FAIL "${name}" -> ${s.page} or ${s.api} is missing`);
  }
}

// 2. And nothing is built that is never advertised — dead surfaces are worse
//    than missing ones, because they still have to be maintained.
for (const name of Object.keys(SURFACES)) {
  if (!advertised.includes(name)) {
    bad++;
    console.log(`FAIL "${name}" has a surface but is not advertised anywhere`);
  }
}

console.log(
  bad
    ? `\n${bad} advertised feature(s) not implemented`
    : `\nFEATURE PARITY OK — all ${advertised.length} advertised features are built`,
);
process.exit(bad ? 1 : 0);
