import { buildChart, chartBrief } from '../src/lib/astro/reading';
import { localToUtc } from '../src/lib/astro/geo';

/** End-to-end: local birth data -> UTC -> full composite chart. */
const CASES = [
  { name:'Keshav', tz:'Europe/London',      y:1990, mo:1,  d:1,  h:8,  mi:10, lat:51.5074, lon:-0.1278 },
  { name:'Test2',  tz:'America/New_York',   y:1985, mo:7,  d:22, h:14, mi:35, lat:40.7128, lon:-74.0060 },
  { name:'Test3',  tz:'Asia/Tokyo',         y:1978, mo:11, d:3,  h:23, mi:5,  lat:35.6762, lon:139.6503 },
];

for (const c of CASES) {
  const utc = localToUtc(c.tz, c.y, c.mo, c.d, c.h, c.mi);
  const chart = buildChart({
    birthUtc: utc, localYear:c.y, localMonth:c.mo, localDay:c.d,
    lat:c.lat, lon:c.lon, timeKnown:true,
  });
  console.log(`\n=== ${c.name}  ${c.y}-${c.mo}-${c.d} ${c.h}:${String(c.mi).padStart(2,'0')} ${c.tz} -> ${utc.toISOString()}`);
  console.log(`archetype : ${chart.archetype.name}  (${chart.sunSign} Sun)`);
  console.log(`big three : Sun ${chart.natal.sun.label} | Moon ${chart.natal.moon.label} | Rising ${chart.natal.ascendant?.label} | MC ${chart.natal.midheaven?.label}`);
  console.log(`numerology: life path ${chart.lifePath}`);
  console.log(`chinese   : ${chart.chinese.label}`);
  console.log(`weighting : dominant ${chart.natal.dominantElement}/${chart.natal.dominantModality}${chart.natal.stellium?`, stellium in ${chart.natal.stellium}`:''}`);
  console.log(`aspects   : ${chart.natal.aspects.length} within orb, tightest ${chart.natal.aspects[0]?.a} ${chart.natal.aspects[0]?.type} ${chart.natal.aspects[0]?.b} @ ${chart.natal.aspects[0]?.orb}°`);
  console.log(`houses    : ${chart.natal.houseSystem}, H1 cusp ${chart.natal.houses?.[0]}°`);
}

// No-birth-time path must withhold angles rather than fabricate them.
const utc = localToUtc('Europe/London', 1990, 1, 1, 12, 0);
const partial = buildChart({ birthUtc:utc, localYear:1990, localMonth:1, localDay:1, lat:51.5, lon:-0.13, timeKnown:false });
console.log(`\n=== no birth time`);
console.log(`rising=${partial.risingSign}  mc=${partial.midheavenSign}  houses=${partial.natal.houses}  partial=${partial.partial}`);
console.log(partial.risingSign===null && partial.natal.houses===null ? 'ok  angles correctly withheld' : 'FAIL angles fabricated without a time');

console.log('\n--- model brief sample (first 22 lines) ---');
console.log(chartBrief(buildChart({birthUtc:localToUtc('Europe/London',1990,1,1,8,10),localYear:1990,localMonth:1,localDay:1,lat:51.5074,lon:-0.1278,timeKnown:true}),'Keshav').split('\n').slice(0,22).join('\n'));
