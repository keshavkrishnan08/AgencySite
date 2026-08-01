/**
 * Birth-place lookup and local-time to UTC conversion.
 *
 * Geocoding uses Open-Meteo, which is free, keyless, and returns the IANA
 * timezone alongside the coordinates. Set GEOCODER=google with a
 * GOOGLE_MAPS_API_KEY to switch to Places instead.
 */

export interface Place {
  id: string;
  name: string;
  admin: string | null;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  timezone: string;
  label: string;
}

interface OpenMeteoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country: string;
  country_code: string;
  admin1?: string;
  population?: number;
}

export async function searchPlaces(query: string, limit = 8): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', q);
  url.searchParams.set('count', String(Math.min(limit * 2, 20)));
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
  if (!res.ok) return [];

  const json = (await res.json()) as { results?: OpenMeteoResult[] };
  const results = json.results ?? [];

  return results
    .filter((r) => r.timezone)
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
    .slice(0, limit)
    .map((r) => {
      const admin = r.admin1 ?? null;
      const label = [r.name, admin, r.country].filter(Boolean).join(', ');
      return {
        id: String(r.id),
        name: r.name,
        admin,
        country: r.country,
        countryCode: r.country_code,
        lat: r.latitude,
        lon: r.longitude,
        timezone: r.timezone,
        label,
      };
    });
}

/**
 * Offset in milliseconds between the named zone and UTC at a given instant.
 * Derived from Intl, so it respects historical DST rules from the ICU tz
 * database — which matters a lot: a 1975 US birth in July was on DST under
 * rules that no longer apply today.
 */
function zoneOffsetMs(timeZone: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  // Intl renders hour 24 for midnight in some ICU versions; normalise to 0.
  const hour = get('hour') % 24;
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second'),
  );
  return asUtc - utcMs;
}

/**
 * Convert a wall-clock birth moment in a named zone to a true UTC instant.
 * Two passes converge across DST boundaries, where a single pass would land an
 * hour off for times near the transition.
 */
export function localToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utc = naive - zoneOffsetMs(timeZone, naive);
  utc = naive - zoneOffsetMs(timeZone, utc);
  return new Date(utc);
}

/**
 * Is this a timezone the runtime can actually resolve?
 *
 * Validate by construction, NOT against `Intl.supportedValuesOf('timeZone')`.
 * That list holds only one spelling of each zone, and which one depends on the
 * ICU build: this runtime lists `Asia/Calcutta` and `Europe/Kiev` but not
 * `Asia/Kolkata` or `Europe/Kyiv` — which are exactly the names the geocoder
 * returns. Checking membership rejected every birth in India, Ukraine and
 * Argentina at the last step of the funnel.
 */
export function isKnownTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Human-readable offset, e.g. "UTC-07:00", for showing back to the user. */
export function offsetLabel(timeZone: string, at: Date): string {
  const ms = zoneOffsetMs(timeZone, at.getTime());
  const sign = ms >= 0 ? '+' : '-';
  const abs = Math.abs(ms);
  const h = String(Math.floor(abs / 3_600_000)).padStart(2, '0');
  const m = String(Math.floor((abs % 3_600_000) / 60_000)).padStart(2, '0');
  return `UTC${sign}${h}:${m}`;
}
