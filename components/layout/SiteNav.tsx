"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { StartFreeButton } from "@/components/ui/StartFreeButton";
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
          {/* One action, no "Sign in". Returning customers are routed straight
              into the app by StartFreeButton, so a second link would only be a
              fork in the road nobody needs. */}
          <div className="flex items-center gap-2">
            <StartFreeButton size="sm" source="nav" showArrow={false} />
          </div>
        </nav>
      </div>
    </header>
  );
}
