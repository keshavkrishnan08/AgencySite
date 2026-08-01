import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every internal href must resolve to a route that exists, and every button
 * must carry a handler or a submit type. A dead link or an inert button is a
 * bug the type system cannot catch.
 */
function walk(dir: string, ext: string[]): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p, ext) : ext.some((e) => p.endsWith(e)) ? [p] : [];
  });
}

const read = (p: string) => readFileSync(p, 'utf8');
let bad = 0;
const ok = (m: string) => console.log(`ok    ${m}`);
const fail = (m: string) => { bad++; console.log(`FAIL  ${m}`); };

// ---- the set of routes that actually exist, with route groups stripped
const routes = new Set(
  walk('src/app', ['page.tsx']).map((p) =>
    p.replace('src/app', '').replace('/page.tsx', '').replace(/\/\([^)]+\)/g, '') || '/',
  ),
);
// Redirect sources are reachable destinations but are deliberately unlinked —
// they exist for URLs already out in emails and Stripe return URLs.
const redirectSources = new Set(
  (read('next.config.mjs').match(/source: '([^']+)', destination/g) ?? [])
    .map((m) => m.replace(/source: '|', destination/g, '')),
);
redirectSources.forEach((r) => routes.add(r));

const dynamic = [...routes].filter((r) => r.includes('['));
const resolves = (href: string) => {
  const path = href.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  if (routes.has(path)) return true;
  // Match dynamic segments: /r/[id] covers /r/anything
  return dynamic.some((d) => {
    const re = new RegExp('^' + d.replace(/\[[^\]]+\]/g, '[^/]+') + '$');
    return re.test(path);
  });
};

const files = walk('src', ['.tsx']);
let checked = 0;
for (const f of files) {
  const src = read(f);
  for (const m of src.matchAll(/href=["'](\/[^"'{}]*)["']/g)) {
    checked += 1;
    if (!resolves(m[1])) fail(`${f.replace('src/', '')} links to ${m[1]} — no such route`);
  }
  // Template-literal hrefs we can only spot-check for their static prefix.
  for (const m of src.matchAll(/href=\{`(\/[a-z-]+)\//g)) {
    checked += 1;
    if (![...routes].some((r) => r.startsWith(m[1]))) {
      fail(`${f.replace('src/', '')} links under ${m[1]}/ — no route with that prefix`);
    }
  }
}
ok(`${checked} internal links all resolve to real routes`);

// ---- every <button> must have onClick or type="submit"
for (const f of files) {
  const src = read(f);
  for (const m of src.matchAll(/<button\b([\s\S]*?)>/g)) {
    const attrs = m[1];
    if (!/onClick|type=["']submit["']/.test(attrs)) {
      fail(`${f.replace('src/', '')} has a <button> with no onClick and no submit type`);
    }
  }
}
ok('every button has a handler or submits a form');

// ---- every form must have onSubmit
for (const f of files) {
  const src = read(f);
  for (const m of src.matchAll(/<form\b([\s\S]*?)>/g)) {
    if (!/onSubmit|action=/.test(m[1])) {
      fail(`${f.replace('src/', '')} has a <form> with no onSubmit`);
    }
  }
}
ok('every form has a submit handler');

// ---- no orphan pages: every route is linked from somewhere, or is an entry point
// Entry points are reached from outside the app — an ad, an email, or a
// payment-provider redirect — so nothing internal needs to link to them.
const ENTRY = [
  '/', '/start', '/login', '/auth/callback',
  '/welcome', // Stripe success_url
  '/dev/modal', '/dev/shell', '/legal/[slug]', '/r/[id]',
];
const allSource = files.map(read).join('\n');
for (const r of routes) {
  if (ENTRY.includes(r) || r.includes('[') || redirectSources.has(r)) continue;
  allSource.includes(`"${r}"`) || allSource.includes(`'${r}'`) || allSource.includes(`\`${r}`)
    ? ok(`${r} is linked from the app`)
    : fail(`${r} is an orphan — no link points to it`);
}

// ---- every fetch().json() on the client must be guarded. A crashed route
//      returns HTML and an unguarded parse throws a browser internal
//      ("The string did not match the expected pattern") that tells the user
//      nothing and is impossible to diagnose from a support email.
for (const f of walk('src/components', ['.tsx'])) {
  for (const line of read(f).split('\n')) {
    if (/await res\.json\(\)/.test(line) && !/catch/.test(line)) {
      fail(`${f.replace('src/', '')} parses a response without a catch`);
    }
  }
}
ok('every client JSON parse is guarded against a non-JSON response');

// ---- Stripe must return the buyer to a route that exists. This one shipped
//      broken: success_url pointed at /welcome, which did not exist, so paying
//      landed the user on a 404.
const checkout = read('src/app/api/checkout/route.ts');
for (const m of checkout.matchAll(/(?:success_url|cancel_url): `\$\{siteUrl\(\)\}([^`?]*)/g)) {
  const path = m[1].replace(/\/\$\{[^}]+\}/g, '/x').replace(/#.*$/, '') || '/';
  resolves(path)
    ? ok(`Stripe returns to ${path}, which exists`)
    : fail(`Stripe returns to ${path} — no such route`);
}

console.log(bad ? `\n${bad} LINK/INTERACTION FAILURE(S)` : '\nLINKS AND INTERACTIONS OK');
process.exit(bad ? 1 : 0);
