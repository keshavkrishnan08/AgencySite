"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { isPremium } from "@/lib/store";
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
  const [mounted, setMounted] = useState(false);
  const [premium, setPremium] = useState(true);
  useEffect(() => {
    setMounted(true);
    setPremium(isPremium());
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

        {mounted && !premium && (
          <div
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 px-5 py-3"
            style={{ borderColor: "var(--gold)", background: "var(--gold-soft)" }}
          >
            <p className="flex items-center gap-2 text-sm text-gold-ink">
              <Sparkles size={15} /> You&apos;re on the free plan. Premium unlocks unlimited use of every tool.
            </p>
            <ButtonLink href="/upgrade" variant="gold" size="sm">
              Upgrade <ArrowRight size={14} />
            </ButtonLink>
          </div>
        )}

        {children}
      </main>
    </AppShell>
  );
}
