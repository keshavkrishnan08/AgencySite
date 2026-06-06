"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
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
    <>
      <AppNav />
      <main className="container-content py-10 sm:py-12">
        <div className="mb-8 text-center">
          <span
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white shadow-sm"
            style={{ background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))" }}
          >
            <Icon size={24} />
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
    </>
  );
}
