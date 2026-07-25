"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { cn } from "@/lib/utils";
import { getProfile, getStreak, isPremium, onStoreChange } from "@/lib/store";

/* The overview (Dashboard), the one thing to do (Practice), the deep numbers
   (Analytics), and the two builders that feed the practice loop. */
const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/analytics", label: "Analytics" },
  { href: "/tools/question-predictor", label: "Question Predictor" },
  { href: "/tools/gap-story", label: "Gap Story" },
];

export function AppNav({ minimal = false }: { minimal?: boolean }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [premium, setPremium] = useState(false);
  const [name, setName] = useState("");
  const [streak, setStreak] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  // close the mobile menu on navigation
  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      const p = getProfile();
      setPremium(isPremium());
      setName(p.name || p.email || "");
      setStreak(getStreak().current);
    };
    sync();
    return onStoreChange(sync);
  }, []);

  const initial = (name || "Y").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass border-b shadow-sm" style={{ borderColor: "var(--border)" }}>
        <nav className="container-wide flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3 lg:gap-7">
            {/* Mobile menu toggle — the sidebar is desktop-only, so this is the
                only in-app navigation on phones. */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-lg text-ink-2 hover:bg-bg-tint lg:hidden"
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <Logo className={cn(minimal && "lg:hidden")} />
            <div className={cn("hidden items-center gap-1 lg:flex", minimal && "lg:hidden")}>
              {NAV.map((l) => {
                const active = pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                      active ? "bg-primary-soft text-primary-ink" : "text-ink-2 hover:text-ink"
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {mounted && streak > 0 && (
              <span className="hidden items-center gap-1.5 rounded-full bg-amber-soft px-3 py-1.5 text-sm font-semibold text-amber-ink sm:inline-flex">
                <Flame size={15} className="fill-amber text-amber" />
                {streak}
              </span>
            )}
            {mounted && !premium && (
              <ButtonLink href="/upgrade" variant="gold" size="sm" className="hidden sm:inline-flex">
                Upgrade
              </ButtonLink>
            )}
            {mounted && premium && <PremiumBadge className="hidden sm:inline-flex" />}
            <Link
              href="/settings"
              className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white shadow-sm"
              style={{ background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))" }}
              aria-label="Account settings"
            >
              {mounted ? initial : "Y"}
            </Link>
          </div>
        </nav>

        {/* Mobile nav panel (phones/tablets) */}
        {mobileOpen && (
          <div className="border-t lg:hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="container-wide flex max-h-[70vh] flex-col gap-1 overflow-y-auto py-3">
              {NAV.map((l) => {
                const active = pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn("rounded-xl px-4 py-3 text-base font-medium", active ? "bg-primary-soft text-primary-ink" : "text-ink-2")}
                  >
                    {l.label}
                  </Link>
                );
              })}
              {mounted && !premium && (
                <ButtonLink href="/upgrade" variant="gold" className="mt-3" onClick={() => setMobileOpen(false)}>
                  Upgrade to Premium
                </ButtonLink>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
