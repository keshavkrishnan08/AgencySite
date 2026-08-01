import { localToUtc, offsetLabel } from '../src/lib/astro/geo';

const CASES: [string, string, number[], string][] = [
  ['Pacific/Honolulu', 'Obama, Hawaii has had no DST since 1947', [1961,8,4,19,24], '1961-08-05T05:24:00.000Z'],
  ['America/Los_Angeles','Jobs, PST in February',                  [1955,2,24,19,15], '1955-02-25T03:15:00.000Z'],
  ['America/New_York',  'US summer DST (EDT, UTC-4)',              [1975,7,4,12,0],   '1975-07-04T16:00:00.000Z'],
  ['Europe/London',     'British Standard Time 1968-71: UTC+1 in JANUARY', [1970,1,15,8,0], '1970-01-15T07:00:00.000Z'],
  ['Europe/London',     'Post-1971 January is UTC+0',              [1985,1,15,8,0],   '1985-01-15T08:00:00.000Z'],
  ['Africa/Johannesburg','Musk, SAST UTC+2 no DST',                [1971,6,28,7,30],  '1971-06-28T05:30:00.000Z'],
  ['Australia/Sydney',  'Southern-hemisphere DST in December',     [1990,12,20,9,0],  '1990-12-19T22:00:00.000Z'],
  ['Asia/Kolkata',      'Half-hour offset UTC+5:30',               [1988,3,10,6,15],  '1988-03-10T00:45:00.000Z'],
  ['America/Chicago',   'Ambiguous hour at fall-back transition',  [2021,11,7,1,30],  '2021-11-07T06:30:00.000Z'],
];

let bad = 0;
for (const [tz, why, [y,mo,d,h,mi], want] of CASES) {
  const got = localToUtc(tz, y, mo, d, h, mi);
  const ok = got.toISOString() === want;
  if (!ok) bad++;
  console.log(`${ok?'ok      ':'MISMATCH'} ${tz.padEnd(22)} ${offsetLabel(tz, got).padEnd(10)} ${got.toISOString()}  ${ok?'':'want '+want+'  '}${why}`);
}
console.log(bad ? `\n${bad} mismatch(es)` : '\nall timezone cases correct');
