"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/* Hover/focus popover for inline advice. Hover an icon → it expands. */
export function InfoTip({
  title,
  children,
  className,
  iconSize = 15,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  iconSize?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        aria-label={title || "More info"}
        className={cn(
          "inline-grid place-items-center rounded-full text-ink-3 transition-colors hover:text-primary focus:outline-none focus-visible:text-primary",
          className
        )}
      >
        <Info size={iconSize} />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-60 max-w-[min(16rem,78vw)] origin-bottom -translate-x-1/2 animate-scale-in rounded-xl border bg-white p-3.5 text-left shadow-lg"
          style={{ borderColor: "var(--border)" }}
        >
          {title && <span className="mb-1 block text-sm font-semibold text-ink">{title}</span>}
          <span className="block text-[0.82rem] leading-relaxed text-ink-2">{children}</span>
          <span
            className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r bg-white"
            style={{ borderColor: "var(--border)" }}
          />
        </span>
      )}
    </span>
  );
}
