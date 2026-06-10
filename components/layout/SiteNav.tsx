"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#proof", label: "Results" },
  { href: "#pricing", label: "Pricing" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div
        className={cn(
          "transition-all duration-300",
          scrolled ? "glass border-b shadow-sm" : "border-b border-transparent"
        )}
        style={{ borderColor: scrolled ? "var(--border)" : "transparent" }}
      >
        <nav className="container-wide flex h-16 items-center justify-between">
          <Logo />
          <div className="hidden items-center gap-8 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-ink-2 transition-colors hover:text-ink"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/signin"
              className="hidden text-sm font-medium text-ink-2 transition-colors hover:text-ink sm:inline-flex px-3 py-2"
            >
              Sign in
            </Link>
            <ButtonLink href="/onboarding" size="sm">
              Get started
            </ButtonLink>
          </div>
        </nav>
      </div>
    </header>
  );
}
