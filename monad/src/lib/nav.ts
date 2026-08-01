/** Breadcrumb labels for the app shell, keyed by route prefix. */
export const NAV_LABELS: Record<string, string> = {
  '/updates': 'Updates',
  '/chart': 'My Chart',
  '/timing': 'Timing',
  '/settings': 'Settings',
};

export function navLabel(pathname: string): string {
  const hit = Object.keys(NAV_LABELS).find(
    (k) => pathname === k || pathname.startsWith(`${k}/`),
  );
  return hit ? NAV_LABELS[hit] : 'Axon';
}
