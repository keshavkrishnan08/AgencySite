import type { Metadata } from "next";

// The brand kit is unlisted: no nav link and noindex, so it isn't surfaced to
// users or search engines. It stays reachable by direct URL for our own use.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
