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
          Missed calls going to your competitor. Reviews with zero replies. 20 hours a week stuck doing office work instead of growing your company. We set up a system that answers your leads, runs your day-to-day, and handles your paperwork. Every single day. So you get <span className="font-semibold text-axonText">your life back</span> and keep the money you already earned!
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

        {/* ═══ WHAT YOU GET (plain english) ═══ */}
        <Fade className="mt-14">
          <p className="mb-8 text-center text-xs font-semibold tracking-[0.2em] text-axonBlue">WHAT YOU ACTUALLY GET</p>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: Inbox, title: "We Answer Your Leads", body: "Every call, email, and form gets a fast follow-up in your voice. No more lost jobs from slow callbacks!" },
              { icon: Truck, title: "We Run Your Day-to-Day", body: "Booking confirmations, post-job check-ins, review responses, maintenance reminders. All handled for you!" },
              { icon: PieChart, title: "We Kill Your Paperwork", body: "Morning briefings, inbox sorted, weekly reports with real numbers. 20+ hours of office work off your plate every week!" },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <Card3D key={i} className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-white shadow-[inset_0_0_0_1px_rgba(2,132,199,0.12),0_2px_8px_rgba(0,0,0,0.04)]">
                      <Icon className="h-5 w-5 text-axonBlue" />
                    </div>
                    <h3 className="mt-4 text-[16px] font-bold text-axonText">{card.title}</h3>
                    <p className="mt-2 text-[13px] leading-[1.65] text-gray-500">{card.body}</p>
                  </div>
                </Card3D>
              );
            })}
          </div>
        </Fade>

      </div>{/* close 720px container for full-width tweet carousel */}

      <TweetCarousel />

      <div className="mx-auto max-w-[720px] px-6">

        {/* ═══ VIDEO: MARK CUBAN ON AI ═══ */}
        <VideoEmbed />

        {/* ═══ THE NUMBERS ═══ */}
        <Fade className="mt-24">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-card md:p-10">
            <p className="mb-6 text-center text-xs font-semibold tracking-[0.2em] text-axonBlue">WHAT OUR CLIENTS GET BACK</p>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-gray-200">
              {[
                { value: "20+", label: "Hours saved per week on admin and ops" },
                { value: "<2 hr", label: "Average lead response time" },
                { value: "100%", label: "Follow-up rate on every inquiry" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-[44px] font-bold leading-none tracking-tight text-axonText md:text-[52px]">{stat.value}</p>
                  <p className="mt-3 text-[13px] font-medium text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Fade>

        {/* ═══ WHAT WE RUN FOR YOU ═══ */}
        <Fade className="mt-24">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">HOW IT WORKS</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] md:text-4xl">
              Your Leads. Your Customers. Your Paperwork. We Handle It All!
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[16px] leading-[1.75] text-gray-500">
              We plug into <span className="font-semibold text-axonText">your email, calendar, CRM, and the tools you already use</span>. Then we run everything for you. Every single day. No new software to learn. No new people to hire. Just results!
            </p>
          </div>
        </Fade>

        <div className="mt-12 space-y-5">
          {[
            {
              icon: Inbox,
              title: "We Answer Every Single Lead",
              desc: "Every call, email, form fill, and voicemail gets a personalized follow-up in your voice within hours. Even the ones that come in at 10pm on a Saturday! Old quotes that went cold? We bring them back to life. Your pipeline stays packed without you lifting a finger.",
              points: ["After-hours leads caught", "Follow-up in your voice", "Old estimates re-engaged"],
            },
            {
              icon: Truck,
              title: "We Run Your Customer Experience",
              desc: "The second a job gets booked, your customer gets a welcome email, a what-to-expect rundown, and a prep checklist. After the job they get a thank-you, a review request, and seasonal maintenance reminders. It all happens automatically and it sounds just like you!",
              points: ["Booking confirmations sent", "Post-job follow-up handled", "Maintenance reminders on autopilot"],
            },
            {
              icon: MessageCircle,
              title: "We Build Your Reputation for You",
              desc: "Every Google review gets a thoughtful, personal response within hours. Happy customers get a nudge to refer their friends and family. Old clients get re-engaged with seasonal tune-up offers. Here is the thing most HVAC owners miss: Google reviews are the #1 driver of organic traffic for local businesses. Every 5-star review you stack is a customer who finds you WITHOUT you paying for an ad. Combine that with amazing post-job follow-up that turns one-time customers into lifelong referral sources, and you have a business that grows itself!",
              points: ["Reviews answered in hours", "Referral engine built in", "#1 source of organic traffic"],
            },
            {
              icon: PieChart,
              title: "We Handle All Your Paperwork",
              desc: "Every morning you get a clean briefing: what happened overnight, what needs your attention, and what we already took care of. Every week you get a written report with your numbers, trends, and clear next steps. Those 20+ hours of office work you were doing yourself? Done. Gone. Over!",
              points: ["Daily morning briefing", "Inbox sorted for you", "Weekly reports with real numbers"],
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

        {/* ═══ THE REAL GROWTH ENGINE ═══ */}
        <Fade className="mt-16">
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-card md:p-8">
            <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">THE BEST HVAC COMPANIES ALREADY KNOW THIS</p>
            <h3 className="mt-3 text-xl font-bold tracking-tight md:text-2xl">
              Great Customer Service Builds Referrals. Google Reviews Drive Organic Traffic. You Stop Paying for Ads.
            </h3>
            <p className="mt-4 text-[14px] leading-[1.7] text-gray-500">
              Think about where your best customers came from. It was not a Facebook ad. It was a neighbor who told them to call you. Or a Google search where your 4.8 stars and 200+ reviews made the decision easy.
            </p>
            <p className="mt-3 text-[14px] leading-[1.7] text-gray-500">
              That is what Axon builds for you. When every customer gets amazing follow-up, when every review gets a personal response, when maintenance reminders keep you top-of-mind, you create a reputation engine. Referrals go up. Reviews stack. Organic traffic grows. And one day you look at your ad budget and realize you do not need it anymore!
            </p>
            <p className="mt-3 text-[14px] leading-[1.7] text-gray-500">
              <span className="font-semibold text-axonText">Google reviews are the #1 factor in local search rankings.</span> Every single review you respond to makes you more visible to homeowners searching &ldquo;HVAC near me&rdquo; right now. That is free traffic. That is free leads. That is how the best HVAC companies in the country grow without spending a fortune on marketing!
            </p>
          </div>
        </Fade>

        {/* ═══ COMPARISON TABLE ═══ */}
        <Fade className="mt-16">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">HOW WE COMPARE</p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] md:text-3xl">
              Hiring vs. Software vs. Axon
            </h2>
          </div>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-gray-200/80 bg-white p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_-8px_rgba(2,132,199,0.12),0_24px_60px_-12px_rgba(0,0,0,0.06)]">
            <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-[13px]">
              <thead>
                <tr>
                  <th className="rounded-tl-xl bg-gray-50/80 px-4 py-3.5 font-semibold text-gray-600" />
                  <th className="bg-gradient-to-b from-sky-50 to-white px-4 py-3.5 text-center font-semibold text-axonBlue">Axon</th>
                  <th className="bg-gray-50/80 px-4 py-3.5 text-center font-semibold text-gray-600">Hiring Someone</th>
                  <th className="rounded-tr-xl bg-gray-50/80 px-4 py-3.5 text-center font-semibold text-gray-600">DIY Software</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Answers every lead in under 2 hours", axon: "ok", hire: "partial", diy: "no" },
                  { label: "Responds to Google reviews daily", axon: "ok", hire: "partial", diy: "partial" },
                  { label: "Sends post-job follow-ups automatically", axon: "ok", hire: "partial", diy: "no" },
                  { label: "Morning briefing + weekly reports", axon: "ok", hire: "no", diy: "no" },
                  { label: "Works nights, weekends, holidays", axon: "ok", hire: "no", diy: "ok" },
                  { label: "Builds referral and review engine", axon: "ok", hire: "partial", diy: "no" },
                  { label: "No training or management needed", axon: "ok", hire: "no", diy: "partial" },
                  { label: "Live in 2 weeks", axon: "ok", hire: "no", diy: "partial" },
                  { label: "Costs less than $60K/yr", axon: "ok", hire: "no", diy: "ok" },
                ].map((row) => (
                  <tr key={row.label} className="border-t border-gray-100">
                    <td className="px-4 py-3.5 font-medium text-gray-800">{row.label}</td>
                    <td className="bg-sky-50/30 px-4 py-3.5 text-center">
                      {row.axon === "ok" && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-3.5 w-3.5" strokeWidth={2.5} /></span>}
                      {row.axon === "partial" && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Minus className="h-3.5 w-3.5" strokeWidth={2.5} /></span>}
                      {row.axon === "no" && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-400"><X className="h-3.5 w-3.5" strokeWidth={2.5} /></span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {row.hire === "ok" && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-3.5 w-3.5" strokeWidth={2.5} /></span>}
                      {row.hire === "partial" && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Minus className="h-3.5 w-3.5" strokeWidth={2.5} /></span>}
                      {row.hire === "no" && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-400"><X className="h-3.5 w-3.5" strokeWidth={2.5} /></span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {row.diy === "ok" && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-3.5 w-3.5" strokeWidth={2.5} /></span>}
                      {row.diy === "partial" && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Minus className="h-3.5 w-3.5" strokeWidth={2.5} /></span>}
                      {row.diy === "no" && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-400"><X className="h-3.5 w-3.5" strokeWidth={2.5} /></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Fade>

        {/* ═══ MID-PAGE CTA — SELL THE DREAM ═══ */}
        <Fade className="mt-16">
          <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-white to-sky-50/50 p-8 text-center shadow-card">
            <h3 className="text-xl font-bold tracking-tight md:text-2xl">
              Stop Working in Your Business. Start Working on It.
            </h3>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-[1.7] text-gray-500">
              Imagine waking up to a clean briefing instead of chaos. Every lead already followed up. Every review already answered. Your reputation growing while you sleep. No more Sunday nights catching up on emails. That is what HVAC owners get with Axon, and it starts in just two weeks!
            </p>
            <a
              href="#book"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-axonBlue px-8 py-3.5 text-[14px] font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-[0_0_50px_-4px_rgba(2,132,199,0.4)]"
            >
              Take the Next Step <ChevronRight className="h-4 w-4" />
            </a>
            <p className="mt-3 text-[12px] text-gray-400">For HVAC companies ready to grow without adding headcount</p>
          </div>
        </Fade>

        {/* ═══ REVIEWS ═══ */}
        <Fade className="mt-24">
          <p className="mb-6 text-center text-xs font-semibold tracking-[0.2em] text-gray-400">
            HVAC OWNERS ARE LOVING THIS
          </p>
        </Fade>
        <div className="space-y-3">
          {reviews.map((review, i) => (
            <ReviewCard key={i} review={review} delay={i * 0.04} />
          ))}
        </div>

        {/* ═══ WHAT HAPPENS ON THE CALL ═══ */}
        <Fade className="mt-24">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">YOUR 30-MINUTE STRATEGY CALL</p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] md:text-3xl">
              Here&apos;s Exactly How We Get You There.
            </h2>
          </div>
        </Fade>
        <div className="mt-8 space-y-4">
          {[
            { step: "1", title: "We learn exactly how your HVAC company runs", body: "How your leads come in. How jobs get booked. How follow-ups happen (or don't). Where your time actually goes every week. We figure out exactly how much money and time your current setup is costing you!" },
            { step: "2", title: "We show you everything that can run on autopilot", body: "Lead follow-up, review responses, customer onboarding, daily admin, weekly reporting. We go through every single task that doesn't need a human and show you what it looks like when it just... runs itself!" },
            { step: "3", title: "We build a custom system just for your business", body: "Not a cookie-cutter template. A system built around your tools, your voice, and the way you actually work. Plugs right into your email, CRM, and calendar. Live in two weeks. You review and approve, we handle everything else!" },
          ].map((item, i) => (
            <Fade key={i} delay={i * 0.06}>
              <Card3D className="px-5 py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-axonBlue text-[13px] font-bold text-white shadow-glow">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-axonText">{item.title}</p>
                    <p className="mt-1.5 text-[14px] leading-[1.65] text-gray-500">{item.body}</p>
                  </div>
                </div>
              </Card3D>
            </Fade>
          ))}
        </div>

        {/* ═══ CALENDLY EMBED ═══ */}
        <div id="book" />
        <Fade className="mt-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-[-0.02em] md:text-3xl">Get Your Nights and Weekends Back!</h2>
            <p className="mt-2 text-[14px] text-gray-500">Pick a time below. In 30 minutes we&apos;ll learn how your HVAC company runs, show you what&apos;s costing you money, and walk you through exactly how we fix it. If it&apos;s a fit, your system can be live in two weeks!</p>
          </div>
          <div className="mt-8">
            <CalendlyEmbed />
          </div>
          <p className="mt-5 text-center text-[13px] text-gray-400">
            Monday to Thursday · 10am to 2pm · Limited spots weekly
          </p>
        </Fade>

        {/* ═══ MICRO FOOTER ═══ */}
        <p className="mt-20 pb-20 text-center text-xs text-gray-400 md:pb-8">
          © {new Date().getFullYear()} Axon · axonservices.dev
        </p>
      </div>
    </div>
  );
}
