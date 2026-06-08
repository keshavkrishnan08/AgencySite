import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Axon Careers mark.
 * A borderless monogram built from an axon path: readiness, connection, and forward motion.
 */
export function LogoMark({
  size = 30,
  className,
  dark = false,
}: {
  size?: number;
  className?: string;
  dark?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const pathId = `axon-path-${id}`;
  const nodeId = `axon-node-${id}`;
  const accentId = `axon-accent-${id}`;
  const glowId = `axon-glow-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={pathId} x1="6" y1="33" x2="33" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor={dark ? "#7fe1ea" : "#0c5660"} />
          <stop offset="0.52" stopColor={dark ? "#31c7d5" : "#14808e"} />
          <stop offset="1" stopColor={dark ? "#d7fbff" : "#19a9b8"} />
        </linearGradient>
        <radialGradient id={nodeId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(20 8) rotate(90) scale(27)">
          <stop stopColor={dark ? "#f9efe0" : "#fff7e8"} />
          <stop offset="0.45" stopColor={dark ? "#8ce5ee" : "#19a9b8"} />
          <stop offset="1" stopColor={dark ? "#138997" : "#0c5660"} />
        </radialGradient>
        <linearGradient id={accentId} x1="12" y1="27" x2="29" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor={dark ? "#ffe0a6" : "#dd8b3d"} />
          <stop offset="1" stopColor={dark ? "#f7f1d7" : "#b8893b"} />
        </linearGradient>
        <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="2" stdDeviation="1.7" floodColor={dark ? "#31c7d5" : "#14808e"} floodOpacity={dark ? "0.28" : "0.18"} />
        </filter>
      </defs>

      {/* The outer strokes imply an A without enclosing the symbol in a badge. */}
      <path
        d="M6.7 32.2C10.6 24.7 14.1 15.8 20 6.7C25.9 15.8 29.4 24.7 33.3 32.2"
        stroke={`url(#${pathId})`}
        strokeWidth="3.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
      />
      <path
        d="M12.6 24.1C16.9 20.5 22.9 19.9 28.2 23.8"
        stroke={`url(#${accentId})`}
        strokeWidth="2.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Connection nodes make the mark feel like a living path, not a static letter. */}
      <circle cx="20" cy="6.7" r="2.7" fill={`url(#${nodeId})`} />
      <circle cx="12.6" cy="24.1" r="1.85" fill={`url(#${accentId})`} />
      <circle cx="28.2" cy="23.8" r="1.85" fill={`url(#${accentId})`} />
      <circle cx="33.3" cy="32.2" r="1.45" fill={dark ? "#9eeaf1" : "#0c5660"} opacity="0.9" />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  withMark = true,
  size = 30,
  dark = false,
}: {
  className?: string;
  href?: string | null;
  withMark?: boolean;
  size?: number;
  dark?: boolean;
}) {
  const inner = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {withMark && <LogoMark size={size} dark={dark} />}
      <span className="inline-flex items-baseline gap-1.5">
        <span
          className="font-serif font-semibold tracking-tight"
          style={{ fontSize: size * 0.54, color: dark ? "#fff" : "var(--ink)" }}
        >
          Axon
        </span>
        <span
          className="font-sans text-[0.62em] font-bold uppercase tracking-[0.16em]"
          style={{ color: dark ? "#8ce5ee" : "var(--primary-ink)" }}
        >
          Careers
        </span>
      </span>
    </span>
  );
  if (!href) return inner;
  return (
    <Link href={href} aria-label="Axon Careers home">
      {inner}
    </Link>
  );
}
