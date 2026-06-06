import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--border)", background: "var(--bg-sunk)" }}>
      <div className="container-wide py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-ink-2">
              A private room to practice interviews until the anxiety turns into confidence.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-16 gap-y-8 sm:grid-cols-3">
            <FooterCol
              title="Product"
              links={[
                { href: "/onboarding", label: "Start practicing" },
                { href: "/dashboard", label: "Dashboard" },
                { href: "/tools/gap-story", label: "Gap Story Builder" },
                { href: "/tools/company-research", label: "Company Briefing" },
              ]}
            />
            <FooterCol
              title="Tools"
              links={[
                { href: "/tools/question-predictor", label: "Question Predictor" },
                { href: "/tools/salary", label: "Salary Practice" },
                { href: "/tools/debrief", label: "Post-Interview Debrief" },
                { href: "/interview-day", label: "Interview Day Mode" },
              ]}
            />
            <FooterCol
              title="Company"
              links={[
                { href: "#pricing", label: "Pricing" },
                { href: "/whats-changed", label: "What's changed in interviews" },
                { href: "#", label: "Privacy" },
                { href: "#", label: "Contact" },
              ]}
            />
          </div>
        </div>

        <div className="hairline my-10" />

        <div className="flex flex-col items-start justify-between gap-4 text-xs text-ink-3 sm:flex-row sm:items-center">
          <p>© 2026 PrepPath. Built by Keshav Krishnan.</p>
          <p className="max-w-md sm:text-right">
            PrepPath is an AI practice tool, not a guarantee of employment. Results vary by individual.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="font-sans text-2xs font-semibold uppercase tracking-wider text-ink-3">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sm text-ink-2 transition-colors hover:text-primary-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
