"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { track } from "@/lib/analytics";
import { initMixpanel } from "@/lib/mixpanel";

/* Automatic page-level telemetry.
 *
 * Mounted once in the root layout, so every route gets the same treatment
 * without anyone remembering to instrument it:
 *
 *   page:view      every route change, with the referring route
 *   scroll:depth   25 / 50 / 75 / 100%, once each per page
 *   engage:tick    10s, 30s, 60s, 120s of *active* time (tab visible)
 *   page:exit      on leave, with active seconds and max scroll
 *
 * Active time only counts while the tab is visible, so a page left open in a
 * background tab overnight doesn't report as world-class engagement.
 */

const DEPTHS = [25, 50, 75, 100];
const TICKS = [10, 30, 60, 120];

function TelemetryInner() {
  const pathname = usePathname();
  const search = useSearchParams();

  // Initialise Mixpanel on first paint, so autocapture starts recording clicks
  // and inputs immediately — before the first named event fires.
  useEffect(() => {
    initMixpanel();
  }, []);

  const prevPath = useRef<string | null>(null);
  const startedAt = useRef(0);
  const activeMs = useRef(0);
  const lastResume = useRef(0);
  const maxDepth = useRef(0);
  const firedDepths = useRef<Set<number>>(new Set());
  const firedTicks = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!pathname) return;

    // ---- flush the page we're leaving ----
    const flush = () => {
      if (!prevPath.current || !startedAt.current) return;
      const active = Math.round((activeMs.current + (lastResume.current ? Date.now() - lastResume.current : 0)) / 1000);
      track("page:exit", {
        path: prevPath.current,
        activeSeconds: active,
        maxScrollDepth: maxDepth.current,
      });
    };
    flush();

    // ---- start the new page ----
    const from = prevPath.current;
    prevPath.current = pathname;
    startedAt.current = Date.now();
    activeMs.current = 0;
    lastResume.current = document.visibilityState === "visible" ? Date.now() : 0;
    maxDepth.current = 0;
    firedDepths.current = new Set();
    firedTicks.current = new Set();

    track("page:view", {
      path: pathname,
      query: search?.toString()?.slice(0, 200) || "",
      from: from || "(entry)",
    });

    // ---- scroll depth ----
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const pct = scrollable <= 0 ? 100 : Math.round((window.scrollY / scrollable) * 100);
      if (pct > maxDepth.current) maxDepth.current = Math.min(100, pct);
      for (const d of DEPTHS) {
        if (maxDepth.current >= d && !firedDepths.current.has(d)) {
          firedDepths.current.add(d);
          track("scroll:depth", { path: pathname, depth: d });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // short pages are "fully read" immediately

    // ---- active-time ticks ----
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const active = Math.round((activeMs.current + (lastResume.current ? Date.now() - lastResume.current : 0)) / 1000);
      for (const t of TICKS) {
        if (active >= t && !firedTicks.current.has(t)) {
          firedTicks.current.add(t);
          track("engage:tick", { path: pathname, seconds: t });
        }
      }
    }, 2000);

    // ---- visibility accounting ----
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        lastResume.current = Date.now();
      } else if (lastResume.current) {
        activeMs.current += Date.now() - lastResume.current;
        lastResume.current = 0;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // A real close/refresh never triggers the route effect, so catch it here.
    window.addEventListener("pagehide", flush);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
    // search is intentionally included: a query-string change is a new context
    // for an ad landing page (different creative, different campaign).
  }, [pathname, search]);

  return null;
}

export function Telemetry() {
  // useSearchParams needs a Suspense boundary to avoid opting whole routes
  // into client-side rendering.
  return (
    <Suspense fallback={null}>
      <TelemetryInner />
    </Suspense>
  );
}
