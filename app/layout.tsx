import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { MetaPixel } from "@/components/MetaPixel";

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

const jetbrains = JetBrains_Mono({
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
    "An AI mock interview coach for career changers, returning professionals, and job seekers. Practice privately, get scored on five dimensions, and watch your confidence climb. For $9.99/month.",
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
      className={`${fraunces.variable} ${hanken.variable} ${jetbrains.variable}`}
    >
      <body>
        <MetaPixel />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
