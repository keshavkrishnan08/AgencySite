import { chineseNewYear, chineseSign } from '../src/lib/astro/chinese';
import { lifePath } from '../src/lib/astro/numerology';

/** Published Chinese New Year dates — the animal boundary must land exactly. */
const CNY: [number, string][] = [
  [1971,'1971-01-27'],[1984,'1984-02-02'],[1990,'1990-01-27'],[2000,'2000-02-05'],
  [2008,'2008-02-07'],[2020,'2020-01-25'],[2023,'2023-01-22'],[2024,'2024-02-10'],
  [2025,'2025-01-29'],[2026,'2026-02-17'],
];

let bad = 0;
for (const [y, want] of CNY) {
  const got = chineseNewYear(y).toISOString().slice(0,10);
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok?'ok  ':'FAIL'} CNY ${y}  got ${got}  want ${want}`);
}

console.log('\n--- animal boundary (the case naive year%12 gets wrong) ---');
const cases: [string, string][] = [
  ['1984-02-01','Pig'],
  ['1984-02-02','Rat'],
  ['1990-01-26','Snake'],
  ['1990-01-27','Horse'],
  ['2024-02-09','Rabbit'],
  ['2024-02-10','Dragon'],
];
for (const [d, want] of cases) {
  const s = chineseSign(new Date(`${d}T06:00:00Z`));
  const ok = s.animal === want;
  if (!ok) bad++;
  console.log(`${ok?'ok  ':'FAIL'} ${d} -> ${s.label.padEnd(14)} want ${want}`);
}

console.log('\n--- life path ---');
const lp: [number,number,number,number][] = [
  [1971,6,28,7],
  [1990,1,1,3],
  [2000,2,29,6],
];
for (const [y,m,d,want] of lp) {
  const got = lifePath(y,m,d);
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok?'ok  ':'FAIL'} ${y}-${m}-${d} -> ${got}  want ${want}`);
}
console.log(bad ? `\n${bad} failure(s)` : '\nCHINESE + NUMEROLOGY OK');
