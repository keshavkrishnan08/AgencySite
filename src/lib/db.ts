/**
 * Wrapper for reads whose result is an optimisation rather than a requirement.
 *
 * A page that renders a cached row must degrade to "no cached row" when the
 * store is unreachable, not 500 the whole screen. Writes do not use this —
 * there, failing loudly is correct.
 */
export async function cached<T>(
  run: () => PromiseLike<{ data: T | null }>,
): Promise<{ data: T | null }> {
  try {
    return await run();
  } catch {
    return { data: null };
  }
}
