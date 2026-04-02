"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  FileCheck,
  Inbox,
  Menu,
  MessageCircle,
  PieChart,
  Send,
  Star,
  TrendingUp,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";

const HeroParticlesScene = dynamic(() => import("@/components/hero-particles-scene"), {
  ssr: false,
});

const calendlyHref = "https://calendly.com/keshavkrishnanbusiness/30min";

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.7, ease: "easeOut", delay }}
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
        className={`preserve-3d backface-hidden rounded-2xl border border-axonBorder bg-white shadow-card transition-shadow duration-300 hover:shadow-cardHover ${className}`}
      >
        {children}
      </motion.div>
    </div>
  );
}

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let f = 0;
    const step = () => { f++; const t = Math.min(f / 50, 1); setVal(Math.round(to * (1 - (1 - t) ** 3))); if (f < 50) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, [inView, to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

export default function AxonLandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [blurNav, setBlurNav] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fn = () => setBlurNav(window.scrollY > 10);
    fn();
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className="relative overflow-x-clip bg-axonBg text-axonText">
      {/* Nav */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${blurNav ? "border-b border-gray-200/60 bg-white/70 shadow-[0_1px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl" : ""}`}>
        <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6 md:px-10">
          <a href="#home" className="text-sm font-bold tracking-[0.32em] text-axonText">AXON</a>
          <div className="hidden items-center gap-8 lg:flex">
            {[
              { href: "#problem", label: "Problem" },
              { href: "#system", label: "System" },
              { href: "#how", label: "How It Works" },
              { href: "#faq", label: "FAQ" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="text-[13px] text-gray-500 transition-colors hover:text-axonText">{l.label}</a>
            ))}
            <a href={calendlyHref} target="_blank" rel="noopener noreferrer" className="rounded-full bg-axonBlue px-5 py-2.5 text-[13px] font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-[0_0_50px_-4px_rgba(2,132,199,0.4)]">
              Book a Call
            </a>
          </div>
          <button onClick={() => setMobileOpen(true)} className="lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
        </nav>
      </header>

      {mobileOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[60] bg-white p-8 lg:hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold tracking-[0.32em]">AXON</span>
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-14 flex flex-col gap-7 text-2xl font-medium">
            {[{ href: "#problem", label: "Problem" }, { href: "#system", label: "System" }, { href: "#how", label: "How It Works" }, { href: "#faq", label: "FAQ" }].map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="text-gray-400">{l.label}</a>
            ))}
            <a href={calendlyHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-axonBlue">Book a Call <ChevronRight className="h-4 w-4" /></a>
          </div>
        </motion.div>
      )}

      <main>
        {/* ── HERO ── */}
        <section id="home" className="relative min-h-screen pt-[72px]" onMouseMove={(e) => setPointer({ x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 })}>
          <div className="absolute inset-0">
            <HeroParticlesScene pointer={pointer} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-axonBg/50 to-axonBg" />
          </div>
          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl flex-col items-center justify-center px-6 text-center md:px-10">
            <motion.span initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-axonBlue shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <Zap className="h-3.5 w-3.5" /> AI operations infrastructure for service businesses
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 44 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="max-w-[900px] text-[42px] font-bold leading-[1.08] tracking-tighterHero text-axonText md:text-[72px]">
              We Run Your Back Office. Every Single Day.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.22 }} className="mt-7 max-w-[640px] text-lg leading-[1.75] text-gray-500 md:text-xl">
              Axon installs a complete <span className="font-semibold text-axonText">AI operations infrastructure</span> into your business. Email, leads, reviews, reports, admin. All of it runs <span className="font-semibold text-axonText">autonomously</span> so nothing gets missed and you get your time back.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.34 }} className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a href={calendlyHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-axonBlue px-8 py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-[0_0_50px_-4px_rgba(2,132,199,0.4)]">
                Get Your Free Operations Audit <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#system" className="rounded-full border border-gray-200 bg-white px-8 py-3.5 text-sm font-medium text-axonText shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                See What The System Does
              </a>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }} className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-gray-400">
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-axonBlue" />Live in 2 weeks</span>
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-axonBlue" />No software to learn</span>
              <span className="flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5 text-axonBlue" />No new hires</span>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.6 }} className="mt-8 text-[13px] text-gray-400">
              Built for service businesses across HVAC, med spas, law firms, and more.
            </motion.p>
          </div>
        </section>

        {/* ── PROBLEM ── */}
        <section id="problem" className="py-28 md:py-36">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <div className="grid items-start gap-14 lg:grid-cols-[1fr_1.1fr]">
              <Reveal>
                <div className="lg:sticky lg:top-28">
                  <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">THE PROBLEM</p>
                  <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.02em] md:text-[52px] md:leading-[1.1]">
                    You Built the Business. Now It&apos;s Burying You.
                  </h2>
                  <p className="mt-6 text-lg leading-[1.75] text-gray-500">
                    Revenue grows, but so does the admin. <span className="font-semibold text-axonText">Leads slip. Emails pile up. Reviews go unanswered.</span> You become the bottleneck to your own growth because there is only one of you.
                  </p>
                </div>
              </Reveal>
              <div className="space-y-4">
                {[
                  { icon: Send, text: "A lead emails you at 8pm. Nobody responds. By morning they have called your competitor." },
                  { icon: Star, text: "Your last 12 Google reviews have no response. Every potential customer sees that silence before they call." },
                  { icon: Inbox, text: "Your inbox has 200 unread messages. Somewhere in there is a $4,000 job you are about to lose." },
                  { icon: Clock, text: "You spent last Sunday doing invoices and writing follow-up emails instead of being with your family." },
                  { icon: TrendingUp, text: "You know you need an operations person but cannot justify a $60K salary for someone who might not work out." },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <Reveal key={i} delay={i * 0.05}>
                      <Card3D className="p-5">
                        <div className="flex gap-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 shadow-inner">
                            <Icon className="h-4 w-4 text-axonBlue" />
                          </div>
                          <p className="text-[15px] leading-[1.7] text-gray-600">{item.text}</p>
                        </div>
                      </Card3D>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── PRIMING ── */}
        <section className="relative py-28 md:py-36">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-50/40 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-6xl px-6 md:px-10">
            <Reveal>
              <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">THE REAL COST</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.02em] md:text-[52px] md:leading-[1.1]">
                Every Day You Wait, Your Business Leaks Revenue.
              </h2>
            </Reveal>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {[
                { number: 60000, prefix: "$", suffix: "/yr", label: "What an operations hire costs before they prove anything" },
                { number: 15000, prefix: "$", suffix: "/mo", label: "Revenue lost to missed leads, slow follow-ups, and unanswered reviews" },
                { number: 20, prefix: "", suffix: " hrs/wk", label: "Shallow admin work you do that does not grow the business" },
              ].map((stat, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <Card3D className="p-8">
                    <p className="text-5xl font-semibold tracking-tight text-axonBlue md:text-6xl">
                      {stat.prefix}<CountUp to={stat.number} suffix={stat.suffix} />
                    </p>
                    <p className="mt-5 text-[15px] leading-[1.7] text-gray-500">{stat.label}</p>
                  </Card3D>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.2} className="mt-14 text-center">
              <p className="mx-auto max-w-2xl text-xl leading-[1.7] text-gray-600 md:text-2xl">
                You do not need another app. You do not need another hire. You need a <span className="font-semibold text-axonText">system that does the work</span>. Every day. Without being managed.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── SOLUTION ── */}
        <section id="system" className="py-28 md:py-36">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <Reveal>
              <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">WHAT YOU GET</p>
              <h2 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight tracking-[-0.02em] md:text-[52px] md:leading-[1.1]">
                An AI Operations System That Does the Work For You.
              </h2>
              <p className="mt-6 max-w-3xl text-lg leading-[1.75] text-gray-500">
                Not a chatbot. Not a dashboard. Not another tool to check. Axon is a network of <span className="font-semibold text-axonText">autonomous AI workflows</span> that plug into your existing tools and run your entire back office daily. <span className="font-semibold text-axonText">All admin work done. All follow-ups sent. All reports written.</span> Autonomously.
              </p>
            </Reveal>

            <div className="mt-20 space-y-20">
              {/* Email, Leads & Pipeline */}
              <Reveal>
                <div className="grid items-start gap-10 md:grid-cols-[1.2fr_1fr]">
                  <div>
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <Inbox className="h-5 w-5 text-axonBlue" />
                    </div>
                    <h3 className="mt-5 text-3xl font-semibold tracking-tight">Email, Leads & Pipeline</h3>
                    <p className="mt-4 text-[16px] leading-[1.8] text-gray-500">Your inbox is triaged every morning. Urgent items are flagged, routine inquiries get <span className="font-semibold text-axonText">draft replies in your voice</span>, and junk is cleared. Every new lead gets a <span className="font-semibold text-axonText">personalized follow-up within hours</span>. Leads are tracked, scored, and stale ones get re-engaged automatically.</p>
                  </div>
                  <Card3D className="p-6 md:p-8">
                    <p className="mb-5 text-xs font-semibold tracking-[0.15em] text-axonBlue">WHAT RUNS DAILY</p>
                    <div className="space-y-3.5">
                      {["Draft responses in your voice", "Priority-first triage", "Pipeline always current", "Stale leads re-engaged"].map((p) => (
                        <div key={p} className="flex items-center gap-3">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-50"><Check className="h-3 w-3 text-axonBlue" /></div>
                          <p className="text-sm text-gray-600">{p}</p>
                        </div>
                      ))}
                    </div>
                  </Card3D>
                </div>
              </Reveal>

              {/* Reviews, Communication & Reputation */}
              <Reveal>
                <div className="grid items-start gap-10 md:grid-cols-[1.2fr_1fr] md:[&>*:first-child]:order-2">
                  <div>
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <MessageCircle className="h-5 w-5 text-axonBlue" />
                    </div>
                    <h3 className="mt-5 text-3xl font-semibold tracking-tight">Reviews, Communication & Reputation</h3>
                    <p className="mt-4 text-[16px] leading-[1.8] text-gray-500">Every new Google review gets a <span className="font-semibold text-axonText">professional, context-aware response</span>. Appointment confirmations, follow-ups, thank-you emails, and re-engagement campaigns for dormant customers are drafted and managed. Your customers <span className="font-semibold text-axonText">hear from you consistently</span> without you writing a single email.</p>
                  </div>
                  <Card3D className="p-6 md:p-8">
                    <p className="mb-5 text-xs font-semibold tracking-[0.15em] text-axonBlue">WHAT RUNS DAILY</p>
                    <div className="space-y-3.5">
                      {["Review responses drafted", "Dormant customer reactivation", "Brand voice consistency", "Post-service follow-ups"].map((p) => (
                        <div key={p} className="flex items-center gap-3">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-50"><Check className="h-3 w-3 text-axonBlue" /></div>
                          <p className="text-sm text-gray-600">{p}</p>
                        </div>
                      ))}
                    </div>
                  </Card3D>
                </div>
              </Reveal>

              {/* Reports, Documents & Intelligence */}
              <Reveal>
                <div className="grid items-start gap-10 md:grid-cols-[1.2fr_1fr]">
                  <div>
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <PieChart className="h-5 w-5 text-axonBlue" />
                    </div>
                    <h3 className="mt-5 text-3xl font-semibold tracking-tight">Reports, Documents & Intelligence</h3>
                    <p className="mt-4 text-[16px] leading-[1.8] text-gray-500">Proposals are drafted from real conversation details. Invoices are generated and tracked. Every week you get a <span className="font-semibold text-axonText">written revenue analysis</span>, client health report, pipeline forecast, and competitor monitoring. Not a dashboard. A <span className="font-semibold text-axonText">written report with recommendations</span> you can act on.</p>
                  </div>
                  <Card3D className="p-6 md:p-8">
                    <p className="mb-5 text-xs font-semibold tracking-[0.15em] text-axonBlue">WHAT RUNS DAILY</p>
                    <div className="space-y-3.5">
                      {["Weekly written insights", "Proposal and invoice generation", "Decision-ready briefings", "Competitor monitoring"].map((p) => (
                        <div key={p} className="flex items-center gap-3">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-50"><Check className="h-3 w-3 text-axonBlue" /></div>
                          <p className="text-sm text-gray-600">{p}</p>
                        </div>
                      ))}
                    </div>
                  </Card3D>
                </div>
              </Reveal>

              {/* Administration & Daily Operations */}
              <Reveal>
                <div className="grid items-start gap-10 md:grid-cols-[1.2fr_1fr] md:[&>*:first-child]:order-2">
                  <div>
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <FileCheck className="h-5 w-5 text-axonBlue" />
                    </div>
                    <h3 className="mt-5 text-3xl font-semibold tracking-tight">Administration & Daily Operations</h3>
                    <p className="mt-4 text-[16px] leading-[1.8] text-gray-500">All the miscellaneous tasks that eat away at your day are handled automatically. <span className="font-semibold text-axonText">Job scheduling, employee follow-ups, vendor coordination</span>, data entry across your CRM, accounting platform, and every other tool you use. Calendar management, file organization, and recurring operational tasks are completed daily without you touching them.</p>
                    <p className="mt-4 text-[16px] leading-[1.8] text-gray-500">Every morning, a briefing is ready with everything that happened overnight, what needs your decision today, and what was already handled. The small stuff that <span className="font-semibold text-axonText">silently eats 3 to 4 hours of your day</span> is gone.</p>
                  </div>
                  <Card3D className="p-6 md:p-8">
                    <p className="mb-5 text-xs font-semibold tracking-[0.15em] text-axonBlue">WHAT RUNS DAILY</p>
                    <div className="space-y-3.5">
                      {["Job scheduling and updates", "Employee follow-ups and coordination", "Vendor and supplier communications", "Data entry across all your tools", "Daily morning briefing", "Calendar and file management"].map((p) => (
                        <div key={p} className="flex items-center gap-3">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-50"><Check className="h-3 w-3 text-axonBlue" /></div>
                          <p className="text-sm text-gray-600">{p}</p>
                        </div>
                      ))}
                    </div>
                  </Card3D>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── COMPETITIVE EDGE ── */}
        <section className="relative py-28 md:py-36">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-sky-50/30 to-transparent" />
          <div className="relative mx-auto max-w-6xl px-6 md:px-10">
            <div className="grid items-start gap-12 md:grid-cols-2">
              <Reveal>
                <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">YOUR COMPETITIVE EDGE</p>
                <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.02em] md:text-[44px] md:leading-[1.15]">
                  Most Businesses Are Just Starting to Use AI. You Can Skip Ahead.
                </h2>
                <p className="mt-6 text-[16px] leading-[1.8] text-gray-500">
                  Your competitors are experimenting with ChatGPT for one-off tasks. Maybe they draft an email with it. That is not what Axon does.
                </p>
                <p className="mt-4 text-[16px] leading-[1.8] text-gray-500">
                  Axon installs <span className="font-semibold text-axonText">agentic AI infrastructure</span> into your business. Not a single tool. A network of intelligent workflows that run autonomously, every single day, across your entire operation. While your competition is still figuring out prompts, your business runs itself.
                </p>
                <p className="mt-4 text-[16px] leading-[1.8] text-gray-500">
                  This is the difference between using AI as a toy and using AI as <span className="font-semibold text-axonText">infrastructure</span>. Infrastructure compounds. Infrastructure scales. Six months from now, your operation is tighter, faster, and more consistent than any competitor still hiring humans to do what your system already does automatically.
                </p>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="space-y-5">
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
                    <p className="mb-3 text-xs font-semibold tracking-[0.15em] text-gray-400">YOUR COMPETITORS</p>
                    {["Using ChatGPT for one-off tasks", "Manually managing email", "Hiring and hoping", "Reacting to problems daily"].map((line) => (
                      <div key={line} className="mt-2.5 flex items-center gap-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                        <p className="text-sm text-gray-400">{line}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-white to-sky-50/50 p-6 shadow-card">
                    <p className="mb-3 text-xs font-semibold tracking-[0.15em] text-axonBlue">YOUR BUSINESS WITH AXON</p>
                    {["Autonomous daily operations", "Every lead followed up in hours, not days", "Full reporting and intelligence weekly", "Infrastructure that compounds over time"].map((line) => (
                      <div key={line} className="mt-2.5 flex items-center gap-3">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100">
                          <Check className="h-3 w-3 text-axonBlue" />
                        </div>
                        <p className="text-sm font-medium text-axonText">{line}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" className="py-28 md:py-36">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <Reveal>
              <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">HOW IT WORKS</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.02em] md:text-[52px] md:leading-[1.1]">
                Three Steps. Two Weeks. Then It Runs.
              </h2>
            </Reveal>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {[
                { step: "01", title: "We Audit Everything", body: "We map your entire operation: how leads arrive, how customers are handled, what tools you use, and where time and money leak. You get a full picture of what is broken." },
                { step: "02", title: "We Build Your System", body: "In two weeks we configure 10 to 15 daily workflows connected to your email, calendar, CRM, and tools. Nothing to install. Nothing to learn. It plugs into what you already use." },
                { step: "03", title: "It Runs. You Review.", body: "Every day the system executes. You review, approve, and adjust. We monitor performance and continuously optimize so it gets sharper every week." },
              ].map((step, i) => (
                <Reveal key={step.step} delay={i * 0.08}>
                  <Card3D className="relative overflow-hidden p-8">
                    <span className="absolute -right-3 -top-6 text-[120px] font-bold leading-none text-gray-100">{step.step}</span>
                    <div className="relative">
                      <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">STEP {step.step}</p>
                      <h3 className="mt-4 text-2xl font-semibold">{step.title}</h3>
                      <p className="mt-4 text-[15px] leading-[1.75] text-gray-500">{step.body}</p>
                    </div>
                  </Card3D>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.15} className="mt-20 text-center">
              <div className="mx-auto max-w-3xl">
                <h3 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Stop Managing Operations. Start Running Your Business.
                </h3>
                <p className="mt-5 text-lg leading-[1.75] text-gray-500">
                  Book a free 30-minute operations audit. Within 24 hours, we will show you exactly how your business can save 20+ hours a week of shallow admin work and stop losing revenue to missed leads and slow follow-ups.
                </p>
                <a href={calendlyHref} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-full bg-axonBlue px-10 py-4 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-[0_0_50px_-4px_rgba(2,132,199,0.4)]">
                  Get Your Free Operations Audit <ArrowRight className="h-4 w-4" />
                </a>
                <p className="mt-5 text-xs text-gray-400">Monday to Thursday · 10am to 2pm · Limited slots weekly</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="relative py-28 md:py-36">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-50/30 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-4xl px-6 md:px-10">
            <Reveal>
              <p className="text-xs font-semibold tracking-[0.2em] text-axonBlue">COMMON QUESTIONS</p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.02em] md:text-[44px]">Before You Ask</h2>
            </Reveal>
            <div className="mt-12 space-y-4">
              {[
                { q: "Is this a chatbot on my website?", a: "No. Your customers never see or interact with Axon. It is a behind-the-scenes operations system that handles your email, leads, reviews, reports, and admin internally. Think of it as an invisible operations department, not a customer-facing tool." },
                { q: "What does it cost?", a: "There is a one-time setup fee based on the complexity of your operation, plus a small ongoing monthly cost. On a 30-minute call we can give you an exact number based on your specific business. Most clients pay less than 10% of what an operations hire would cost." },
                { q: "How is this different from hiring a VA or using ChatGPT?", a: "A VA is one person doing tasks manually. ChatGPT is a tool you have to prompt every time. Axon is infrastructure. Autonomous workflows that run daily without being asked, across your entire operation, connected to your real tools. It does not need to be managed. It does the managing." },
                { q: "Do I need to be technical?", a: "Not at all. We build, configure, and maintain the entire system. You review outputs and approve them. If you can read an email, you can use Axon." },
              ].map((faq, i) => (
                <Reveal key={i} delay={i * 0.04}>
                  <Card3D className="p-6">
                    <h3 className="text-lg font-semibold text-axonText">{faq.q}</h3>
                    <p className="mt-3 text-[15px] leading-[1.75] text-gray-500">{faq.a}</p>
                  </Card3D>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 text-sm text-gray-400 md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <p className="text-xs font-bold tracking-[0.32em] text-axonText">AXON</p>
            <p className="mt-1.5">© {new Date().getFullYear()} Axon. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-axonText">Privacy</a>
            <a href="#" className="hover:text-axonText">Terms</a>
            <a href="mailto:hello@axonops.com" className="hover:text-axonText">hello@axonops.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
