"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, Mic, Wand2, Briefcase, LineChart, MessageSquare, Settings, ArrowRight, ArrowLeft, X, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

/* The first-run product tour.
 *
 * On the very first visit to the app we walk the person through every page
 * before they can poke at anything. The full-screen scrim swallows all clicks,
 * so it's a real "hands off, let me show you around" moment, not a dismissible
 * hint. Runs once (localStorage flag), only on the dashboard entry, and can be
 * replayed on demand via a window event so Settings can re-trigger it. */

const DONE_KEY = "pp:tour_v1_done";

interface Step {
  icon: LucideIcon;
  tone: string;
  where: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: LayoutDashboard,
    tone: "var(--primary)",
    where: "Dashboard",
    title: "This is home base",
    body: "Your streak, readiness, and this week's read on the market for your role — all in one glance. It fills in as you practice.",
  },
  {
    icon: Mic,
    tone: "var(--coral)",
    where: "Practice",
    title: "Where the reps happen",
    body: "Pick a focus, answer real questions out loud or by typing, and get every answer scored on five dimensions with one honest fix.",
  },
  {
    icon: Wand2,
    tone: "var(--amber)",
    where: "Prep tools",
    title: "Get ready for the exact interview",
    body: "Paste a job posting to predict the five questions they'll ask, or turn your résumé gap into a calm 30-second answer.",
  },
  {
    icon: Briefcase,
    tone: "var(--sage)",
    where: "Job Breakdown",
    title: "Know the role cold",
    body: "The interview process, the competencies they screen for, and the real pay band — rebuilt for whatever role you're chasing.",
  },
  {
    icon: LineChart,
    tone: "var(--primary-bright)",
    where: "Analytics",
    title: "Watch yourself improve",
    body: "Your percentile, your pace, your weakest skill, and an honest estimate of when you'll be interview-ready.",
  },
  {
    icon: MessageSquare,
    tone: "var(--primary)",
    where: "Your coach",
    title: "A coach in the corner",
    body: "The chat button, bottom-right, is always there. It already knows your role and your weak spot, so just ask.",
  },
];

function isDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function ProductTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  // First-run trigger: only on the dashboard, only once, after a beat so the
  // page has painted behind the scrim.
  useEffect(() => {
    if (pathname !== "/dashboard" || isDone()) return;
    const t = setTimeout(() => {
      setOpen(true);
      track("tool:tour_start", { trigger: "first_run" });
    }, 700);
    return () => clearTimeout(t);
  }, [pathname]);

  // Manual replay (Settings dispatches this).
  useEffect(() => {
    const start = () => {
      setI(0);
      setOpen(true);
      track("tool:tour_start", { trigger: "manual" });
    };
    window.addEventListener("pp:tour:start", start);
    return () => window.removeEventListener("pp:tour:start", start);
  }, []);

  const finish = (completed: boolean) => {
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch {
      /* ignore */
    }
    track(completed ? "tool:tour_complete" : "tool:tour_skip", { step: i + 1 });
    setOpen(false);
  };

  if (!open) return null;
  const step = STEPS[i];
  const Icon = step.icon;
  const last = i === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="tour"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // Full-screen scrim: swallows every click underneath so the tour truly
        // has the floor. onClick here is a no-op catcher, not a dismiss.
        className="fixed inset-0 z-[70] grid place-items-center px-5"
        style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="w-full max-w-md overflow-hidden rounded-3xl border bg-surface"
          style={{ borderColor: "var(--border)", boxShadow: "0 30px 80px -30px rgba(15,23,42,0.6)" }}
        >
          {/* Illustrative header */}
          <div className="relative px-7 pt-7">
            <button
              onClick={() => finish(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-bg-sunk hover:text-ink"
              aria-label="Skip tour"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-3">
              <span>Quick tour</span>
              <span>·</span>
              <span>{i + 1} of {STEPS.length}</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${step.tone} 15%, transparent)` }}>
                    <Icon size={22} style={{ color: step.tone }} />
                  </span>
                  <span className="rounded-full border px-2.5 py-1 text-2xs font-semibold text-ink-2" style={{ borderColor: "var(--border-strong)" }}>
                    {step.where}
                  </span>
                </div>
                <h2 className="mt-4 font-serif text-2xl font-semibold text-ink">{step.title}</h2>
                <p className="mt-2 leading-relaxed text-ink-2">{step.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer controls */}
          <div className="mt-7 flex items-center justify-between border-t px-7 py-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: idx === i ? 18 : 6, background: idx === i ? "var(--primary)" : "var(--border-strong)" }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {i > 0 && (
                <button
                  onClick={() => setI((n) => Math.max(0, n - 1))}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
                >
                  <ArrowLeft size={15} /> Back
                </button>
              )}
              <button
                onClick={() => {
                  if (last) {
                    finish(true);
                    router.push("/practice");
                  } else {
                    setI((n) => n + 1);
                  }
                }}
                className={cn("flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90")}
                style={{ background: "var(--primary)" }}
              >
                {last ? "Start practicing" : "Next"} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </motion.div>

        <button
          onClick={() => finish(false)}
          className="mt-5 text-sm font-medium text-white/80 transition-colors hover:text-white"
        >
          Skip the tour
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
