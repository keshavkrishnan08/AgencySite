import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * PrepPath emblem — a glass tile with an ascending path rising to a summit
 * spark. Layered gradient + top glass highlight + inner ring give it depth.
 */
export function LogoMark({
  size = 36,
  className,
  glow = false,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const radius = Math.round(size * 0.3);
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background:
          "linear-gradient(150deg, #2bbccb 0%, #14808e 52%, #0b525c 120%)",
        boxShadow: glow
          ? "inset 0 1px 0 rgba(255,255,255,0.45), inset 0 0 0 1px rgba(255,255,255,0.14), 0 8px 22px rgba(12,86,96,0.4)"
          : "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 0 0 1px rgba(255,255,255,0.12), 0 3px 8px rgba(12,86,96,0.32)",
      }}
      aria-hidden
    >
      {/* glass highlight */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: radius,
          background:
            "linear-gradient(158deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.08) 38%, rgba(255,255,255,0) 60%)",
        }}
      />
      {/* bottom inner shade for depth */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: radius,
          background: "radial-gradient(120% 80% at 50% 130%, rgba(3,40,46,0.55), transparent 60%)",
        }}
      />
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="none"
        className="relative"
      >
        {/* ascending path */}
        <path
          d="M3.5 18C7 17 8.2 13.6 11 11.4C13.2 9.6 15.4 8.4 18.4 6.2"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.96"
        />
        {/* summit spark */}
        <path
          d="M19.4 2.6L20.45 5.15L23 6.2L20.45 7.25L19.4 9.8L18.35 7.25L15.8 6.2L18.35 5.15Z"
          fill="white"
        />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  href = "/",
  withMark = true,
  size = 36,
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
      {withMark && <LogoMark size={size} />}
      <span
        className="font-serif font-semibold tracking-tight"
        style={{ fontSize: size * 0.5, color: dark ? "#fff" : "var(--ink)" }}
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
