import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://axon-ops.vercel.app"),
  title: "Axon — AI Operations For Your Business",
  description:
    "We install daily-running AI operations systems for small businesses. Every lead followed up. Every review answered. Every email handled. Starting in two weeks.",
  openGraph: {
    title: "Axon — AI Operations For Your Business",
    description:
      "We install daily-running AI operations systems for small businesses. Every lead followed up. Every review answered. Every email handled. Starting in two weeks.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Axon",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-axonBg text-axonText">
        {children}
      </body>
    </html>
  );
}
