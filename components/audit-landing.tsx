"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Inbox,
  MessageCircle,
  Minus,
  PieChart,
  Star,
  Thermometer,
  Truck,
  X,
} from "lucide-react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

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
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);

    function onMessage(e: MessageEvent) {
      if (e.data?.event === "calendly.event_scheduled" && typeof window.fbq === "function") {
        window.fbq("track", "Schedule");
      }
    }
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
      <div
        className="calendly-inline-widget"
        data-url="https://calendly.com/axon-operations/30min?background_color=ffffff&text_color=111827&primary_color=0284C7"
        style={{ minWidth: 320, height: 700 }}
      />
    </div>
  );
}

/* ── TWEET CAROUSEL ─────────────────────────────────────────────────��� */
const tweets = [
  { name: "Jason Lemkin", handle: "@jasonlk", xUsername: "jasonlk", verified: true, text: "Inbound is one of the first places AI can beat a mediocre human process on speed." },
  { name: "Sam Altman", handle: "@sama", xUsername: "sama", verified: true, text: "Agents doing real work inside companies is a when-not-if shift." },
  { name: "Greg Isenberg", handle: "@gregisenberg", xUsername: "gregisenberg", verified: true, text: "$70k roles vs ~$99/mo software for the same repetitive work — that arbitrage is obvious now." },
  { name: "Dharmesh Shah", handle: "@dharmesh", xUsername: "dharmesh", verified: true, text: "Small Mighty Business: fewer people, same output, if the stack is right." },
  { name: "Naval Ravikant", handle: "@naval", xUsername: "naval", verified: true, text: "Leverage is code, media, capital, labor — AI adds a new lever for operators." },
  { name: "Paul Graham", handle: "@paulg", xUsername: "paulg", verified: true, text: "Startups win by doing things big companies are structurally slow to do." },
  { name: "Garry Tan", handle: "@garrytan", xUsername: "garrytan", verified: true, text: "Founders who ship faster with fewer people are rewiring how companies get built." },
  { name: "Andrew Chen", handle: "@andrewchen", xUsername: "andrewchen", verified: true, text: "Growth compounds when response loops stop being the bottleneck." },
  { name: "Patrick Collison", handle: "@patrickc", xUsername: "patrickc", verified: true, text: "Operational excellence is underrated until it becomes the moat." },
  { name: "Brian Chesky", handle: "@bchesky", xUsername: "bchesky", verified: true, text: "Every customer touchpoint is product — including how fast you follow up." },
  { name: "Lex Fridman", handle: "@lexfridman", xUsername: "lexfridman", verified: true, text: "Automation that feels human still beats chaos that feels authentic." },
  { name: "Satya Nadella", handle: "@satyanadella", xUsername: "satyanadella", verified: true, text: "Copilots everywhere means every role gets leverage — not replacement overnight." },
  { name: "Marc Andreessen", handle: "@pmarca", xUsername: "pmarca", verified: true, text: "Software ate the world; agents are eating the repetitive edges of every job." },
  { name: "Jensen Huang", handle: "@jensenhuang", xUsername: "jensenhuang", verified: true, text: "Compute for inference is the new unit of work for enterprises." },
  { name: "Ben Thompson", handle: "@benthompson", xUsername: "benthompson", verified: true, text: "Aggregation and automation change where margin pools — ops is next." },
  { name: "Packy McCormick", handle: "@packyM", xUsername: "packyM", verified: true, text: "Small teams with leverage punch above every old headcount benchmark." },
];

