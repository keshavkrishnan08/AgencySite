'use client';

import { useEffect, useRef, useState } from 'react';
import type { Place } from '@/lib/astro/geo';

/**
 * Type-ahead over the geocoder. Debounced, out-of-order-safe, and touch-sized
 * — the city field is where mobile forms usually lose people.
 */
export function CityPicker({
  value,
  onChange,
  autoFocus = false,
  placeholder = 'Start typing a city…',
}: {
  value: Place | null;
  onChange: (p: Place | null) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value?.label ?? '');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (value && query === value.label) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const id = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const json = await res.json().catch(() => ({ places: [] }));
        // A slower earlier request must not overwrite a newer result.
        if (id !== seq.current) return;
        setResults(json.places ?? []);
        setOpen(true);
      } catch {
        if (id === seq.current) setResults([]);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, value]);

  return (
    // z-30 lifts the whole picker above later siblings — without it the submit
    // button paints over the results list and swallows the second option.
    <div className="relative z-30">
      <input
        className="field"
        autoFocus={autoFocus}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(null);
        }}
        onFocus={() => results.length > 0 && !value && setOpen(true)}
        aria-label="City of birth"
        aria-expanded={open}
        role="combobox"
        aria-controls="city-results"
      />

      {value && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink/65">
          <span className="text-brass" aria-hidden>
            ✓
          </span>
          {value.label}
          <span className="datum text-xs">{value.timezone}</span>
        </p>
      )}

      {loading && !value && <p className="eyebrow mt-3">Searching…</p>}

      {open && !value && results.length > 0 && (
        <ul
          id="city-results"
          className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-[2px] border bg-paper shadow-xl rule"
        >
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 border-b px-4 py-3.5 text-left text-[15px] last:border-b-0 hover:bg-ink/[0.04] rule"
                onClick={() => {
                  onChange(p);
                  setQuery(p.label);
                  setOpen(false);
                }}
              >
                <span>{p.label}</span>
                <span className="datum shrink-0 text-[11px]">{p.countryCode}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open &&
        !value &&
        !loading &&
        query.trim().length >= 2 &&
        results.length === 0 && (
          <p className="mt-3 text-sm text-ink/55">
            No match. Try the nearest large city — the timezone is what matters.
          </p>
        )}
    </div>
  );
}
