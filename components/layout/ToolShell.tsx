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
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-8">
          {badge && (
            <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-gold-ink">
              ⭐ {badge}
            </span>
          )}
          <h1 className="flex items-center gap-3 font-serif text-3xl font-semibold text-ink sm:text-4xl">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "var(--primary-soft)" }}>
              <Icon size={20} className="text-primary-ink" />
            </span>
            {title}
          </h1>
          <p className="mt-2 max-w-prose text-ink-2">{description}</p>
        </div>

        {children}
      </main>
    </AppShell>
  );
}
