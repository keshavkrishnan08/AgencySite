import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        axonBg: "#FAFAFA",
        axonText: "#111827",
        axonMuted: "#6B7280",
        axonBlue: "#0284C7",
        axonBlueDark: "#075985",
        axonSurface: "#FFFFFF",
        axonBorder: "#E5E7EB",
        axonTint: "#F0F9FF",
      },
      letterSpacing: {
        tighterHero: "-0.035em",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px -2px rgba(0,0,0,0.06), 0 24px 48px -8px rgba(2,132,199,0.07)",
        cardHover: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.08), 0 32px 64px -8px rgba(2,132,199,0.12)",
        stat: "0 2px 4px rgba(0,0,0,0.03), 0 12px 40px -8px rgba(2,132,199,0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
        glow: "0 0 40px -6px rgba(2,132,199,0.30), 0 4px 16px -4px rgba(2,132,199,0.25)",
        inner: "inset 0 2px 4px rgba(0,0,0,0.04)",
        lifted: "0 1px 3px rgba(0,0,0,0.06), 0 20px 60px -12px rgba(0,0,0,0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
