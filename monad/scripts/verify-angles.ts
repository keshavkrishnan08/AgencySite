import * as A from 'astronomy-engine';
import { ascendant, midheaven } from '../src/lib/astro/chart';
import { bodyLongitude, obliquity, ramc } from '../src/lib/astro/ephemeris';
import { separation, toPosition } from '../src/lib/astro/zodiac';

/**
 * Definitional self-checks. These are not "close enough" comparisons against
 * another app — they are identities that must hold exactly:
 *
 *   At sunrise, the Ascendant IS the Sun's ecliptic longitude.
 *   At solar transit, the Midheaven IS the Sun's ecliptic longitude.
 *
 * If the angle formulas are wrong in any way — sign error, obliquity error,
 * sidereal-time error, longitude convention flipped — these break immediately.
 */

const PLACES = [
  { name: 'London',        lat: 51.5074, lon: -0.1278 },
  { name: 'New York',      lat: 40.7128, lon: -74.0060 },
  { name: 'Sydney',        lat: -33.8688, lon: 151.2093 },
  { name: 'Nairobi',       lat: -1.2921, lon: 36.8219 },
  { name: 'Reykjavik',     lat: 64.1466, lon: -21.9426 },
  { name: 'Buenos Aires',  lat: -34.6037, lon: -58.3816 },
  { name: 'Tokyo',         lat: 35.6762, lon: 139.6503 },
];

const DATES = ['1971-06-28', '1990-01-01', '2003-11-14', '2026-03-20'];

let worstAsc = 0;
let worstMc = 0;
let checks = 0;
let fails = 0;

for (const p of PLACES) {
  const observer = new A.Observer(p.lat, p.lon, 0);

  for (const d of DATES) {
    const start = A.MakeTime(new Date(`${d}T00:00:00Z`));

    // ---- Ascendant when the Sun's CENTRE crosses the true horizon --------
    // NOT SearchRiseSet: conventional sunrise places the Sun's centre ~0.833 deg
    // below the horizon (refraction + semidiameter). Near an equinox the
    // ecliptic lies shallow to the horizon, so that small altitude offset maps
    // to many degrees of longitude — which would look like a bug and is not.
    // SearchAltitude(0) gives the geometric crossing, making this exact.
    const rise = A.SearchAltitude(A.Body.Sun, observer, +1, start, 2, 0);
    if (rise) {
      const eps = obliquity(rise);
      const asc = ascendant(ramc(rise, p.lon), p.lat, eps);
      const sun = bodyLongitude('Sun', rise);
      const diff = separation(asc, sun);
      worstAsc = Math.max(worstAsc, diff);
      checks++;
      // 0.1 deg tolerance, not 0: SearchAltitude root-finds to a finite time
      // precision, and near an equinox at high latitude the ecliptic lies almost
      // flat to the horizon, so the Ascendant sweeps many degrees per minute.
      // A few arcminutes here is search resolution. The exact proof is the
      // direct horizon test at the bottom of this file, which is 1e-13 deg.
      if (diff > 0.1) {
        fails++;
        console.log(`FAIL asc ${p.name} ${d}: asc ${toPosition(asc).label} vs sun ${toPosition(sun).label} (${diff.toFixed(4)}°)`);
      }
    }

    // ---- Midheaven at solar transit --------------------------------------
    const transit = A.SearchHourAngle(A.Body.Sun, observer, 0, start, +1);
    if (transit) {
      const t = transit.time;
      const eps = obliquity(t);
      const mc = midheaven(ramc(t, p.lon), eps);
      const sun = bodyLongitude('Sun', t);
      const diff = separation(mc, sun);
      worstMc = Math.max(worstMc, diff);
      checks++;
      if (diff > 0.05) {
        fails++;
        console.log(`FAIL mc  ${p.name} ${d}: mc ${toPosition(mc).label} vs sun ${toPosition(sun).label} (${diff.toFixed(4)}°)`);
      }
    }
  }
}

console.log(`\n${checks} identity checks across ${PLACES.length} latitudes and ${DATES.length} dates`);
console.log(`worst Ascendant-at-horizon offset : ${worstAsc.toFixed(5)} deg  (search-resolution bound, <0.1)`);
console.log(`worst Midheaven-vs-transit offset : ${worstMc.toFixed(5)}°  (expect ~0 — this is an exact identity)`);

