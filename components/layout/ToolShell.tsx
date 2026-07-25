"use client";

import { useEffect } from "react";
import type { ComponentType } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { track } from "@/lib/analytics";

export function ToolShell({
  icon: Icon,
  title,
  description,
  badge,
  children,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
}) {
  // Access is gated once at the app shell. Inside the tools there's no pay
  // prompt — anyone here is already a subscriber (or in local/demo mode).
  useEffect(() => {
    track("tool_opened", { tool: title });
  }, [title]);

  return (
    <AppShell>
      <main className="container-content py-10 sm:py-12">
        <div className="mb-8 text-center">
          <span
            className="relative mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-[22px] text-white shadow-glow ring-1 ring-white/40"
            style={{
              background:
                "radial-gradient(90% 90% at 24% 16%, rgba(255,255,255,0.42), transparent 44%), linear-gradient(145deg, var(--primary-bright), var(--primary-ink))",
            }}
          >
            <span className="absolute -right-3 -top-3 h-9 w-9 rounded-full bg-white/15 blur-sm" aria-hidden />
            <span className="absolute inset-x-3 top-1.5 h-px bg-white/45" aria-hidden />
            <Icon size={28} />
          </span>
          {badge && (
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-gold-ink">
              ⭐ {badge}
            </span>
          )}
          <h1 className="mt-3 font-serif text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-prose text-ink-2">{description}</p>
        </div>

        {children}
      </main>
    </AppShell>
  );
}
