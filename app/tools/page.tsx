import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
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
  { href: "/tools/gap-story", icon: GapStoryIcon, title: "Gap Story Builder", desc: "Turn any résumé gap into a confident 30-second answer.", badge: "Most popular" },
  { href: "/tools/company-research", icon: CompanyIcon, title: "Company Research Briefing", desc: "A one-page briefing so you walk in knowing the company." },
  { href: "/tools/question-predictor", icon: PredictorIcon, title: "Question Predictor", desc: "Paste the posting — get the 5 questions they'll likely ask." },
  { href: "/tools/salary", icon: SalaryIcon, title: "Salary Negotiation", desc: "Practice the offer conversation until your voice is steady." },
  { href: "/tools/debrief", icon: DebriefIcon, title: "Post-Interview Debrief", desc: "Score how the real interview actually went." },
  { href: "/tools/your-story", icon: StoryIcon, title: "Your Story Builder", desc: "Build your 'tell me about yourself' in four steps." },
  { href: "/tools/tracker", icon: TrackerIcon, title: "Interview Tracker", desc: "Track real interviews and outcomes — offers are the point." },
];

export default function ToolsPage() {
  return (
    <>
      <AppNav />
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
            return (
              <Link
                key={t.href}
                href={t.href}
                className="card group relative h-full p-7 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                {t.badge && (
                  <span className="absolute right-6 top-6 rounded-full bg-gold-soft px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-gold-ink">
                    ⭐ {t.badge}
                  </span>
                )}
                <span
                  className="grid h-12 w-12 place-items-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-105"
                  style={{ background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))" }}
                >
                  <Icon size={22} />
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
    </>
  );
}
