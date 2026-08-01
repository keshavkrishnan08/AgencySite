import * as A from 'astronomy-engine';
import { norm360 } from './zodiac';

/**
 * Geocentric apparent ecliptic longitudes, referred to the true ecliptic and
 * equinox of date (ECT) — the frame tropical astrology uses.
 *
 * astronomy-engine returns J2000 vectors by default; using those directly
 * would drift by the accumulated precession since 2000 (~0.36° per 25 years),
 * which is enough to put a planet in the wrong sign near a cusp.
 */

export const BODIES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const;

export type BodyName = (typeof BODIES)[number];

/** Bodies plus the calculated points that behave like them. */
export type PointName = BodyName | 'NorthNode' | 'SouthNode';

const BODY: Record<BodyName, A.Body> = {
  Sun: A.Body.Sun,
  Moon: A.Body.Moon,
  Mercury: A.Body.Mercury,
  Venus: A.Body.Venus,
  Mars: A.Body.Mars,
  Jupiter: A.Body.Jupiter,
  Saturn: A.Body.Saturn,
  Uranus: A.Body.Uranus,
  Neptune: A.Body.Neptune,
  Pluto: A.Body.Pluto,
};

function eclipticLonOfDate(vec: A.Vector, time: A.AstroTime): number {
  const rot = A.Rotation_EQJ_ECT(time);
  const sph = A.SphereFromVector(A.RotateVector(rot, vec));
  return norm360(sph.lon);
}

export function bodyLongitude(body: BodyName, time: A.AstroTime): number {
  if (body === 'Moon') return norm360(A.EclipticGeoMoon(time).lon);
  return eclipticLonOfDate(A.GeoVector(BODY[body], time, true), time);
}

/**
 * Osculating true lunar node, from the instantaneous lunar orbital plane
 * (r × v) rather than the nearest node crossing — which can be up to ~13 days
 * away and therefore up to ~0.7° stale.
 */
export function trueNorthNode(time: A.AstroTime): number {
  const dt = 0.02; // ~29 minutes
  const rot = A.Rotation_EQJ_ECT(time);
  const at = (t: A.AstroTime) => A.RotateVector(rot, A.GeoMoon(t));

  const p0 = at(time.AddDays(-dt));
  const p1 = at(time.AddDays(dt));
  const r = at(time);
  const v = {
    x: (p1.x - p0.x) / (2 * dt),
    y: (p1.y - p0.y) / (2 * dt),
    z: (p1.z - p0.z) / (2 * dt),
  };
  const n = {
    x: r.y * v.z - r.z * v.y,
    y: r.z * v.x - r.x * v.z,
    z: r.x * v.y - r.y * v.x,
  };
  // Ascending node direction is ẑ × n = (-n.y, n.x, 0)
  return norm360((Math.atan2(n.x, -n.y) * 180) / Math.PI);
}

/** True if the body's ecliptic longitude is decreasing (retrograde). */
export function isRetrograde(body: BodyName, time: A.AstroTime): boolean {
  if (body === 'Sun' || body === 'Moon') return false;
  const step = 0.5;
  const before = bodyLongitude(body, time.AddDays(-step));
  const after = bodyLongitude(body, time.AddDays(step));
  const delta = ((after - before + 540) % 360) - 180;
  return delta < 0;
}

export function allLongitudes(time: A.AstroTime): Record<PointName, number> {
  const out = {} as Record<PointName, number>;
  for (const b of BODIES) out[b] = bodyLongitude(b, time);
  const node = trueNorthNode(time);
  out.NorthNode = node;
  out.SouthNode = norm360(node + 180);
  return out;
}

/** True obliquity of the ecliptic in degrees, including nutation. */
export function obliquity(time: A.AstroTime): number {
  // Rotate the ecliptic pole into equatorial-of-date and read the tilt back
  // out, so this stays consistent with the ECT frame used for longitudes.
  const rot = A.Rotation_ECT_EQD(time);
  const pole = A.RotateVector(rot, new A.Vector(0, 0, 1, time));
  return (Math.acos(Math.max(-1, Math.min(1, pole.z))) * 180) / Math.PI;
}

/**
 * Local Sidereal Time in degrees — the Right Ascension of the Midheaven.
 * astronomy-engine's SiderealTime returns Greenwich apparent sidereal time in
 * hours; east longitude is added directly.
 */
export function ramc(time: A.AstroTime, eastLongitudeDeg: number): number {
  const gast = A.SiderealTime(time); // hours
  return norm360(gast * 15 + eastLongitudeDeg);
}
