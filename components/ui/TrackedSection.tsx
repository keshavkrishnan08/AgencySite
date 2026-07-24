"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { track } from "@/lib/analytics";

/* Wrap a landing-page section to learn whether anyone actually saw it, and how
   long they stayed with it. On a page you're buying traffic to, "which section
   do people reach before they leave" is the single most useful layout signal
   you can get, and it's invisible in pageview-only analytics. */
export function TrackedSection({
  name,
  children,
  threshold = 0.4,
}: {
  name: string;
  children: ReactNode;
  threshold?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const enteredAt = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          enteredAt.current = Date.now();
          if (!seen.current) {
            seen.current = true;
            track("section:view", { section: name, path: window.location.pathname });
          }
        } else if (enteredAt.current) {
          const dwell = Math.round((Date.now() - enteredAt.current) / 1000);
          enteredAt.current = 0;
          // Only report meaningful dwell; a fast scroll past isn't a read.
          if (dwell >= 2) track("section:dwell", { section: name, seconds: dwell });
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [name, threshold]);

  return <div ref={ref}>{children}</div>;
}

/** Click helper: `onClick={trackClick("hero_cta", { plan: "quarterly" })}`. */
export function trackClick(label: string, props: Record<string, unknown> = {}) {
  return () => track("ui:click", { label, path: typeof window !== "undefined" ? window.location.pathname : "", ...props });
}
