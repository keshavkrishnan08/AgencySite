"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

/* Nav for the ad landing page. Same chrome as the marketing site, minus every
   way out: no sign-in, no "get started". On a paid landing page there is
   exactly one action, and every other link is a leak. */

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#proof", label: "Results" },
  { href: "#pricing", label: "Pricing" },
];

export function PresaleNav() {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass border-b" style={{ borderColor: "var(--border)" }}>
        <nav className="container-wide flex h-16 items-center justify-between gap-4">
          {/* No link: on a paid page the logo is another way out. */}
          <Logo href={null} />
          <div className="hidden items-center gap-1 sm:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <span className="rounded-full bg-gold-soft px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-gold-ink">
            Opening soon
          </span>
        </nav>
      </div>
    </header>
  );
}
