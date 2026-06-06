import { cn } from "@/lib/utils";

export function PremiumBadge({ className, label = "Premium" }: { className?: string; label?: string }) {
  return (
    <span className={cn("premium-badge", className)}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 2.5l1.6 3.9 4.2.3-3.2 2.7 1 4.1L12 11.2 8.4 13.5l1-4.1L6.2 6.7l4.2-.3z"
          fill="currentColor"
        />
      </svg>
      {label}
    </span>
  );
}
