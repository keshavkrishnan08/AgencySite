import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from "@/lib/auth";
import { MetaPixel } from "@/components/MetaPixel";
import { Telemetry } from "@/components/Telemetry";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// The dedicated DATA typeface: numbers, KPIs, chart labels. Inter — a clean
// grotesque with excellent tabular figures, the Stripe/fintech data look —
// distinct from the Hanken Grotesk body sans.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://axoncareers.com"),
  title: {
    default: "Axon Careers, You're more ready than you think.",
    template: "%s · Axon Careers",
  },
  description:
    "An AI mock interview coach for career changers, returning professionals, and job seekers. Practice privately, get scored on five dimensions, and watch your confidence climb. From 56¢ a day.",
  keywords: [
    "interview practice",
    "mock interview",
    "AI interview coach",
    "career change",
    "returning to work",
    "interview anxiety",
    "STAR method",
  ],
  authors: [{ name: "Keshav Krishnan" }],
  openGraph: {
    title: "Axon Careers, You're more ready than you think.",
    description:
      "Practice interviews privately with AI. See exactly where you stand. Walk in knowing your answers are good enough.",
    type: "website",
    siteName: "Axon Careers",
  },
  twitter: {
    card: "summary_large_image",
    title: "Axon Careers, You're more ready than you think.",
    description:
      "Practice interviews privately with AI. See exactly where you stand. Walk in ready.",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hanken.variable} ${inter.variable}`}
    >
      <body>
        <MetaPixel />
        <Telemetry />
        <AuthProvider>{children}</AuthProvider>
        {/* Vercel Web Analytics + Core Web Vitals. Both no-op locally and cost
            nothing to keep mounted; on the ad landing page they're the
            first-party pageview/traffic source of truth. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
