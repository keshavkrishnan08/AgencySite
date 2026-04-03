"use client";

import { useEffect, useRef } from "react";
import { Check, Star } from "lucide-react";
import { motion, useInView } from "framer-motion";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const calendlyUrl = "https://calendly.com/keshavkrishnanbusiness/30min";

function Fade({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

function CalendlyEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (
        e.data?.event === "calendly.event_scheduled" &&
        typeof window.fbq === "function"
      ) {
        window.fbq("track", "Schedule");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div ref={containerRef} className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-8px_rgba(2,132,199,0.08)]">
      <iframe
        src={`${calendlyUrl}?background_color=ffffff&text_color=111827&primary_color=0284C7`}
        width="100%"
        height="700"
        frameBorder="0"
        title="Book your free operations audit"
        loading="lazy"
        className="block w-full"
      />
    </div>
  );
}

export default function AuditLanding() {
  return (
    <div className="min-h-screen bg-axonBg text-axonText">
      <div className="mx-auto max-w-[680px] px-6 py-12 md:py-20">
        {/* Wordmark */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center text-xs font-bold tracking-[0.32em] text-gray-400"
        >
          AXON
        </motion.p>

        {/* Hero */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-10 text-center text-[32px] font-bold leading-[1.12] tracking-[-0.02em] md:text-[48px]"
        >
          Your Service Business Is Leaking Money Every Single Day.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-center text-lg leading-[1.7] text-gray-500"
        >
          Missed leads. Unanswered reviews. Inbox chaos. We install a system
          that handles all of it, every morning, before you open your laptop.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8"
        >
          <a
            href="#book"
            className="block w-full rounded-xl bg-axonBlue py-4 text-center text-[15px] font-semibold text-white shadow-[0_0_40px_-6px_rgba(2,132,199,0.3),0_4px_16px_-4px_rgba(2,132,199,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_50px_-4px_rgba(2,132,199,0.4)] sm:rounded-full"
          >
            Book Your Free Operations Audit
          </a>
          <p className="mt-4 text-center text-[13px] text-gray-400">
            30 minutes · Free · No obligation
          </p>
        </motion.div>

        {/* ── Testimonial ── */}
        <Fade className="mt-20">
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_48px_-8px_rgba(2,132,199,0.07)] md:p-9">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-amber-400 text-amber-400"
                />
              ))}
            </div>

            <div className="relative mt-5">
              <span className="absolute -left-1 -top-4 text-[56px] font-bold leading-none text-axonBlue/10">
                &ldquo;
              </span>
              <p className="relative text-[17px] italic leading-[1.75] text-gray-700">
                {/* Replace with your real testimonial */}
                We were losing almost half our after-hours inquiries. First
                month with Axon, every single one got a follow-up. That alone
                paid for the entire setup three times over.
              </p>
            </div>

            <p className="mt-5 text-sm font-medium text-gray-400">
              Jennifer T. · Med Spa · Scottsdale, AZ
            </p>
          </div>
        </Fade>

        {/* Placeholder for optional video embed */}
        {/* <Fade className="mt-12">
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <iframe src="YOUR_VIDEO_URL" ... />
          </div>
        </Fade> */}

        {/* ── What The Audit Covers ── */}
        <Fade className="mt-20">
          <p className="text-xs font-semibold tracking-[0.2em] text-gray-400">
            WHAT THE AUDIT COVERS
          </p>
          <div className="mt-6 space-y-4">
            {[
              "We will show you exactly where leads are falling through the cracks",
              "We will identify how much revenue you are losing to slow follow-up and unanswered reviews",
              "You will leave with a specific plan to fix it, whether you hire us or not",
            ].map((line, i) => (
              <Fade key={i} delay={i * 0.06}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-50">
                    <Check className="h-3 w-3 text-axonBlue" />
                  </div>
                  <p className="text-[15px] leading-[1.7] text-gray-600">
                    {line}
                  </p>
                </div>
              </Fade>
            ))}
          </div>
        </Fade>

        {/* ── Calendly Embed ── */}
        <div id="book" />
        <Fade className="mt-20">
          <p className="mb-6 text-center text-lg font-semibold">
            Pick a Time That Works
          </p>
          <CalendlyEmbed />
          <p className="mt-5 text-center text-[13px] text-gray-400">
            Available Monday to Thursday · 10am to 2pm
          </p>
        </Fade>

        {/* ── Micro Footer ── */}
        <p className="mt-20 pb-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Axon · axonservices.dev
        </p>
      </div>
    </div>
  );
}
