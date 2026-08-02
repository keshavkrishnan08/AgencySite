'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EVENTS, track } from './Analytics';
import { CityPicker } from './CityPicker';
import type { Place } from '@/lib/astro/geo';

const THIS_YEAR = new Date().getFullYear();
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Parses a typed birth time forgivingly.
 *
 * Axon's own build log names this as one of two bugs that silently killed
 * mobile conversions: the field required a colon and never said so, leaving the
 * submit button disabled with no explanation. So "8:10", "810", "8.10", "8 10"
 * and "8" all resolve here.
 */
export function parseTime(raw: string): { hour: number; minute: number } | null {
  const s = raw.trim();
  if (!s) return null;

  const m = s.match(/^(\d{1,2})\s*[:.\s]?\s*(\d{2})?$/);
  if (!m) return null;

  const hour = Number(m[1]);
  const minute = m[2] === undefined ? 0 : Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 1 || hour > 12) return null; // 12-hour clock, AM/PM is separate
  if (minute > 59) return null;
  return { hour, minute };
}

function to24h(hour12: number, meridiem: 'AM' | 'PM'): number {
  if (meridiem === 'AM') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

export function StartFlow() {
  const [step, setStep] = useState<0 | 1 | 2>(0);

  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [timeRaw, setTimeRaw] = useState('');
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>('AM');
  const [timeUnknown, setTimeUnknown] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      track(EVENTS.formStart);
    }
  }, []);

  const parsedTime = useMemo(() => parseTime(timeRaw), [timeRaw]);

  // Clamp the day list to the selected month, accounting for leap years.
  const daysInMonth = useMemo(() => {
    const m = Number(month);
    const y = Number(year);
    if (!m) return 31;
    if (!y) return m === 2 ? 29 : new Date(Date.UTC(2024, m, 0)).getUTCDate();
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }, [month, year]);

  useEffect(() => {
    if (day && Number(day) > daysInMonth) setDay('');
  }, [daysInMonth, day]);

  const step1Valid =
    Boolean(month && day && year && place) && (timeUnknown || parsedTime !== null);

  // Tell the user WHY the button is disabled — never leave it silently dead.
  const step1Blocker = !month
    ? 'Choose your birth month.'
    : !day
      ? 'Choose your birth day.'
      : !year
        ? 'Choose your birth year.'
        : !place
          ? 'Pick your birth place from the list.'
          : !timeUnknown && timeRaw.trim() === ''
            ? 'Enter your birth time, or tick that you don’t know it.'
            : !timeUnknown && parsedTime === null
              ? 'Time should look like 8:10 — hours between 1 and 12.'
              : null;

  const step2Valid = firstName.trim().length > 0 && /^\S+@\S+\.\S+$/.test(email.trim());

  async function submit() {
    if (!place || busy) return;
    setBusy(true);
    setError(null);

    const utm: Record<string, string> = {};
    new URLSearchParams(window.location.search).forEach((v, k) => {
      if (k.startsWith('utm_') || k === 'fbclid') utm[k] = v;
    });

    try {
      const res = await fetch('/api/chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          email: email.trim(),
          year: Number(year),
          month: Number(month),
          day: Number(day),
          hour: timeUnknown || !parsedTime ? null : to24h(parsedTime.hour, meridiem),
          minute: timeUnknown || !parsedTime ? null : parsedTime.minute,
          timeKnown: !timeUnknown,
          place: { label: place.label, lat: place.lat, lon: place.lon, timezone: place.timezone },
          utm: Object.keys(utm).length ? utm : null,
        }),
      });
      // A crashed route returns an HTML error page, and res.json() then throws
      // "The string did not match the expected pattern" — a browser internal
      // that tells the user nothing. Parse defensively and say something real.
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        throw new Error(
          json?.error ??
            'We could not reach the chart service. Check your connection and try again.',
        );
      }

      track(EVENTS.formComplete, { archetype: json.archetype });
      // Remember the email so the login page can pre-fill it — the user
      // already gave it, asking again is friction.
      try {
        localStorage.setItem('axon_email', email.trim());
        localStorage.setItem('axon_name', firstName.trim());
      } catch {}
      setStep(2);
      // Hold the reveal briefly — an instant result reads as a lookup table.
      // Into the full app shell, not the bare reveal page: the sidebar, ask
      // panel and locked surfaces are the product; /r/:id is only a shareable
      // permalink.
      //
      // A hard navigation, not router.push. This flow also runs inside a modal
      // on the landing page, and a client-side push leaves that overlay mounted
      // on top of the app with body scroll still locked. It also guarantees the
      // server reads the chart cookie that was set by the response above.
      setTimeout(() => window.location.assign('/chart'), 2200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  if (step === 2) return <Building firstName={firstName} />;

  return (
    <div className="mx-auto w-full max-w-card rounded-[20px] bg-[#faf8f0] p-7 shadow-[0_24px_60px_-24px_rgba(15,18,21,0.45)] sm:p-9">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ledger/[0.08] px-3 py-1.5">
          <span className="text-[11px] font-bold text-ledger-mid" aria-hidden>✓</span>
          <span className="font-mono text-[10px] uppercase tracking-label text-ledger">
            Computed using live NASA data
          </span>
        </span>

        <h1 className="mt-5 font-serif text-[30px] font-normal leading-tight sm:text-[34px]">
          {step === 0 ? "Let's read your chart" : 'Building your chart…'}
        </h1>
        <p className="mt-2 text-[15px] text-ink/62">
          {step === 0
            ? 'Your archetype, your timing, your blind spots. 60 seconds.'
            : 'Where should we send it?'}
        </p>

        <div className="mt-5 flex justify-center gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-[3px] w-8 rounded-full transition-colors duration-500 ${
                i <= step ? 'bg-ledger' : 'bg-ink/[0.14]'
              }`}
            />
          ))}
        </div>
      </div>

      <form
        className="mt-7"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 0 && step1Valid) setStep(1);
          else if (step === 1 && step2Valid) void submit();
        }}
      >
        {step === 0 && (
          <div className="space-y-5">
            <Field label="Date of birth">
              {/* Three selects, not a native date input: a mobile date picker
                  opens on the current year, which is brutal for a 1985 birth. */}
              <div className="grid grid-cols-3 gap-2">
                <select className="field" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Birth month">
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select className="field" value={day} onChange={(e) => setDay(e.target.value)} aria-label="Birth day">
                  <option value="">Day</option>
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <select className="field" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Birth year">
                  <option value="">Year</option>
                  {Array.from({ length: THIS_YEAR - 1919 }, (_, i) => THIS_YEAR - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label="Place of birth">
              <CityPicker value={place} onChange={setPlace} placeholder="City, Country" />
            </Field>

            <Field label="Time of birth">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  className="field disabled:opacity-40"
                  inputMode="numeric"
                  enterKeyHint="done"
                  placeholder="8:10"
                  value={timeRaw}
                  disabled={timeUnknown}
                  onChange={(e) => setTimeRaw(e.target.value)}
                  aria-label="Birth time"
                />
                <select
                  className="field w-24 disabled:opacity-40"
                  value={meridiem}
                  disabled={timeUnknown}
                  onChange={(e) => setMeridiem(e.target.value as 'AM' | 'PM')}
                  aria-label="AM or PM"
                >
                  <option>AM</option>
                  <option>PM</option>
                </select>
              </div>

              <label className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[15px] text-ink/75">
                <input
                  type="checkbox"
                  className="h-[18px] w-[18px] accent-[#22382d]"
                  checked={timeUnknown}
                  onChange={(e) => {
                    setTimeUnknown(e.target.checked);
                    if (e.target.checked) setTimeRaw('');
                  }}
                />
                I don&rsquo;t know my birth time
              </label>
              <p className="mt-2 text-center text-[13px] text-ink/45">
                Exact time sharpens your timing windows.
              </p>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Field label="First name">
              <input
                className="field"
                autoFocus
                autoComplete="given-name"
                enterKeyHint="next"
                placeholder="What should we call you?"
                value={firstName}
                maxLength={40}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Field>
            <Field label="Email">
              <input
                className="field"
                type="email"
                inputMode="email"
                autoComplete="email"
                enterKeyHint="go"
                placeholder="Where to send your reading"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-[3px] border border-oxblood/30 bg-oxblood/[0.06] px-4 py-3 text-sm text-oxblood">
            {error}
          </p>
        )}

        <button type="submit" disabled={step === 0 ? !step1Valid : !step2Valid || busy} className="cta cta-form mt-6 w-full">
          {step === 0 ? 'Calculate my chart' : busy ? 'Building…' : 'Claim my reading'}
          <span aria-hidden>→</span>
        </button>

        {/* Never leave the button silently dead. */}
        {step === 0 && step1Blocker && (
          <p className="mt-3 text-center text-[13px] text-ink/50">{step1Blocker}</p>
        )}

        {step === 1 && (
          <button
            type="button"
            onClick={() => setStep(0)}
            className="mt-3 w-full py-2 font-mono text-[11px] uppercase tracking-label text-ink/45 hover:text-ink"
          >
            ← Back
          </button>
        )}
      </form>

      <div className="mt-6 border-t pt-4 text-center rule">
        <p className="flex items-center justify-center gap-1.5 text-[13px] text-ink/55">
          <span className="font-bold text-ledger-mid" aria-hidden>✓</span> Your data is never sold
        </p>
        <p className="mt-1 text-[12px] text-ink/40">
          <a href="/legal/terms" className="inline-block px-2 py-3.5 underline underline-offset-2">Terms</a>
          &amp;
          <a href="/legal/privacy" className="inline-block px-2 py-3.5 underline underline-offset-2">Privacy</a>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10.5px] uppercase tracking-label text-ink/55">{label}</p>
      {children}
    </div>
  );
}

const STAGES = [
  'Resolving your birth moment…',
  'Locating your Sun, Moon, and Rising…',
  'Placing the twelve houses…',
  'Reading the aspects between them…',
  'Reducing your Life Path number…',
  'Drawing your archetype…',
];

/**
 * Rotating facts under the progress bar.
 *
 * The wait is only a couple of seconds, but an empty one feels like a stall.
 * These are the same three proofs the landing page sells on, so the wait keeps
 * making the argument rather than pausing it.
 */
const WAIT_FACTS = [
  'Augustus minted his chart on Roman silver. Yours takes 60 seconds.',
  'J.P. Morgan kept an astrologer on retainer from 1899. You get this instantly.',
  'Reagan\u2019s White House cleared major decisions against a chart for 7 years.',
];

function Building({ firstName }: { firstName: string }) {
  const [stage, setStage] = useState(0);
  const [fact, setFact] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      430,
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setFact((f) => (f + 1) % WAIT_FACTS.length), 2600);
    return () => clearInterval(t);
  }, []);

  // The bar tracks the real stage rather than animating on a timer, so it
  // never sits at 100% while work is still happening.
  const pct = Math.round(((stage + 1) / STAGES.length) * 94);

  return (
    <div
      className="mx-auto w-full max-w-card rounded-[20px] bg-[#faf8f0] p-7 text-center shadow-[0_24px_60px_-24px_rgba(15,18,21,0.45)] sm:p-9"
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-ledger/[0.08] px-3 py-1.5">
        <span className="text-[11px] font-bold text-ledger-mid" aria-hidden>✓</span>
        <span className="font-mono text-[10px] uppercase tracking-label text-ledger">
          Computed using live NASA data
        </span>
      </span>

      <h1 className="mt-5 font-serif text-[30px] font-normal leading-tight sm:text-[34px]">
        Building your chart…
      </h1>
      <p className="mt-2 text-[15px] text-ink/62">
        Cross-referencing your exact birth data.
      </p>

      {/* Same three-segment step marker as the form, now fully lit. */}
      <div className="mt-6 flex items-center justify-center gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-[3px] w-7 rounded-full bg-ledger-mid" />
        ))}
      </div>

      {/* The Mercury sigil, drawn rather than spun — a spinner reads as
          "waiting", the mark reads as "working". */}
      <svg
        viewBox="0 0 24 24"
        className="mx-auto mt-9 h-[72px] w-[72px] animate-drawing-pulse text-ledger-mid"
        fill="none"
        aria-hidden
      >
        <circle cx="12" cy="10" r="4.2" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M12 14.2v6M9 17.6h6M8.6 4.2a4.6 4.6 0 006.8 0"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>

      <p key={stage} className="mt-8 animate-fade-up font-mono text-[13px] tracking-[0.02em] text-ink/62">
        {STAGES[stage]}
      </p>

      <div className="mt-4 h-[6px] w-full overflow-hidden rounded-full bg-bone/60">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #2f7050, #4e9c72)',
          }}
        />
      </div>

      <p
        key={fact}
        className="mt-4 min-h-[42px] animate-fade-up font-mono text-[12.5px] leading-[1.6] text-ink/45"
      >
        {WAIT_FACTS[fact]}
      </p>

      <div className="mt-6 border-t pt-5 rule">
        <p className="flex items-center justify-center gap-1.5 text-[14px] text-ink/62">
          <span className="font-bold text-ledger-mid" aria-hidden>✓</span>
          Your data is never sold
        </p>
        <p className="mt-2 text-[13px] text-ink/45">
          <a href="/legal/terms" className="underline underline-offset-2">Terms</a>
          {' & '}
          <a href="/legal/privacy" className="underline underline-offset-2">Privacy</a>
        </p>
      </div>
    </div>
  );
}
