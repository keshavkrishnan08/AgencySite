import { randomBytes, randomUUID } from 'node:crypto';
import type { ChartRow } from './charts';
import type { ReadingSection } from './sections';

/**
 * Last-resort in-process store for charts that could not be persisted.
 *
 * This exists so a database outage — or a deploy missing its service-role key —
 * costs the visitor nothing at the moment of highest intent: the chart is pure
 * mathematics and needs no database to be correct, so refusing to show it would
 * be throwing away the conversion for an infrastructure reason.
 *
 * It is explicitly EPHEMERAL. Rows live in one server process, vanish on
 * restart, and are capped. Nothing here is a substitute for the database, and
 * `persisted: false` travels with the row so callers can say so honestly.
 */

const MAX_ROWS = 500;
const TTL_MS = 6 * 60 * 60 * 1000;

interface Entry {
  row: ChartRow;
  sections: ReadingSection[] | null;
  storedAt: number;
}

/**
 * Pinned to globalThis, NOT a plain module-level const.
 *
 * Next.js compiles route handlers and pages into separate bundles, so a
 * module-scoped Map gives each entry point its own copy: the chart written by
 * POST /api/chart was invisible to GET /r/[id], and the reveal page 404'd.
 * This is the same singleton pattern the Prisma client needs, for the same
 * reason. It also survives dev hot reloads.
 */
const globalStore = globalThis as unknown as { __axonEphemeralCharts?: Map<string, Entry> };
const store: Map<string, Entry> = (globalStore.__axonEphemeralCharts ??= new Map());

function sweep() {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, e] of store) if (e.storedAt < cutoff) store.delete(id);
  // Oldest-first eviction if we are still over the cap.
  while (store.size > MAX_ROWS) {
    const oldest = [...store.entries()].sort((a, b) => a[1].storedAt - b[1].storedAt)[0];
    if (!oldest) break;
    store.delete(oldest[0]);
  }
}

type NewChart = Omit<ChartRow, 'id' | 'access_token' | 'created_at'>;

export function rememberChart(row: NewChart): ChartRow {
  const full: ChartRow = {
    ...row,
    id: randomUUID(),
    access_token: randomBytes(24).toString('hex'),
    created_at: new Date().toISOString(),
  };
  store.set(full.id, { row: full, sections: null, storedAt: Date.now() });
  sweep();
  return full;
}

/** Token-checked, exactly like the database path. An id alone is never enough. */
export function recallChart(id: string, token?: string): ChartRow | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (token && entry.row.access_token !== token) return null;
  return entry.row;
}

export function rememberSections(chartId: string, sections: ReadingSection[]) {
  const entry = store.get(chartId);
  if (entry) entry.sections = sections;
}

export function recallSections(chartId: string): ReadingSection[] | null {
  return store.get(chartId)?.sections ?? null;
}

export function isEphemeral(id: string): boolean {
  return store.has(id);
}