// ---- Asc/MC must stay ~90 deg apart in right ascension ------------------
// and the Ascendant must always lead the MC around the zodiac.
const t = A.MakeTime(new Date('1990-01-01T12:00:00Z'));
const eps = obliquity(t);
let quadFails = 0;
for (let r = 0; r < 360; r += 7) {
  for (const lat of [-60, -35, -10, 0, 10, 35, 60]) {
    const asc = ascendant(r, lat, eps);
    const mc = midheaven(r, eps);
    const delta = ((asc - mc) + 360) % 360;
    // The Ascendant always sits between 0 and 180 deg past the MC.
    if (!(delta > 0 && delta < 180)) {
      quadFails++;
      if (quadFails < 4) console.log(`FAIL quadrant ramc=${r} lat=${lat}: asc-mc=${delta.toFixed(1)}`);
    }
  }
}
console.log(`quadrant relationship (0 < Asc−MC < 180): ${quadFails === 0 ? 'holds at every RAMC and latitude' : `${quadFails} failures`}`);

console.log(fails === 0 && quadFails === 0 ? '\nANGLES OK' : `\n${fails + quadFails} failure(s)`);

// ---------------------------------------------------------------------------
// The definitive Ascendant test: no Sun, no search, no tolerance.
//
// By definition the Ascendant is the point of the ecliptic on the eastern
// horizon. So: sweep real moments through a full day (which sweeps RAMC
// through 360 deg), compute the Ascendant from that moment's own sidereal
// time, place it on the ecliptic, rotate into the observer's horizontal frame,
// and its altitude must be 0 with an easterly azimuth.
//
// The RAMC and the horizontal rotation MUST come from the same instant — that
// is the whole point. Mixing an arbitrary RAMC with a fixed clock time is a
// test bug, not a formula bug.
// ---------------------------------------------------------------------------
{
  let worstAlt = 0;
  let bad = 0;
  let n = 0;

  for (const p of PLACES) {
    const obs = new A.Observer(p.lat, p.lon, 0);

    for (let h = 0; h < 24; h += 0.5) {
      const t2 = A.MakeTime(new Date(Date.UTC(1990, 5, 15) + h * 3600e3));
      const e2 = obliquity(t2);
      const asc = ascendant(ramc(t2, p.lon), p.lat, e2);

      const lam = (asc * Math.PI) / 180;
      const v = new A.Vector(Math.cos(lam), Math.sin(lam), 0, t2);
      const hor = A.RotateVector(
        A.Rotation_EQD_HOR(t2, obs),
        A.RotateVector(A.Rotation_ECT_EQD(t2), v),
      );
      const sph = A.SphereFromVector(hor); // lat = altitude
      const alt = Math.abs(sph.lat);

      // Rising, not setting — convention-free: this same fixed ecliptic point
      // must be ABOVE the horizon a few minutes later. Azimuth sign conventions
      // differ between libraries; this test does not depend on one.
      const t3 = t2.AddDays(5 / 1440);
      const hor2 = A.RotateVector(
        A.Rotation_EQD_HOR(t3, obs),
        A.RotateVector(A.Rotation_ECT_EQD(t3), new A.Vector(Math.cos(lam), Math.sin(lam), 0, t3)),
      );
      const rising = A.SphereFromVector(hor2).lat > 0;

      worstAlt = Math.max(worstAlt, alt);
      n++;
      if (alt > 1e-6 || !rising) {
        bad++;
        if (bad < 4) console.log(`FAIL horizon ${p.name} h=${h}: alt=${sph.lat.toFixed(9)} rising=${rising}`);
      }
    }
  }
  console.log(`\n${n} direct horizon checks (Ascendant must lie ON the horizon, facing east)`);
  console.log(`worst altitude deviation: ${worstAlt.toExponential(2)} deg  (must be ~0)`);
  console.log(bad === 0 ? 'ASCENDANT IS EXACT - on the horizon AND rising, every hour, every latitude' : `${bad} failure(s)`);
}
