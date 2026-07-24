"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PresaleForm } from "./PresaleForm";

/* The StickyCTA from the marketing site, with the email form in place of the
   link out. Appears once they've read enough to care. */
export function PresaleSticky() {
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
        <div
          className="glass mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-2xl border px-5 py-3.5 shadow-xl"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="hidden shrink-0 sm:block">
            <p className="font-serif text-base font-semibold text-ink">Your next interview is coming.</p>
            <p className="text-xs text-ink-2">Founding-member pricing for the first list.</p>
          </div>
          <div className="flex flex-1 items-center gap-1">
            <PresaleForm source="sticky" cta="Get access" className="flex-1" />
            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 self-start rounded-full p-2 text-ink-3 transition-colors hover:bg-bg-tint hover:text-ink"
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