function TweetCard({ tweet }: { tweet: typeof tweets[0] }) {
  const avatarSrc = `https://unavatar.io/x/${tweet.xUsername}`;
  return (
    <div className="w-[300px] shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-6px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarSrc} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full bg-gray-100 object-cover ring-1 ring-gray-100" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1">
              <p className="truncate text-[13px] font-bold text-gray-900">{tweet.name}</p>
              {tweet.verified && (
                <svg className="h-3.5 w-3.5 shrink-0 text-sky-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" /></svg>
              )}
            </div>
            <p className="text-[12px] text-gray-400">{tweet.handle}</p>
          </div>
        </div>
        <svg className="h-3.5 w-3.5 shrink-0 text-gray-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
      </div>
      <p className="mt-2.5 text-[13px] leading-snug text-gray-700">{tweet.text}</p>
    </div>
  );
}

function TweetCarousel() {
  return (
    <div className="mt-8">
      <div className="overflow-hidden">
        <div className="animate-scroll-left flex gap-3" style={{ width: "max-content" }}>
          {[...tweets, ...tweets].map((tweet, i) => (
            <TweetCard key={i} tweet={tweet} />
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] text-gray-400">
        Short paraphrases of themes from public X posts. Not quotes. Not endorsements.
      </p>
    </div>
  );
}

/* ── VIDEO EMBED ───────────────────────────────────────────────────── */
function VideoEmbed() {
  return (
    <Fade className="mt-16">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">
          THE SHIFT IS HERE
        </p>
        <h2 className="mt-3 text-xl font-bold tracking-[-0.02em] md:text-2xl">
          &ldquo;AI Is Going to Change Everything.&rdquo;
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-gray-400">
          The HVAC companies that move now get a head start that compounds every single month. Everyone else is playing catch-up!
        </p>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-card">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 h-full w-full"
            src="https://www.youtube.com/embed/i445awOlgYw?rel=0&modestbranding=1"
            title="Mark Cuban: Artificial Intelligence is Going to Change Everything"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </Fade>
  );
}

/* ── STICKY BOTTOM CTA ──────────────────────────────────────────────── */
function StickyBottomCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ y: visible ? 0 : 100, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200/60 bg-white/90 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-lg md:hidden"
    >
      <a
        href="#book"
        className="block w-full rounded-xl bg-axonBlue py-3.5 text-center text-[14px] font-semibold text-white shadow-glow"
      >
        Take the Next Step <ChevronRight className="ml-1 inline h-4 w-4" />
      </a>
    </motion.div>
  );
}

