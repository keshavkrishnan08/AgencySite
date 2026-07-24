"use client";

import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { StartFreeButton } from "@/components/ui/StartFreeButton";

export function StickyCTA() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 800);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (dismissed) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 transition-all duration-500 ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <div className="container-wide pb-4">
        <div className="glass mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-2xl border px-5 py-3.5 shadow-xl" style={{ borderColor: "var(--border)" }}>
          <div className="hidden sm:block">
            <p className="font-serif text-base font-semibold text-ink">Your next interview is coming.</p>
            <p className="text-xs text-ink-2">From $16.66/mo · cancel anytime.</p>
          </div>
          <p className="text-sm font-medium text-ink sm:hidden">Start for free</p>
          <div className="flex items-center gap-1">
<StartFreeButton size="sm" source="sticky" className="whitespace-nowrap" />
            <button
              onClick={() => setDismissed(true)}
              className="rounded-full p-2 text-ink-3 transition-colors hover:bg-bg-tint hover:text-ink"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
