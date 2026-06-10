/* Role-aware salary range estimate so the negotiation practice is custom to the
   customer's actual job, not a hardcoded number. Heuristic bands by role family
   + seniority — a sensible starting point the user can edit. */

interface Band {
  low: number;
  high: number;
}

// midpoint base bands by role family (USD, full-time)
const FAMILIES: [RegExp, Band][] = [
  [/(chief|ceo|cfo|coo|cto|vp|vice president|head of)/i, { low: 150000, high: 240000 }],
  [/(director|principal)/i, { low: 120000, high: 175000 }],
  [/(physician|doctor|attorney|lawyer|pharmacist)/i, { low: 110000, high: 180000 }],
  [/(engineer|developer|programmer|data scientist|architect)/i, { low: 95000, high: 160000 }],
  [/(registered nurse|\brn\b|nurse practitioner)/i, { low: 70000, high: 105000 }],
  [/(manager|supervisor|lead|controller)/i, { low: 70000, high: 115000 }],
  [/(accountant|analyst|engineer i|designer|marketer|recruiter)/i, { low: 60000, high: 95000 }],
  [/(nurse|teacher|therapist|paralegal|specialist)/i, { low: 52000, high: 80000 }],
  [/(sales|account executive|representative|rep\b)/i, { low: 50000, high: 90000 }],
  [/(coordinator|assistant|associate|administrator|office manager|clerk)/i, { low: 45000, high: 68000 }],
  [/(entry|intern|junior|trainee)/i, { low: 38000, high: 55000 }],
];

const SENIORITY: [RegExp, number][] = [
  [/(senior|sr\.?|lead|principal|staff)/i, 1.18],
  [/(junior|jr\.?|entry|associate|assistant|intern|trainee)/i, 0.85],
];

const round = (n: number) => Math.round(n / 1000) * 1000;
const fmt = (n: number) => "$" + round(n).toLocaleString("en-US");

export interface SalaryEstimate {
  low: number;
  high: number;
  range: string;     // "$X,000–$Y,000"
  target: number;    // aim near the top
  walkaway: number;  // floor
}

export function suggestSalaryRange(role: string): SalaryEstimate {
  const r = (role || "").toLowerCase();
  let band: Band = { low: 55000, high: 80000 }; // sensible default
  for (const [re, b] of FAMILIES) {
    if (re.test(r)) { band = b; break; }
  }
  let mult = 1;
  for (const [re, m] of SENIORITY) {
    if (re.test(r)) { mult = m; break; }
  }
  const low = round(band.low * mult);
  const high = round(band.high * mult);
  // target: 75% of the way up the band; walkaway: the floor.
  const target = round(low + (high - low) * 0.75);
  return { low, high, range: `${fmt(low)}–${fmt(high)}`, target, walkaway: low };
}