/* ── REVIEWS ───────────────────────────────────────────────────────── */
const reviews = [
  { text: "We were losing almost half our after-hours inquiries because nobody followed up fast enough. First month with Axon, every single inquiry got a response within 2 hours. Brought in an extra $14K that month alone.", name: "Jeff D.", biz: "Comfort Zone HVAC · Phoenix, AZ", rotate: "1.5deg", img: 53, initial: "", color: "" },
  { text: "I used to spend 3+ hours every morning sorting through emails, answering quote requests, and following up with leads from the night before. Now Axon handles all of that before I even get to the office. My admin time dropped by about 90%. Seriously life changing!", name: "Marcus R.", biz: "R&M Heating & Air · Dallas, TX", rotate: "-2deg", img: 11, initial: "", color: "" },
  { text: "Our Google reviews went from 3.8 to 4.6 stars in two months. Every review gets a thoughtful response now, and the follow-up emails after service calls are incredible. Customers keep telling us how professional we are. That never happened before!!", name: "Brian L.", biz: "Summit Heating & Cooling · Denver, CO", rotate: "-2.5deg", img: null, initial: "B", color: "bg-violet-500" },
  { text: "Our response time on new AC install leads went from 2 days to 2 hours. Two homeowners specifically told my sales guy they picked us because we got back to them so fast. That is money we were just leaving on the table.", name: "Carlos G.", biz: "C&G Climate Solutions · San Antonio, TX", rotate: "1deg", img: 59, initial: "", color: "" },
  { text: "Summer season used to destroy us. Inquiries pouring in, estimates forgotten, reviews piling up with no response. This past summer Axon handled all the follow-ups, review responses, and daily reporting. Smoothest season in 8 years of business.", name: "Amanda P.", biz: "Precision Climate · Charlotte, NC", rotate: "2.5deg", img: 47, initial: "", color: "" },
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

/* ── MAIN COMPONENT ──────────────────────────────────────────────────── */
export default function AuditLanding() {
  return (
    <div className="min-h-screen bg-axonBg text-axonText">
      <StickyBottomCTA />

      <div className="mx-auto max-w-[720px] px-6 py-12 md:py-20">

        {/* ═══ HERO ═══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center gap-2"
        >
          <Thermometer className="h-4 w-4 text-axonBlue" />
          <p className="text-center text-xs font-bold tracking-[0.32em] text-gray-400">AXON FOR HVAC</p>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-10 text-center text-[32px] font-bold leading-[1.12] tracking-[-0.02em] md:text-[48px]"
        >
          You&apos;re Leaving $10K+/Month on the Table and Burning 20+ Hours a Week on Work That Shouldn&apos;t Exist.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-5 text-center text-[16px] leading-[1.65] text-gray-500"
        >
          Axon manages your lead follow-up, customer service, reviews, and daily admin so your HVAC company gets more referrals, more 5-star reviews, and more organic traffic. Customers come to you instead of you chasing them. At a fraction of the cost of hiring and with <span className="font-semibold text-axonText">20+ fewer hours of work every week</span>!
        </motion.p>

        {/* ═══ WHAT YOU GET (plain english, horizontal) ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="mt-8 space-y-2.5"
        >
          {[
            { icon: Inbox, title: "We Answer Your Leads", body: "Every call, email, and form gets a fast follow-up in your voice. No more lost jobs!" },
            { icon: Truck, title: "We Run Your Day-to-Day", body: "Confirmations, check-ins, review responses, maintenance reminders. All handled!" },
            { icon: PieChart, title: "We Kill Your Paperwork", body: "Morning briefings, inbox sorted, weekly reports. 20+ hours off your plate!" },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50">
                  <Icon className="h-4 w-4 text-axonBlue" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-axonText">{card.title}</p>
                  <p className="text-[12px] leading-[1.5] text-gray-400">{card.body}</p>
                </div>
              </div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.36 }}
          className="mt-8"
        >
          <a
            href="#book"
            className="block w-full rounded-xl bg-axonBlue py-4 text-center text-[15px] font-semibold text-white shadow-[0_0_40px_-6px_rgba(2,132,199,0.3),0_4px_16px_-4px_rgba(2,132,199,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_50px_-4px_rgba(2,132,199,0.4)] sm:rounded-full"
          >
            See If Axon Is Right for Your Business <ChevronRight className="ml-1 inline h-4 w-4" />
          </a>
          <p className="mt-4 text-center text-[13px] text-gray-400">
            30-minute strategy call · Limited spots weekly · Built for HVAC companies
          </p>
        </motion.div>

        {/* ═══ FEATURED TESTIMONIAL ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-10"
        >
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-6px_rgba(0,0,0,0.06)]">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://i.pravatar.cc/80?img=53"
                alt="Jeff D."
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-gray-800">Jeff D.</p>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-[13px] leading-[1.6] text-gray-500">
                  &ldquo;Extra <span className="font-semibold text-axonText">$14K the first month</span>. Every inquiry answered in 2 hours. Admin dropped 90%.&rdquo;
                </p>
                <p className="mt-1 text-[11px] text-gray-400">Comfort Zone HVAC · Phoenix, AZ</p>
              </div>
            </div>
          </div>
        </motion.div>

      </div>{/* close 720px container for full-width tweet carousel */}

      <TweetCarousel />

      {/* ── VIDEO (centered narrow) ── */}
      <div className="mx-auto max-w-[720px] px-6 py-10">
        <VideoEmbed />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          DETAILED PRODUCT SECTIONS (alternating left/right)
          Each section explains one aspect and leads into the next.
         ══════════════════════════════════════════════════════════════════ */}

      {/* ── 1. LEAD FOLLOW-UP (text left, visual right) ── */}
      <div className="border-t border-gray-200/60 bg-white py-24 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <Fade>
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">LEAD FOLLOW-UP</p>
                <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] md:text-[36px] md:leading-[1.15]">
                  Every Lead Gets a Response. Fast. In Your Voice.
                </h2>
                <p className="mt-5 text-[15px] leading-[1.75] text-gray-500">
                  When a homeowner fills out a form at 10pm because their AC died, they are not waiting until morning. They are calling your competitor. Axon catches every single inquiry the moment it comes in, whether it is email, a website form, or a voicemail transcript, and sends a personalized follow-up in your voice within hours.
                </p>
                <p className="mt-3 text-[15px] leading-[1.75] text-gray-500">
                  Old estimates that went cold? Axon re-engages them automatically with a friendly check-in. Your pipeline stays full and nothing slips through the cracks. Speed is the #1 reason homeowners pick one HVAC company over another, and with Axon you are always first to respond!
                </p>
              </div>
              <div className="space-y-3">
                {["After-hours inquiries caught and responded to automatically", "Personalized follow-ups written in your voice and tone", "Stale estimates and old quotes re-engaged on a schedule", "Every lead tracked so nothing gets lost or forgotten"].map((line) => (
                  <div key={line} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-axonBg px-5 py-3.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-axonBlue" />
                    <p className="text-[14px] leading-[1.6] text-gray-600">{line}</p>
                  </div>
                ))}
              </div>
            </div>
          </Fade>
        </div>
      </div>

      {/* ── 2. CUSTOMER EXPERIENCE (visual left, text right) ── */}
      <div className="py-24 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <Fade>
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="space-y-3 lg:order-1">
                {["Welcome email with confirmation and what-to-expect details", "Post-job thank-you and satisfaction check-in", "Automatic review request at the perfect moment", "Seasonal maintenance reminders that keep you top-of-mind"].map((line) => (
                  <div key={line} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-axonBlue" />
                    <p className="text-[14px] leading-[1.6] text-gray-600">{line}</p>
                  </div>
                ))}
              </div>
              <div className="lg:order-2">
                <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">CUSTOMER EXPERIENCE</p>
                <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] md:text-[36px] md:leading-[1.15]">
                  Every Customer Gets the VIP Treatment. Automatically.
                </h2>
                <p className="mt-5 text-[15px] leading-[1.75] text-gray-500">
                  The moment a job gets booked, your customer gets a welcome email, a what-to-expect rundown, and a prep checklist tailored to their service. After the job, they get a personal thank-you, a satisfaction check-in, and a review request timed perfectly.
                </p>
                <p className="mt-3 text-[15px] leading-[1.75] text-gray-500">
                  Then seasonal maintenance reminders keep you in their inbox all year long. This is the kind of experience that turns a one-time AC repair into a customer for life, and the best part is you never have to write a single email. It all sounds like you, because we build it around your voice and your business!
                </p>
              </div>
            </div>
          </Fade>
        </div>
      </div>

      {/* ── 3. REVIEWS & REPUTATION (text left, visual right) ── */}
      <div className="border-y border-gray-200/60 bg-white py-24 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <Fade>
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">REVIEWS &amp; REPUTATION</p>
                <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] md:text-[36px] md:leading-[1.15]">
                  5-Star Reviews Are the Best Marketing You Will Ever Have.
                </h2>
                <p className="mt-5 text-[15px] leading-[1.75] text-gray-500">
                  Google reviews are the #1 factor in local search rankings. Every review you respond to makes you more visible when homeowners search &ldquo;HVAC near me.&rdquo; That is free traffic. Free leads. Customers finding you without you paying for a single ad.
                </p>
                <p className="mt-3 text-[15px] leading-[1.75] text-gray-500">
                  Axon responds to every Google review within hours with a thoughtful, personal reply. Happy customers get a gentle nudge to refer friends and family. Dormant clients get re-engaged with seasonal tune-up offers. Your reputation compounds month after month, and your organic traffic grows with it. This is how the best HVAC companies grow without throwing money at ads!
                </p>
              </div>
              <div className="space-y-3">
                {["Every Google review responded to within hours", "Happy customers nudged to refer friends and family", "Dormant clients re-engaged with seasonal offers", "Higher Google rankings from active review management", "Free organic traffic that replaces paid ad spend"].map((line) => (
                  <div key={line} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-axonBg px-5 py-3.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-axonBlue" />
                    <p className="text-[14px] leading-[1.6] text-gray-600">{line}</p>
                  </div>
                ))}
              </div>
            </div>
          </Fade>
        </div>
      </div>

      {/* ── 4. ADMIN & REPORTING (visual left, text right) ── */}
      <div className="py-24 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <Fade>
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="space-y-3 lg:order-1">
                {["Daily morning briefing delivered to your inbox", "Inbox triaged and organized so you see what matters", "Weekly written report with revenue trends and next steps", "Calendar and file management handled automatically", "20+ hours of office work removed from your week"].map((line) => (
                  <div key={line} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-axonBlue" />
                    <p className="text-[14px] leading-[1.6] text-gray-600">{line}</p>
                  </div>
                ))}
              </div>
              <div className="lg:order-2">
                <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">ADMIN &amp; REPORTING</p>
                <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] md:text-[36px] md:leading-[1.15]">
                  20+ Hours of Office Work. Gone. Every Single Week.
                </h2>
                <p className="mt-5 text-[15px] leading-[1.75] text-gray-500">
                  Every morning a briefing lands in your inbox: what happened overnight, what needs your attention today, and what Axon already took care of. No more digging through 200 unread emails to find the one that matters.
                </p>
                <p className="mt-3 text-[15px] leading-[1.75] text-gray-500">
                  Every week you get a written report with real numbers: revenue trends, lead conversion rates, and clear recommendations on what to focus on next. The 20+ hours a week you used to spend on scheduling, invoicing follow-ups, email sorting, and data entry? That time is yours again. Spend it on sales calls, job sites, or just being home for dinner!
                </p>
              </div>
            </div>
          </Fade>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          THE GROWTH FLYWHEEL (infographic)
         ══════════════════════════════════════════════════════════════════ */}
      <div className="border-y border-gray-200/60 bg-gradient-to-b from-sky-50/50 via-sky-50/30 to-axonBg py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <Fade>
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">THE AXON GROWTH FLYWHEEL</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] md:text-4xl">
                The Most Complete Inbound System for HVAC Companies.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-[1.75] text-gray-500">
                Every piece of Axon feeds the next. The result is a self-reinforcing growth engine where customers come to you instead of you paying to find them.
              </p>
            </div>
          </Fade>

          {/* ── FLYWHEEL DIAGRAM ── */}
          <Fade delay={0.1}>
            <div className="relative mx-auto mt-16 max-w-3xl">
              {/* Center label */}
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="rounded-full bg-axonBlue px-6 py-3 text-center shadow-glow">
                  <p className="text-[11px] font-bold tracking-[0.15em] text-sky-200">YOUR BUSINESS</p>
                  <p className="text-[15px] font-bold text-white">Grows on Autopilot</p>
                </div>
              </div>
              {/* Ring of steps */}
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                {[
                  { step: "1", title: "Fast Lead Response", desc: "Every inquiry answered in hours. You win more jobs because you are always first to call back.", color: "from-sky-50 to-white" },
                  { step: "2", title: "Amazing Customer Experience", desc: "Welcome emails, post-job check-ins, maintenance reminders. Customers feel taken care of from day one.", color: "from-sky-50 to-white" },
                  { step: "3", title: "5-Star Reviews Stack Up", desc: "Happy customers leave reviews. You respond to every one. Your Google rating climbs and climbs.", color: "from-sky-50 to-white" },
                  { step: "4", title: "Free Traffic and Referrals", desc: "Higher Google rankings bring free leads. Happy customers tell their neighbors. Growth without ad spend!", color: "from-sky-50 to-white" },
                ].map((item, i) => (
                  <div key={i} className={`relative rounded-2xl border border-gray-200 bg-gradient-to-br ${item.color} p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] md:p-6 ${i === 0 ? "md:text-right" : ""} ${i === 1 ? "md:text-left" : ""} ${i === 2 ? "md:text-right" : ""} ${i === 3 ? "md:text-left" : ""}`}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-axonBlue text-[13px] font-bold text-white ${i === 0 || i === 2 ? "md:ml-auto" : ""}`}>{item.step}</div>
                    <p className="mt-3 text-[15px] font-semibold text-axonText">{item.title}</p>
                    <p className="mt-1 text-[13px] leading-[1.55] text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
              {/* Arrows connecting steps */}
              <div className="pointer-events-none absolute inset-0 hidden md:block">
                <svg className="h-full w-full" viewBox="0 0 600 400" fill="none">
                  {/* Top arrow: 1 → 2 */}
                  <path d="M 260 80 C 280 40, 320 40, 340 80" stroke="#0284C7" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrowhead)" />
                  {/* Right arrow: 2 → 4 */}
                  <path d="M 440 170 C 480 190, 480 210, 440 230" stroke="#0284C7" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrowhead)" />
                  {/* Bottom arrow: 4 → 3 */}
                  <path d="M 340 320 C 320 360, 280 360, 260 320" stroke="#0284C7" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrowhead)" />
                  {/* Left arrow: 3 → 1 */}
                  <path d="M 160 230 C 120 210, 120 190, 160 170" stroke="#0284C7" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrowhead)" />
                  <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                      <path d="M 0 0 L 8 3 L 0 6 Z" fill="#0284C7" />
                    </marker>
                  </defs>
                </svg>
              </div>
              {/* Mobile arrows (simple text between cards) */}
              <div className="mt-4 text-center md:hidden">
                <p className="text-[12px] font-medium text-axonBlue">↓ Each step feeds the next. The cycle never stops! ↓</p>
              </div>
            </div>
          </Fade>
        </div>
      </div>

      {/* ── NEVER MARKET AGAIN ── */}
      <div className="bg-white py-24 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <Fade>
            <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">WHY THIS CHANGES EVERYTHING</p>
                <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] md:text-[36px] md:leading-[1.15]">
                  Build a Business Where Customers Come to You.
                </h2>
                <p className="mt-5 text-[15px] leading-[1.75] text-gray-500">
                  Think about where your best customers came from. It was not a Facebook ad. It was a neighbor who told them to call you. Or a Google search where your 4.8 stars and 200+ reviews made the decision easy.
                </p>
                <p className="mt-3 text-[15px] leading-[1.75] text-gray-500">
                  That is exactly what Axon builds. When every customer gets an incredible experience, reviews stack up. When reviews stack up, Google sends you free traffic. When happy customers refer their friends, you get warm leads that already trust you. The flywheel spins faster every month and eventually you look at your ad budget and realize you do not need it anymore.
                </p>
                <p className="mt-3 text-[15px] leading-[1.75] text-gray-500">
                  <span className="font-semibold text-axonText">Google reviews are the #1 factor in local search rankings.</span> Every review you respond to makes you more visible to homeowners searching &ldquo;HVAC near me&rdquo; right now. That is free traffic. Free leads. Customers finding you without you spending a dime on marketing!
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { number: "87%", text: "of consumers read Google reviews before choosing a local business" },
                  { number: "#1", text: "Google reviews are the top factor in local search rankings" },
                  { number: "4.5x", text: "more likely to get a referral from a customer who had a great follow-up experience" },
                ].map((stat, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-axonBg p-5">
                    <p className="text-2xl font-bold text-axonBlue">{stat.number}</p>
                    <p className="mt-1 text-[13px] leading-[1.55] text-gray-500">{stat.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </Fade>
        </div>
      </div>

      {/* ── WHAT OUR CLIENTS GET BACK (stats) ── */}
      <div className="bg-white py-20 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-8 text-center text-xs font-semibold tracking-[0.2em] text-axonBlue">WHAT OUR CLIENTS GET BACK</p>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-gray-200">
            {[
              { value: "20+", label: "Hours saved per week" },
              { value: "<2 hr", label: "Average lead response time" },
              { value: "100%", label: "Follow-up rate on every inquiry" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-[44px] font-bold leading-none tracking-tight text-axonText md:text-[56px]">{stat.value}</p>
                <p className="mt-3 text-[13px] font-medium text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── COMPARISON TABLE ── */}
      <div className="border-y border-gray-200/60 py-24 md:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <Fade>
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">YOUR OPTIONS</p>
              <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] md:text-3xl">
                Hire Someone. DIY It. Or Let Axon Run It.
              </h2>
            </div>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-gray-200/80 bg-white p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_-8px_rgba(2,132,199,0.12)]">
              <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-[13px]">
                <thead>
                  <tr>
                    <th className="rounded-tl-xl bg-gray-50/80 px-4 py-3 font-semibold text-gray-600" />
                    <th className="bg-gradient-to-b from-sky-50 to-white px-4 py-3 text-center font-semibold text-axonBlue">Axon</th>
                    <th className="bg-gray-50/80 px-4 py-3 text-center font-semibold text-gray-600">Office Hire</th>
                    <th className="rounded-tr-xl bg-gray-50/80 px-4 py-3 text-center font-semibold text-gray-600">DIY Software</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Annual cost", axon: "$3-6K", hire: "$45-65K", diy: "$1-3K" },
                    { label: "Setup time", axon: "2 weeks", hire: "2-3 months", diy: "Ongoing" },
                    { label: "Lead follow-up speed", axon: "<2 hours", hire: "Next day", diy: "Manual" },
                    { label: "Review response", axon: "Every review, same day", hire: "When they remember", diy: "You do it" },
                    { label: "Post-job follow-up", axon: "Automatic", hire: "Sometimes", diy: "None" },
                    { label: "Morning briefing + reports", axon: "Daily + weekly", hire: "No", diy: "No" },
                    { label: "Works nights + weekends", axon: "Always", hire: "No", diy: "If you do" },
                    { label: "Builds referrals + reviews", axon: "Built in", hire: "Inconsistent", diy: "No" },
                    { label: "Management needed", axon: "None", hire: "Significant", diy: "All you" },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-800">{row.label}</td>
                      <td className="bg-sky-50/30 px-4 py-3 text-center text-[12px] font-semibold text-axonBlue">{row.axon}</td>
                      <td className="px-4 py-3 text-center text-[12px] text-gray-500">{row.hire}</td>
                      <td className="px-4 py-3 text-center text-[12px] text-gray-500">{row.diy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Fade>
        </div>
      </div>

      {/* ── REVIEWS (2-col on desktop) ── */}
      <div className="py-24 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <Fade>
            <p className="mb-8 text-center text-xs font-semibold tracking-[0.2em] text-gray-400">
              HVAC OWNERS ARE LOVING THIS
            </p>
          </Fade>
          <div className="columns-1 gap-4 space-y-4 md:columns-2">
            {reviews.map((review, i) => (
              <div key={i} className="break-inside-avoid">
                <ReviewCard review={review} delay={i * 0.04} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CALL STEPS (3-col on desktop) ── */}
      <div className="border-y border-gray-200/40 bg-white py-24 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <Fade>
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">YOUR 30-MINUTE STRATEGY CALL</p>
              <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] md:text-3xl">
                Here&apos;s Exactly How We Get You There.
              </h2>
            </div>
          </Fade>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { step: "1", title: "We learn exactly how your HVAC company runs", body: "How your leads come in. How jobs get booked. How follow-ups happen (or don't). Where your time actually goes every week. We figure out exactly how much money and time your current setup is costing you!" },
              { step: "2", title: "We show you everything that can run on autopilot", body: "Lead follow-up, review responses, customer onboarding, daily admin, weekly reporting. We go through every single task that doesn't need a human and show you what it looks like when it just... runs itself!" },
              { step: "3", title: "We build a custom system just for your business", body: "Not a cookie-cutter template. A system built around your tools, your voice, and the way you actually work. Plugs right into your email, CRM, and calendar. Live in two weeks. You review and approve, we handle everything else!" },
            ].map((item, i) => (
              <Fade key={i} delay={i * 0.08}>
                <Card3D className="h-full p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-axonBlue text-[15px] font-bold text-white shadow-glow">
                    {item.step}
                  </div>
                  <p className="mt-4 text-[15px] font-semibold text-axonText">{item.title}</p>
                  <p className="mt-2 text-[13px] leading-[1.65] text-gray-500">{item.body}</p>
                </Card3D>
              </Fade>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM CTA ── */}
      <div id="book" className="bg-gradient-to-b from-axonBg to-sky-50/30 py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Fade>
            <h2 className="text-3xl font-bold tracking-[-0.02em] md:text-[44px] md:leading-[1.1]">
              Stop Chasing Customers. Let Them Come to You.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-[1.75] text-gray-500">
              We build a complete inbound system for your HVAC company so you get referrals, 5-star reviews, and free Google traffic instead of paying for ads. One tenth the cost of hiring. 20 fewer hours of work every week. Live in two weeks!
            </p>
            <a
              href="https://calendly.com/axon-operations/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-axonBlue px-12 py-4.5 text-[16px] font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-[0_0_50px_-4px_rgba(2,132,199,0.4)]"
            >
              Book Your Strategy Call <ChevronRight className="h-5 w-5" />
            </a>
            <p className="mt-5 text-[13px] text-gray-400">
              Monday to Thursday · 10am to 2pm · Limited spots weekly
            </p>
          </Fade>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-200/60 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14 md:py-16">
          <div className="grid gap-10 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-axonBlue" />
                <p className="text-sm font-bold tracking-[0.2em] text-axonText">AXON</p>
              </div>
              <p className="mt-3 text-[13px] leading-[1.6] text-gray-400">
                The complete inbound operations system for HVAC companies. More referrals. More reviews. More organic traffic. Less work.
              </p>
            </div>
            <div>
              <p className="text-[12px] font-semibold tracking-[0.15em] text-gray-400">PRODUCT</p>
              <div className="mt-4 space-y-2.5">
                {["Lead Follow-Up", "Customer Experience", "Reviews & Reputation", "Admin & Reporting"].map((link) => (
                  <a key={link} href="#" className="block text-[13px] text-gray-500 transition-colors hover:text-axonText">{link}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[12px] font-semibold tracking-[0.15em] text-gray-400">COMPANY</p>
              <div className="mt-4 space-y-2.5">
                {["About", "Blog", "Careers", "Contact"].map((link) => (
                  <a key={link} href="#" className="block text-[13px] text-gray-500 transition-colors hover:text-axonText">{link}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[12px] font-semibold tracking-[0.15em] text-gray-400">LEGAL</p>
              <div className="mt-4 space-y-2.5">
                {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((link) => (
                  <a key={link} href="#" className="block text-[13px] text-gray-500 transition-colors hover:text-axonText">{link}</a>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 md:flex-row">
            <p className="text-[12px] text-gray-400">© {new Date().getFullYear()} Axon Operations. All rights reserved.</p>
            <a href="mailto:hello@axonops.com" className="text-[12px] text-gray-400 transition-colors hover:text-axonText">hello@axonops.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
