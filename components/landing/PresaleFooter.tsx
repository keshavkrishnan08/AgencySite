import { Logo } from "@/components/ui/Logo";

/* Footer for the ad landing page. Same shape as the marketing footer, with the
   product and prep columns removed — on a paid page every in-app link is a way
   to leave the funnel without giving us an email. Only anchors stay. */
export function PresaleFooter() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--border)", background: "var(--bg-sunk)" }}>
      <div className="container-wide py-14">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            {/* No link: on a paid page the logo is another way out. */}
          <Logo href={null} />
            <p className="mt-4 text-sm leading-relaxed text-ink-2">
              A private room to practice interviews until the anxiety turns into confidence.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-10 gap-y-3">
            {[
              ["#how", "How it works"],
              ["#features", "Features"],
              ["#proof", "Results"],
              ["#pricing", "Pricing"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-sm text-ink-2 transition-colors hover:text-primary-ink"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div className="hairline my-10" />

        <div className="flex flex-col items-start justify-between gap-4 text-xs text-ink-3 sm:flex-row sm:items-center">
          <p>© 2026 Axon Careers. Built by Keshav Krishnan.</p>
          <p className="max-w-md sm:text-right">
            Axon Careers is an AI practice tool, not a guarantee of employment. Results vary by individual.
          </p>
        </div>
      </div>
    </footer>
  );
}
