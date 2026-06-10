"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/* Sticky thumb-zone CTA for the ad landing page. Meta traffic is mostly mobile,
   so the one action follows the visitor down the page. Appears after the hero. */
export function StartSticky() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 transition-all duration-300 sm:hidden ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      <Link
        href="/onboarding"
        className="glass flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold shadow-xl"
        style={{ color: "var(--primary-ink)" }}
      >
        Get started <ArrowRight size={18} />
      </Link>
      <p className="mt-1.5 text-center text-2xs font-medium text-ink-3">
        $9.99/mo. Cancel anytime.
      </p>
    </div>
  );
}
