"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function AnimatedNumber({
  value,
  duration = 1200,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  startOnView = true,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  startOnView?: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  // The value we last animated to. When `value` changes (live store updates,
  // navigating session→session), re-animate from the current display rather
  // than freezing on the first render's number.
  const fromRef = useRef(0);

  useEffect(() => {
    const run = () => {
      started.current = true;
      const from = fromRef.current;
      fromRef.current = value;
      if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDisplay(value);
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        setDisplay(from + (value - from) * easeOutCubic(t));
        if (t < 1) requestAnimationFrame(tick);
        else setDisplay(value);
      };
      requestAnimationFrame(tick);
    };

    // Already animated once and the value changed → animate straight away from
    // the last value (no need to wait for re-intersection).
    if (started.current) {
      if (fromRef.current !== value) run();
      return;
    }

    if (!startOnView) {
      run();
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration, startOnView]);

  return (
    <span ref={ref} className={cn("tnum", className)}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
