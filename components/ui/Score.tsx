"use client";

import { useEffect, useState } from "react";
import { AnimatedNumber } from "./AnimatedNumber";
import { cn, scoreColor, DIMENSIONS } from "@/lib/utils";
import type { DimensionScores } from "@/lib/types";

/* ---------------- Big color-coded score number ---------------- */
export function ScoreNumber({
  value,
  className,
  suffix = false,
  duration,
}: {
  value: number;
  className?: string;
  suffix?: boolean;
  duration?: number;
}) {
  return (
    <span
      className={cn("font-serif font-semibold leading-none tnum transition-colors duration-500", className)}
      style={{ color: scoreColor(value) }}
    >
      <AnimatedNumber value={value} duration={duration} />
      {suffix && <span className="font-sans text-[0.4em] font-medium opacity-60"> / 100</span>}
    </span>
  );
}

/* ---------------- Circular progress ring ---------------- */
export function ScoreRing({
  value,
  size = 180,
  stroke = 12,
  trackColor = "rgba(255,255,255,0.18)",
  ringColor,
  children,
  className,
  duration = 1400,
}: {
  value: number;
  size?: number;
  stroke?: number;
  trackColor?: string;
  ringColor?: string;
  children?: React.ReactNode;
  className?: string;
  duration?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setProgress(value);
      return;
    }
    const t = setTimeout(() => setProgress(value), 120);
    return () => clearTimeout(t);
  }, [value]);

  const offset = c - (Math.min(progress, 100) / 100) * c;

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor ?? "currentColor"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: `stroke-dashoffset ${duration}ms cubic-bezier(0.22,1,0.36,1)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ---------------- Single dimension bar ---------------- */
export function ScoreBar({
  label,
  value,
  delay = 0,
  showLabel = true,
  compact = false,
}: {
  label?: string;
  value: number;
  delay?: number;
  showLabel?: boolean;
  compact?: boolean;
}) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setW(value), reduce ? 0 : 120 + delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div className="flex items-center gap-3">
      {showLabel && (
        <div className={cn("shrink-0 font-medium text-ink", compact ? "w-20 text-xs" : "w-24 text-sm")}>
          {label}
        </div>
      )}
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${w}%`,
            background: `linear-gradient(90deg, ${scoreColor(value)}cc, ${scoreColor(value)})`,
            transition: "width 900ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
      <div
        className="w-8 shrink-0 text-right font-mono text-sm font-semibold tnum"
        style={{ color: scoreColor(value) }}
      >
        {value}
      </div>
    </div>
  );
}

/* ---------------- Full 5-dimension breakdown ---------------- */
export function DimensionBars({
  dimensions,
  className,
}: {
  dimensions: DimensionScores;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3.5", className)}>
      {DIMENSIONS.map((d, i) => (
        <ScoreBar key={d.key} label={d.label} value={dimensions[d.key]} delay={i * 110} />
      ))}
    </div>
  );
}
