"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LineChart, Mic, Wand2, LogOut, LayoutDashboard, Briefcase, SlidersHorizontal, Settings, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
}

const MAIN: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/practice", label: "Practice", icon: Mic },
  { href: "/job", label: "Job Breakdown", icon: Briefcase },
  { href: "/analytics", label: "Analytics", icon: LineChart },
];

const TOOLS: Item[] = [
  { href: "/prep", label: "Prep tools", icon: Wand2 },
];

/* Hover-expand navigation rail. Collapsed to an icon strip; widens on hover to
   reveal labels. Desktop only (lg+); the top bar carries mobile. */
export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { configured, user, signOut } = useAuth();

  const Row = ({ item }: { item: Item }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        title={item.label}
        className={cn(
          "group/row relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
          active ? "bg-primary-soft text-primary-ink" : "text-ink-2 hover:bg-bg-tint hover:text-ink"
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
        )}
        <Icon size={20} className="shrink-0" />
        <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <aside className="group fixed inset-y-0 left-0 z-50 hidden w-[76px] flex-col overflow-hidden border-r bg-surface transition-[width] duration-200 ease-out hover:w-60 hover:shadow-2xl lg:flex"
      style={{ borderColor: "var(--border)" }}
    >
      {/* brand */}
      <Link href="/dashboard" className="flex h-16 items-center gap-2.5 px-[18px]">
        <LogoMark size={30} />
        <span className="whitespace-nowrap font-serif text-lg font-semibold tracking-tight text-ink opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Axon <span className="text-primary-ink">Careers</span>
        </span>
      </Link>

      <div className="hairline mx-3" />

      {/* main nav */}
      <nav className="flex flex-col gap-1 px-3 pt-3">
        {MAIN.map((i) => (
          <Row key={i.href} item={i} />
        ))}
      </nav>

      <div className="hairline mx-3 my-3" />

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {TOOLS.map((i) => (
          <Row key={i.href} item={i} />
        ))}
      </nav>

      {/* footer: preferences + account */}
      <div className="mt-auto flex flex-col gap-1 border-t px-3 py-3" style={{ borderColor: "var(--border)" }}>
        <Row item={{ href: "/preferences", label: "Preferences", icon: SlidersHorizontal }} />
        <Row item={{ href: "/settings", label: "Settings", icon: Settings }} />
        {configured && user && (
          <button
            onClick={async () => { await signOut(); router.push("/"); }}
            title="Sign out"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-ink-2 transition-colors hover:bg-bg-tint hover:text-ink"
          >
            <LogOut size={20} className="shrink-0" />
            <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Sign out
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
