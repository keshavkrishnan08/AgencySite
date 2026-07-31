"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Lock, Sparkles, TrendingUp, X, Zap } from "lucide-react";
import { getSessions, isPremium, getProfile, getOnboarding } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { PLANS } from "@/lib/pricing";

/* In-app nudge notifications for new and unpaid users.
   Shows contextual toast-style popups based on user state:
   - First visit: "Your first practice is free"
   - After free session: "You scored X! Unlock unlimited practice"
   - On blurred pages: "This feature is included with your plan"

   Also includes the "Today's Briefing" locked card for the dashboard. */

type Nudge = {
  id: string;
  icon: typeof Sparkles;
  title: string;
  body: string;
  cta?: string;
  href?: string;
  onClick?: () => void;
  delay: number;
};

const DISMISSED_KEY = "pp:nudges:dismissed";

function getDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
}
function dismiss(id: string) {
  const d = getDismissed();
  if (!d.includes(id)) { d.push(id); localStorage.setItem(DISMISSED_KEY, JSON.stringify(d)); }
}

export function NudgeToasts() {
  const pathname = usePathname();
  const router = useRouter();
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [visible, setVisible] = useState<string[]>([]);

  useEffect(() => {
    const premium = isPremium();
    if (premium) return; // no nudges for paying users

    const sessions = getSessions();
    const profile = getProfile();
    const ob = getOnboarding();
    const role = profile.targetRole || ob?.targetRole || "your role";
    const dismissed = getDismissed();
    const candidates: Nudge[] = [];

    if (sessions.length === 0 && pathname === "/practice") {
      candidates.push({
        id: "first-free",
        icon: Sparkles,
        title: "Your first practice is free",
        body: `Answer 3 real ${role} interview questions. See your score. No card required.`,
        cta: "Let's go",
        delay: 2000,
      });
    }

    if (sessions.length === 1) {
      const score = sessions[0].overall;
      candidates.push({
        id: "after-first",
        icon: TrendingUp,
        title: `You scored ${score}/100`,
        body: score >= 70
          ? "Strong start. Unlock unlimited practice to keep climbing."
          : "That's your baseline. Most people improve 15+ points in a week.",
        cta: "Unlock practice",
        href: "/upgrade",
        delay: 1500,
      });
    }

    if (sessions.length === 0 && pathname === "/dashboard") {
      candidates.push({
        id: "dashboard-nudge",
        icon: Zap,
        title: "Your dashboard fills in as you practice",
        body: "Start your free session to see your readiness score, streaks, and progress here.",
        cta: "Start practicing",
        href: "/practice",
        delay: 3000,
      });
    }

    const toShow = candidates.filter((n) => !dismissed.includes(n.id));
    setNudges(toShow);

    // Stagger display
    toShow.forEach((n) => {
      setTimeout(() => setVisible((v) => [...v, n.id]), n.delay);
    });
  }, [pathname]);

  const close = (id: string) => {
    dismiss(id);
    setVisible((v) => v.filter((x) => x !== id));
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-3 sm:bottom-6 sm:right-6" style={{ maxWidth: 360 }}>
      <AnimatePresence>
        {nudges.filter((n) => visible.includes(n.id)).map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="rounded-xl border p-4 shadow-lg"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--primary-soft)" }}>
                <n.icon size={18} className="text-primary-ink" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{n.title}</p>
                  <button onClick={() => close(n.id)} className="shrink-0 text-ink-3 hover:text-ink"><X size={14} /></button>
                </div>
                <p className="mt-0.5 text-xs text-ink-2">{n.body}</p>
                {n.cta && (
                  <button
                    onClick={() => { close(n.id); if (n.href) router.push(n.href); n.onClick?.(); }}
                    className="mt-2 text-xs font-semibold text-primary-ink hover:underline"
                  >
                    {n.cta} →
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* "Today's Briefing" locked card — shown on the dashboard for unpaid users.
   Mimics the Monad locked-content card. */
export function LockedBriefingCard() {
  const router = useRouter();
  const premium = typeof window !== "undefined" ? isPremium() : false;
  const profile = typeof window !== "undefined" ? getProfile() : null;
  const role = profile?.targetRole || "your role";

  if (premium) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl text-white" style={{ background: "linear-gradient(135deg, #0c5660 0%, #14808e 60%, #19a9b8 100%)" }}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 50%)" }} />
      <div className="relative p-7">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Today&apos;s Briefing</p>
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
            <Lock size={10} /> Locked
          </span>
        </div>
        <h3 className="mt-4 font-serif text-2xl font-semibold leading-snug">
          Your {role} interview
          <br />
          prep starts here.
        </h3>
        <div className="mt-2 space-y-1">
          <p className="text-sm text-white/70">Personalized practice plan for your exact role.</p>
          <p className="text-sm text-white/50 blur-[3px] select-none">Your top 3 focus areas based on common questions...</p>
          <p className="text-sm text-white/40 blur-[5px] select-none">Predicted interview questions for this week...</p>
        </div>
        <button
          onClick={() => router.push("/upgrade")}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold transition-colors hover:bg-white/90"
          style={{ color: "#0c5660" }}
        >
          Read today&apos;s briefing <ArrowRight size={16} />
        </button>
        <p className="mt-3 text-center text-xs text-white/50">
          A new one every morning · from {PLANS.weekly.perMonth}
        </p>
      </div>
    </div>
  );
}
