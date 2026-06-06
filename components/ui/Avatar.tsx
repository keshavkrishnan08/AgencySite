"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/* Loads a real photo from the internet, but degrades to a gradient + initials
   if it ever fails — so the UI never shows a broken image. */
export function Avatar({
  src,
  name = "",
  size = 44,
  className,
}: {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials =
    name
      .replace(/[^a-zA-Z ]/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "★";

  if (failed || !src) {
    return (
      <span
        className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold text-white", className)}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.36,
          background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))",
        }}
        aria-hidden
      >
        {initials}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
