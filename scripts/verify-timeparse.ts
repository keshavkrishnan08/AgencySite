import { parseTime } from '../src/components/StartFlow';

/**
 * The forgiving time parser. Monad's own build log names the strict version
 * as a conversion-killing bug on mobile, so every reasonable shape must work.
 */
const CASES: [string, string | null][] = [
  ['8:10', '8:10'], ['810', '8:10'], ['8.10', '8:10'], ['8 10', '8:10'],
  ['08:10', '8:10'], ['8', '8:00'], ['12:00', '12:00'], ['11:59', '11:59'],
  ['  7:05  ', '7:05'],
  ['13:00', null],   // 12-hour clock only; AM/PM is a separate control
  ['0:30', null],
  ['8:75', null],
  ['abc', null], ['', null], ['8:1', null],
];

let bad = 0;
for (const [input, want] of CASES) {
  const r = parseTime(input);
  const got = r ? `${r.hour}:${String(r.minute).padStart(2, '0')}` : null;
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${JSON.stringify(input).padEnd(10)} -> ${String(got).padEnd(6)} want ${want}`);
}
console.log(bad ? `\n${bad} failure(s)` : '\nTIME PARSER OK');
