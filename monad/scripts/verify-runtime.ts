/**
 * Runtime integration test against the running dev server.
 * Static checks prove the code contains a gate; this proves the gate fires
 * over HTTP.  BASE=http://localhost:PORT npx tsx scripts/verify-runtime.ts
 */
const BASE = process.env.BASE ?? 'http://localhost:3000';
let bad = 0;
const out: string[] = [];

async function check(name: string, fn: () => Promise<{ pass: boolean; detail: string }>) {
  try {
    const { pass, detail } = await fn();
    if (!pass) bad++;
    out.push(`${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(50)} ${detail}`);
  } catch (e) {
    bad++;
    out.push(`FAIL ${name.padEnd(50)} threw: ${(e as Error).message}`);
  }
}
const j = (r: Response) => r.json().catch(() => ({}));
const post = (p: string, body: unknown) =>
  fetch(`${BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// The journal and the email toggle are free features, but they still must
// refuse an unauthenticated caller — they write rows keyed by user id.
for (const [p, body] of [['/api/decisions', { body: 'x' }], ['/api/notify', { on: true }]] as const) {
  await check(`${p} 401s when unauthenticated`, async () => {
    const r = await post(p, body);
    return { pass: r.status === 401, detail: String(r.status) };
  });
}

// Chat now grants one free answer, so an unpaid caller is not refused outright
// — but a caller with no chart at all has nothing to talk to.
await check('/api/chat 404s when there is no chart', async () => {
  const r = await post('/api/chat', { message: 'hello' });
  return { pass: r.status === 404, detail: String(r.status) };
});

for (const p of ['/api/brief']) {
  await check(`${p} 402s when unauthenticated`, async () => {
    const r = await post(p, { message: 'hello' });
    return { pass: r.status === 402, detail: String(r.status) };
  });
}

// The app shell is reachable with a chart cookie alone — a visitor who has just
// computed a chart must not hit a login wall. With NO chart they still cannot
// get in: they are sent to /start to make one.
//
// Four surfaces, not eight: the reading lived on two pages and timing on three
// before the restructure, and each made the other look redundant. The diagnosis
// keeps its own route because it answers a different question from the reading.
for (const p of ['/updates', '/chart', '/timing', '/stuck']) {
  await check(`${p} sends a chartless visitor to /start`, async () => {
    const r = await fetch(`${BASE}${p}`, { redirect: 'manual' });
    const loc = r.headers.get('location') ?? '';
    return { pass: [302, 307].includes(r.status) && loc.includes('/start'), detail: `${r.status} -> ${loc.slice(0, 40) || '(none)'}` };
  });
}

// Settings shows billing, so it still demands an account.
// Retired URLs are still live in emails and bookmarks, so they must redirect
// rather than 404.
for (const [from, to] of [
  ['/reading', '/chart'], ['/compare', '/chart'],
  ['/outlook', '/timing'], ['/best-day', '/timing'],
] as const) {
  await check(`${from} redirects to ${to}`, async () => {
    const r = await fetch(`${BASE}${from}`, { redirect: 'manual' });
    const loc = r.headers.get('location') ?? '';
    return { pass: [301, 307, 308].includes(r.status) && loc.endsWith(to), detail: `${r.status} -> ${loc.replace(BASE, '') || '(none)'}` };
  });
}

await check('/settings still requires an account', async () => {
  const r = await fetch(`${BASE}/settings`, { redirect: 'manual' });
  const loc = r.headers.get('location') ?? '';
  return { pass: [302, 307].includes(r.status) && loc.includes('/login'), detail: `${r.status} -> ${loc.slice(0, 40) || '(none)'}` };
});

for (const p of ['/api/cron/daily', '/api/cron/sequence']) {
  await check(`${p} 401s with no secret`, async () => {
    const r = await fetch(`${BASE}${p}`);
    return { pass: r.status === 401, detail: String(r.status) };
  });
  await check(`${p} 401s with a wrong secret`, async () => {
    const r = await fetch(`${BASE}${p}`, { headers: { authorization: 'Bearer wrong' } });
    return { pass: r.status === 401, detail: String(r.status) };
  });
}

await check('/api/checkout 401s when unauthenticated', async () => {
  const r = await post('/api/checkout', { plan: 'annual' });
  return { pass: r.status === 401, detail: String(r.status) };
});

await check('/api/chart rejects a malformed body', async () => {
  const r = await post('/api/chart', { firstName: '' });
  return { pass: r.status === 400, detail: String(r.status) };
});

const baseChart = {
  firstName: 'Test', email: 'a@b.co', hour: 8, minute: 10, timeKnown: true,
  place: { label: 'London', lat: 51.5, lon: -0.13, timezone: 'Europe/London' },
};
await check('/api/chart rejects 31 February', async () => {
  const r = await post('/api/chart', { ...baseChart, year: 1990, month: 2, day: 31 });
  const b = await j(r);
  return { pass: r.status === 400 && /does not exist/i.test(b.error ?? ''), detail: `${r.status} ${b.error ?? ''}` };
});
await check('/api/chart rejects a future birth date', async () => {
  const r = await post('/api/chart', { ...baseChart, year: 2026, month: 12, day: 30 });
  const b = await j(r);
  return { pass: r.status === 400 && /future/i.test(b.error ?? ''), detail: `${r.status} ${b.error ?? ''}` };
});
await check('/api/chart rejects a bogus timezone', async () => {
  const r = await post('/api/chart', { ...baseChart, year: 1990, month: 1, day: 1, place: { label: 'X', lat: 0, lon: 0, timezone: 'Middle/Earth' } });
  return { pass: r.status === 400, detail: String(r.status) };
});

await check('/api/reading refuses an unknown chart id', async () => {
  const r = await post('/api/reading', { chartId: '00000000-0000-0000-0000-000000000000' });
  return { pass: [400, 404].includes(r.status), detail: String(r.status) };
});

for (const p of ['/', '/start', '/login', '/legal/terms', '/legal/privacy']) {
  await check(`${p} is publicly reachable`, async () => {
    const r = await fetch(`${BASE}${p}`);
    return { pass: r.ok, detail: String(r.status) };
  });
}

await check('/api/geocode ranks the real London first', async () => {
  const r = await fetch(`${BASE}/api/geocode?q=London`);
  const b = await j(r);
  const f = b.places?.[0];
  return { pass: r.ok && /United Kingdom/.test(f?.label ?? ''), detail: f ? `"${f.label}" ${f.timezone}` : 'none' };
});
await check('/api/geocode ignores a too-short query', async () => {
  const r = await fetch(`${BASE}/api/geocode?q=L`);
  const b = await j(r);
  return { pass: r.ok && b.places?.length === 0, detail: `${b.places?.length ?? '?'} results` };
});
await check('/api/entitlement reports anonymous as unpaid', async () => {
  const r = await fetch(`${BASE}/api/entitlement`);
  const b = await j(r);
  return { pass: r.ok && b.isPaid === false, detail: `isPaid=${b.isPaid}` };
});


// The whole anonymous funnel, end to end. This is the path that broke twice:
// once on timezone validation, once because the reveal page 500'd on a chart
// that could not be persisted.
await check('anonymous funnel completes end to end', async () => {
  const res = await post('/api/chart', {
    firstName: 'Ada', email: 'ada@example.com',
    year: 1991, month: 12, day: 10, hour: 9, minute: 0, timeKnown: true,
    place: { label: 'Mumbai, India', lat: 19.07, lon: 72.87, timezone: 'Asia/Kolkata' },
  });
  const cookie = res.headers.get('set-cookie')?.split(';')[0] ?? '';
  const json = (await j(res)) as { id?: string };
  if (!res.ok || !json.id) return { pass: false, detail: `chart ${res.status}` };

  const page = await fetch(`${BASE}/r/${json.id}`, { headers: { cookie } });
  return { pass: page.status === 200, detail: `chart 200 -> /r/:id ${page.status}` };
});

console.log(out.join('\n'));
console.log(bad ? `\n${bad} runtime failure(s)` : '\nALL RUNTIME GATES HOLD');
process.exit(bad ? 1 : 0);

export {};
