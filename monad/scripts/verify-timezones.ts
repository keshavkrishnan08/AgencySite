import { isKnownTimeZone } from '../src/lib/astro/geo';
import { searchPlaces } from '../src/lib/astro/geo';

/**
 * Every timezone the geocoder can return must pass validation.
 *
 * This exists because `Intl.supportedValuesOf('timeZone')` holds only one
 * spelling per zone and the choice is ICU-build dependent — validating against
 * it silently rejected every birth in India, Ukraine and Argentina.
 */
let bad = 0;
const ok = (m: string) => console.log(`ok   ${m}`);
const fail = (m: string) => { bad++; console.log(`FAIL ${m}`); };

// Both spellings of the zones that renamed. Both must be accepted.
const ALIASES = [
  ['Asia/Calcutta', 'Asia/Kolkata'],
  ['Europe/Kiev', 'Europe/Kyiv'],
  ['America/Buenos_Aires', 'America/Argentina/Buenos_Aires'],
  ['Asia/Rangoon', 'Asia/Yangon'],
  ['Asia/Saigon', 'Asia/Ho_Chi_Minh'],
  ['Europe/London', 'Europe/London'],
  ['America/New_York', 'America/New_York'],
];

for (const [legacy, modern] of ALIASES) {
  isKnownTimeZone(legacy) && isKnownTimeZone(modern)
    ? ok(`${legacy.padEnd(30)} and ${modern} both accepted`)
    : fail(`${legacy} / ${modern} — one spelling is rejected`);
}

// Garbage must still be refused.
for (const junk of ['Not/AZone', '', 'UTC+5', 'Mars/Olympus']) {
  isKnownTimeZone(junk)
    ? fail(`"${junk}" was accepted as a timezone`)
    : ok(`"${junk}" correctly refused`);
}

// The live geocoder's own output must round-trip for a spread of markets.
const CITIES = ['Mumbai', 'Kyiv', 'Buenos Aires', 'Ho Chi Minh City', 'Yangon', 'London', 'Auckland'];
for (const city of CITIES) {
  const places = await searchPlaces(city, 1);
  if (!places.length) { console.log(`skip ${city} — geocoder returned nothing`); continue; }
  const tz = places[0].timezone;
  isKnownTimeZone(tz)
    ? ok(`${city.padEnd(18)} -> ${tz}`)
    : fail(`${city} -> ${tz} would be rejected at checkout`);
}

console.log(bad ? `\n${bad} TIMEZONE FAILURE(S)` : '\nALL TIMEZONES ACCEPTED');
process.exit(bad ? 1 : 0);
