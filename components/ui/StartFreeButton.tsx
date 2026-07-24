"use client";

import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/* The only call to action on the marketing site.
 *
 * There is no separate "Sign in" link. If you already have a session, this
 * takes you straight into the app; if you don't, it starts onboarding. One
 * button, one label, and it does the right thing either way — a returning
 * customer should never have to work out which of two links is meant for them.
 *
 * `user` is null on the first render on both server and client, so the initial
 * markup matches and there's no hydration mismatch; the href firms up once
 * the session resolves. */
export function StartFreeButton({
  size = "lg",
  variant = "primary",
  className,
  label = "Start for free",
  source = "nav",
  showArrow = true,
}: {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost" | "gold";
  className?: string;
  label?: string;
  source?: string;
  showArrow?: boolean;
}) {
  const { user, loading } = useAuth();
  const signedIn = Boolean(user);
  const href = signedIn ? "/dashboard" : "/onboarding";

  return (
    <ButtonLink
      href={href}
      size={size}
      variant={variant}
      className={cn("group", className)}
      onClick={() => track("landing_cta_click", { source, signedIn, resolved: !loading })}
    >
      {signedIn ? "Continue" : label}
      {showArrow && (
        <ArrowRight size={size === "sm" ? 15 : 18} className="transition-transform group-hover:translate-x-0.5" />
      )}
    </ButtonLink>
  );
}
