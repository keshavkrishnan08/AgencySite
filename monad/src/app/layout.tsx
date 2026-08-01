import type { Metadata, Viewport } from 'next';
import { Fraunces, IBM_Plex_Mono, Inter } from 'next/font/google';
import './globals.css';
import { Analytics } from '@/components/Analytics';
import { BRAND } from '@/lib/brand';

/**
 * Fraunces at large sizes is the entire visual signature.
 *
 * Loaded as the VARIABLE font with the optical-size axis, which is what the
 * reference does. Requesting static weights instead drops `opsz`, and Fraunces
 * pinned to one optical size renders thick and low-contrast at 80px — the
 * single biggest reason a copy of this design looks subtly wrong.
 */
const serif = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.domain),
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description:
    'Learn exactly how to succeed in business based on your chart: your founder archetype, the business that fits you, your strengths, your blind spots, and when to make decisions.',
  openGraph: {
    title: `${BRAND.name} · ${BRAND.tagline}`,
    description: 'Find the business you were built for. 60 seconds, no card required.',
    url: BRAND.domain,
    siteName: BRAND.name,
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#f2ede3',
  width: 'device-width',
  initialScale: 1,
  // Never disable zoom — it fails accessibility and iOS ignores it anyway.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">
        {/* First tab stop: lets a keyboard or screen-reader user jump past the
            nav and announcement bar straight into the page. */}
        <a href="#main" className="skip-link">Skip to content</a>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
