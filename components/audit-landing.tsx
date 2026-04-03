"use client";

import { useEffect, useRef } from "react";
import {
  ArrowRight,
  Check,
  Clock,
  FileCheck,
  Inbox,
  MessageCircle,
  PieChart,
  Star,
  Zap,
} from "lucide-react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";

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
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

function Card3D({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [4, -4]), { stiffness: 200, damping: 30 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-4, 4]), { stiffness: 200, damping: 30 });

  function onMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <div className="perspective-1200">
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={() => { x.set(0); y.set(0); }}
        style={{ rotateX: rx, rotateY: ry }}
        className={`preserve-3d backface-hidden rounded-2xl border border-gray-200 bg-white shadow-card transition-shadow duration-300 hover:shadow-cardHover ${className}`}
      >
        {children}
      </motion.div>
    </div>
  );
}

function CalendlyEmbed() {
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.event === "calendly.event_scheduled" && typeof window.fbq === "function") {
        window.fbq("track", "Schedule");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
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

const reviews = [
  { text: "I used to spend 3+ hours every morning just sorting through emails and chasing down leads. Now I spend maybe 10 minutes reviewing what Axon already handled. My admin time dropped by like 90%. I'm not exaggerating!", name: "Marcus R.", biz: "HVAC · Dallas, TX", rotate: "-2deg", img: 11, initial: "", color: "" },
  { text: "We were losing almost half our after-hours inquiries because nobody was following up fast enough. First month with Axon, every single lead got a response within a couple hours. That alone brought in $12K we would have lost. Incredible service, super responsive team too.", name: "Jennifer T.", biz: "Med Spa · Scottsdale, AZ", rotate: "1.5deg", img: 32, initial: "", color: "" },
  { text: "Awesome. Just awesome. Got my weekends back!! I actually went fishing last Saturday instead of doing invoices lol", name: "David K.", biz: "Plumbing · Indianapolis, IN", rotate: "-1deg", img: null, initial: "D", color: "bg-emerald-500" },
  { text: "I was honestly skeptical at first but the daily briefings alone are worth it. Every morning I know exactly what happened overnight, which customers need attention, and what jobs are scheduled. My office manager said it feels like we hired two extra people.", name: "Rachel M.", biz: "Dental Practice · Austin, TX", rotate: "2deg", img: 25, initial: "", color: "" },
  { text: "Best money I have ever spent on my business. Not even close. Our Google reviews went from 3.8 to 4.6 stars because every review actually gets a thoughtful response now. Customers keep saying how professional we are!", name: "Brian L.", biz: "Electrical · Phoenix, AZ", rotate: "-2.5deg", img: null, initial: "B", color: "bg-violet-500" },
  { text: "Our response time to new inquiries went from 2 days to 2 hours. Two of my clients specifically mentioned how quick and respectful our follow-up was. That never happened before Axon.", name: "Sarah W.", biz: "Salon · Nashville, TN", rotate: "1deg", img: 44, initial: "", color: "" },
  { text: "Basically replaced a $55K operations manager. No drama, no sick days, no training period. It just works. My bookkeeper was shocked at how organized everything got in like two weeks flat.", name: "Mike C.", biz: "Landscaping · Denver, CO", rotate: "-1.5deg", img: null, initial: "M", color: "bg-sky-500" },
  { text: "I tell every business owner I know about this!! The proposals get drafted automatically from my client calls, invoices go out on time, and I get a weekly report that actually tells me useful stuff. Excellent customer service whenever I have questions too.", name: "Amanda P.", biz: "Law Firm · Charlotte, NC", rotate: "2.5deg", img: 47, initial: "", color: "" },
  { text: "Setup was painless, the team walked me through everything. Two weeks later my entire back office runs itself. I went from drowning in admin to spending my time actually growing the business. Wild how fast it changed things.", name: "Jason H.", biz: "Gym · San Diego, CA", rotate: "-0.5deg", img: null, initial: "J", color: "bg-amber-500" },
];

function ReviewCard({ review, delay = 0 }: { review: typeof reviews[0]; delay?: number }) {
  return (
    <Fade delay={delay}>
      <div
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_32px_-8px_rgba(0,0,0,0.06)] transition-transform duration-300 hover:rotate-0 hover:scale-[1.02] hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_48px_-8px_rgba(2,132,199,0.1)]"
        style={{ transform: `rotate(${review.rotate})` }}
      >
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, s) => (
            <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="mt-3 text-[15px] leading-[1.65] text-gray-700">
          &ldquo;{review.text}&rdquo;
        </p>
        <div className="mt-3 flex items-center gap-3">
          {review.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://i.pravatar.cc/80?img=${review.img}`}
              alt={review.name}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
            />
          ) : (
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ring-2 ring-white shadow-[0_1px_4px_rgba(0,0,0,0.1)] ${review.color}`}>
              {review.initial}
            </div>
          )}
          <p className="text-[13px] font-medium text-gray-400">
            {review.name} · {review.biz}
          </p>
        </div>
      </div>
    </Fade>
  );
}

export default function AuditLanding() {
  return (
    <div className="min-h-screen bg-axonBg text-axonText">
      <div className="mx-auto max-w-[720px] px-6 py-12 md:py-20">

        {/* ═══ HERO ═══ */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center text-xs font-bold tracking-[0.32em] text-gray-400"
        >
          AXON
        </motion.p>

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

        {/* ═══ FEATURED TESTIMONIAL (small, right under CTA) ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-8"
        >
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-6px_rgba(0,0,0,0.06)]">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://i.pravatar.cc/80?img=11"
                alt="Marcus R."
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-gray-800">Marcus R.</p>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-[13px] leading-[1.6] text-gray-500">
                  &ldquo;Admin time dropped by 90%. I used to spend 3+ hours on emails every morning. Now it takes 10 minutes. Not exaggerating!&rdquo;
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══ SECTION: WHAT AXON DOES ═══ */}
        <Fade className="mt-24">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">HOW IT WORKS</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] md:text-4xl">
              An Operations System That Never Sleeps.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[16px] leading-[1.75] text-gray-500">
              Axon is not a chatbot or an app. It is a network of <span className="font-semibold text-axonText">autonomous AI workflows</span> that plug into
              your existing tools and run your entire back office daily. You review. It executes.
            </p>
          </div>
        </Fade>

        <div className="mt-12 space-y-5">
          {[
            {
              icon: Inbox,
              title: "Email, Leads & Pipeline",
              desc: "Your inbox is triaged every morning. Leads get personalized follow-ups within hours, in your voice. Stale leads are re-engaged automatically. Your pipeline stays full without you touching it.",
              points: ["Draft replies in your voice", "Every lead followed up", "Pipeline always current"],
            },
            {
              icon: MessageCircle,
              title: "Reviews & Customer Communication",
              desc: "Every Google review gets a professional response. Appointment confirmations, thank-you emails, and re-engagement campaigns run automatically. Your customers hear from you consistently.",
              points: ["Review responses in hours", "Dormant customers re-engaged", "Brand voice on every message"],
            },
            {
              icon: PieChart,
              title: "Reports & Business Intelligence",
              desc: "Weekly written reports with revenue trends, client health scores, and pipeline forecasts. Proposals and invoices drafted from real conversations. Not a dashboard. Actionable insights you can use.",
              points: ["Weekly written insights", "Auto-generated proposals", "Competitor monitoring"],
            },
            {
              icon: FileCheck,
              title: "Administration & Daily Ops",
              desc: "Job scheduling, employee follow-ups, vendor coordination, data entry across every tool you use. The small stuff that silently eats 3 to 4 hours of your day is handled before you even start working.",
              points: ["Job scheduling & updates", "Employee coordination", "Calendar & file management"],
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <Fade key={item.title} delay={i * 0.06}>
                <Card3D className="p-6 md:p-7">
                  <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-gradient-to-br from-sky-50 to-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_8px_rgba(0,0,0,0.04)]">
                      <Icon className="h-5 w-5 text-axonBlue" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className="mt-2 text-[14px] leading-[1.7] text-gray-500">{item.desc}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.points.map((p) => (
                          <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[12px] font-medium text-axonBlue shadow-[inset_0_0_0_1px_rgba(2,132,199,0.12)]">
                            <Check className="h-3 w-3" /> {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card3D>
              </Fade>
            );
          })}
        </div>

        {/* ═══ SECTION: RESULTS ═══ */}
        <Fade className="mt-24">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">AVERAGE CLIENT RESULTS</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] md:text-4xl">
              What Changes In 30 Days.
            </h2>
          </div>
        </Fade>

        <div className="mt-12 flex flex-col gap-4">
          {/* Top row: one wide stat */}
          <Fade delay={0.05}>
            <Card3D className="relative overflow-hidden px-8 py-10 text-center">
              <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-sky-100/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-violet-100/30 blur-3xl" />
              <p className="relative text-[64px] font-bold leading-none tracking-tight text-axonBlue md:text-[80px]">90%</p>
              <p className="relative mt-3 text-[15px] font-medium text-gray-500">Reduction in daily admin time</p>
            </Card3D>
          </Fade>

          {/* Two-col row */}
          <div className="grid grid-cols-2 gap-4">
            <Fade delay={0.1}>
              <Card3D className="relative overflow-hidden p-6 text-center">
                <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-100/40 blur-2xl" />
                <p className="relative text-[40px] font-bold leading-none tracking-tight text-emerald-600 md:text-[48px]">25%</p>
                <p className="relative mt-2 text-[12px] font-medium leading-[1.4] text-gray-500">Increase in organic conversions</p>
              </Card3D>
            </Fade>
            <Fade delay={0.15}>
              <Card3D className="relative overflow-hidden p-6 text-center">
                <div className="pointer-events-none absolute -left-4 -top-4 h-24 w-24 rounded-full bg-amber-100/40 blur-2xl" />
                <p className="relative text-[40px] font-bold leading-none tracking-tight text-amber-500 md:text-[48px]">3x</p>
                <p className="relative mt-2 text-[12px] font-medium leading-[1.4] text-gray-500">Faster lead response time</p>
              </Card3D>
            </Fade>
          </div>

          {/* Three-col row */}
          <div className="grid grid-cols-3 gap-4">
            <Fade delay={0.2}>
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-sky-50/60 p-5 text-center shadow-card">
                <p className="text-[28px] font-bold leading-none tracking-tight text-axonText md:text-[32px]">20+</p>
                <p className="mt-2 text-[11px] font-medium leading-[1.3] text-gray-400">Hours saved per week</p>
              </div>
            </Fade>
            <Fade delay={0.25}>
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-violet-50/60 p-5 text-center shadow-card">
                <p className="text-[28px] font-bold leading-none tracking-tight text-axonText md:text-[32px]">100%</p>
                <p className="mt-2 text-[11px] font-medium leading-[1.3] text-gray-400">Leads followed up</p>
              </div>
            </Fade>
            <Fade delay={0.3}>
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-emerald-50/60 p-5 text-center shadow-card">
                <p className="text-[28px] font-bold leading-none tracking-tight text-axonText md:text-[32px]">30 day</p>
                <p className="mt-2 text-[11px] font-medium leading-[1.3] text-gray-400">ROI payback period</p>
              </div>
            </Fade>
          </div>
        </div>

        {/* ═══ REVIEWS BURST ═══ */}
        <Fade className="mt-24">
          <p className="mb-6 text-center text-xs font-semibold tracking-[0.2em] text-gray-400">
            WHAT OWNERS ARE SAYING
          </p>
        </Fade>
        <div className="space-y-3">
          {reviews.map((review, i) => (
            <ReviewCard key={i} review={review} delay={i * 0.03} />
          ))}
        </div>

        {/* ═══ WHAT THE AUDIT COVERS ═══ */}
        <Fade className="mt-24">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-gray-400">WHAT THE AUDIT COVERS</p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] md:text-3xl">
              30 Minutes. Zero Fluff.
            </h2>
          </div>
        </Fade>
        <div className="mt-8 space-y-4">
          {[
            "We will show you exactly where leads are falling through the cracks",
            "We will identify how much revenue you are losing to slow follow-up and unanswered reviews",
            "You will leave with a specific plan to fix it, whether you hire us or not",
          ].map((line, i) => (
            <Fade key={i} delay={i * 0.06}>
              <Card3D className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-50 to-white shadow-[inset_0_0_0_1px_rgba(2,132,199,0.15)]">
                    <Check className="h-3.5 w-3.5 text-axonBlue" />
                  </div>
                  <p className="text-[15px] leading-[1.65] text-gray-600">{line}</p>
                </div>
              </Card3D>
            </Fade>
          ))}
        </div>

        {/* ═══ CALENDLY EMBED ═══ */}
        <div id="book" />
        <Fade className="mt-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-[-0.02em] md:text-3xl">Pick a Time That Works</h2>
            <p className="mt-2 text-[14px] text-gray-400">Free 30-minute call. We will show you exactly what to fix.</p>
          </div>
          <div className="mt-8">
            <CalendlyEmbed />
          </div>
          <p className="mt-5 text-center text-[13px] text-gray-400">
            Available Monday to Thursday · 10am to 2pm
          </p>
        </Fade>

        {/* ═══ MICRO FOOTER ═══ */}
        <p className="mt-20 pb-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Axon · axonservices.dev
        </p>
      </div>
    </div>
  );
}
