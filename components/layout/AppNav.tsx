"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Menu, X, Settings } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import { getStreak, onStoreChange } from "@/lib/store";

/* The overview (Dashboard), the one thing to do (Practice), the deep numbers
   (Analytics), and the two builders that feed the practice loop. */
const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/analytics", label: "Analytics" },
  { href: "/job", label: "Job Breakdown" },
  { href: "/prep", label: "Prep tools" },
  { href: "/preferences", label: "Preferences" },
];

export function AppNav({ minimal = false }: { minimal?: boolean }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  // close the mobile menu on navigation
  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    setMounted(true);
    const sync = () => setStreak(getStreak().current);
    sync();
    return onStoreChange(sync);
  }, []);

  return (
    // In minimal (in-app) mode the sidebar is the desktop nav, so the top bar is
    // only needed on mobile — hide it on lg+ so nothing hangs above the content.
    <header className={cn("sticky top-0 z-50 w-full", minimal && "lg:hidden")}>
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
            <Link
              href="/settings"
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-bg-tint hover:text-ink"
              aria-label="Settings"
            >
              <Settings size={18} />
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
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
