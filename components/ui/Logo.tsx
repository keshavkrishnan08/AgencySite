import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * PrepPath mark. An abstract rising arc to a spark. No box, no tile.
 * Reads as growth + readiness. Teal gradient stroke, stands on its own.
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
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pp-mark" x1="3" y1="29" x2="29" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor={dark ? "#5fd2de" : "#0c5660"} />
          <stop offset="0.5" stopColor={dark ? "#2bbccb" : "#14808e"} />
          <stop offset="1" stopColor={dark ? "#a7ecf3" : "#1fb6c6"} />
        </linearGradient>
      </defs>
      {/* rising arc */}
      <path
        d="M3.5 27C12 25 16.5 18.5 19.5 11.5"
        stroke="url(#pp-mark)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* faint trailing arc for depth */}
      <path
        d="M4 21C8.5 20 11.5 16.8 13.8 12.8"
        stroke="url(#pp-mark)"
        strokeWidth="2.3"
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* summit spark */}
      <path d="M23 3l2.1 4.4 4.4 2.1-4.4 2.1L23 16l-2.1-4.4L16.5 9.5l4.4-2.1z" fill="url(#pp-mark)" />
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
    <span className={cn("inline-flex items-center gap-2", className)}>
      {withMark && <LogoMark size={size} dark={dark} />}
      <span
        className="font-serif font-semibold tracking-tight"
        style={{ fontSize: size * 0.52, color: dark ? "#fff" : "var(--ink)" }}
      >
        Prep
        <span style={{ color: dark ? "#7fdce6" : "var(--primary-ink)" }}>Path</span>
      </span>
    </span>
  );
  if (!href) return inner;
  return (
    <Link href={href} aria-label="PrepPath home">
      {inner}
    </Link>
  );
}
