import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  GapStoryIcon,
  CompanyIcon,
  PredictorIcon,
  SalaryIcon,
  DebriefIcon,
  StoryIcon,
  TrackerIcon,
} from "@/components/icons";

const TOOLS = [
  { href: "/tools/gap-story", icon: GapStoryIcon, title: "Gap Story Builder", desc: "Turn any résumé gap into a confident 30-second answer.", badge: "Most popular", accent: "teal" },
  { href: "/tools/company-research", icon: CompanyIcon, title: "Company Research Briefing", desc: "A one-page briefing so you walk in knowing the company.", accent: "sage" },
  { href: "/tools/question-predictor", icon: PredictorIcon, title: "Question Predictor", desc: "Paste the posting. Get the 5 questions they'll likely ask.", accent: "gold" },
  { href: "/tools/salary", icon: SalaryIcon, title: "Salary Negotiation", desc: "Practice the offer conversation until your voice is steady.", accent: "gold" },
  { href: "/tools/debrief", icon: DebriefIcon, title: "Post-Interview Debrief", desc: "Score how the real interview actually went.", accent: "teal" },
  { href: "/tools/your-story", icon: StoryIcon, title: "Your Story Builder", desc: "Build your 'tell me about yourself' in four steps.", accent: "sage" },
  { href: "/tools/tracker", icon: TrackerIcon, title: "Interview Tracker", desc: "Track real interviews and outcomes. Offers are the point.", accent: "teal" },
];

const accents = {
  teal: {
    halo: "rgba(25,169,184,0.16)",
    tile: "radial-gradient(90% 90% at 24% 16%, rgba(255,255,255,0.42), transparent 44%), linear-gradient(145deg, var(--primary-bright), var(--primary-ink))",
  },
  sage: {
    halo: "rgba(62,157,110,0.16)",
    tile: "radial-gradient(90% 90% at 24% 16%, rgba(255,255,255,0.36), transparent 44%), linear-gradient(145deg, var(--sage), var(--primary-ink))",
  },
  gold: {
    halo: "rgba(184,137,59,0.18)",
    tile: "radial-gradient(90% 90% at 24% 16%, rgba(255,255,255,0.44), transparent 44%), linear-gradient(145deg, var(--amber), var(--gold-ink))",
  },
} as const;

export default function ToolsPage() {
  return (
    <AppShell>
      <main className="container-wide py-10 sm:py-12">
        <header className="mb-10 text-center">
          <h1 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">Your interview toolkit</h1>
          <p className="mx-auto mt-3 max-w-prose text-ink-2">
            Every tool here exists for one reason: the interview that stands between you and the work
            you&apos;re meant to be doing.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const accent = accents[t.accent as keyof typeof accents];
            return (
              <Link
                key={t.href}
                href={t.href}
                className="card group relative h-full overflow-hidden p-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <span
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: accent.halo }}
                  aria-hidden
                />
                {t.badge && (
                  <span className="absolute right-6 top-6 rounded-full bg-gold-soft px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-gold-ink">
                    ⭐ {t.badge}
                  </span>
                )}
                <span
                  className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-[18px] text-white shadow-sm ring-1 ring-white/40 transition-transform group-hover:rotate-[-2deg] group-hover:scale-105"
                  style={{ background: accent.tile }}
                >
                  <span className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-white/15 blur-sm" aria-hidden />
                  <span className="absolute inset-x-2 top-1 h-px bg-white/45" aria-hidden />
                  <Icon size={26} />
                </span>
                <h2 className="mt-5 font-serif text-xl font-semibold text-ink">{t.title}</h2>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">{t.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-ink">
                  Open <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </AppShell>
  );
}
