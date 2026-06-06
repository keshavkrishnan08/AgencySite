"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Flame } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { cn } from "@/lib/utils";
import { getProfile, getStreak, isPremium, onStoreChange } from "@/lib/store";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/plan", label: "My Plan" },
  { href: "/interview-day", label: "Interview Day" },
];

const TOOLS = [
  { href: "/tools/gap-story", label: "Gap Story Builder", emoji: "🌱" },
  { href: "/tools/company-research", label: "Company Briefing", emoji: "🔍" },
  { href: "/tools/question-predictor", label: "Question Predictor", emoji: "🔮" },
  { href: "/tools/salary", label: "Salary Practice", emoji: "💬" },
  { href: "/tools/debrief", label: "Post-Interview Debrief", emoji: "📝" },
  { href: "/tools/your-story", label: "Your Story Builder", emoji: "✨" },
  { href: "/tools/tracker", label: "Interview Tracker", emoji: "📅" },
];

export function AppNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [premium, setPremium] = useState(false);
  const [name, setName] = useState("");
  const [streak, setStreak] = useState(0);
  const [toolsOpen, setToolsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setToolsOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initial = (name || "Y").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass border-b shadow-sm" style={{ borderColor: "var(--border)" }}>
        <nav className="container-wide flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-7">
            <Logo />
            <div className="hidden items-center gap-1 lg:flex">
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
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setToolsOpen((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    pathname.startsWith("/tools") ? "bg-primary-soft text-primary-ink" : "text-ink-2 hover:text-ink"
                  )}
                >
                  Tools
                  <ChevronDown size={15} className={cn("transition-transform", toolsOpen && "rotate-180")} />
                </button>
                {toolsOpen && (
                  <div
                    className="absolute left-0 top-12 w-64 animate-scale-in rounded-xl border bg-white p-2 shadow-lg"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {TOOLS.map((t) => (
                      <Link
                        key={t.href}
                        href={t.href}
                        onClick={() => setToolsOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-bg-tint hover:text-ink"
                      >
                        <span className="text-base">{t.emoji}</span>
                        {t.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
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
      </div>
    </header>
  );
}
