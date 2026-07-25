"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Briefcase, Search, ArrowRight, CheckCircle2, AlertTriangle, DollarSign,
  ListChecks, Layers, Target,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { getOnboarding, getProfile, setProfile, getPrefs } from "@/lib/store";
import { getJobBreakdown, money } from "@/lib/job-insights";
import { QUESTION_BANK } from "@/lib/question-bank";
import { ROLES } from "@/lib/roles";
import { track } from "@/lib/analytics";

/* Job Breakdown — a flat, embedded, non-AI page: the real interview process for
   your role, what's assessed, the skills, a salary band, what interviewers look
   for, and the mistakes to avoid. Everything sits on the background, Stripe-style
   — thin rules, no heavy cards. Change the role inline to re-key the whole page. */

export default function JobPage() {
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setMounted(true);
    const p = getProfile();
    const ob = getOnboarding();
    setRole(p.targetRole || ob?.targetRole || "Office Manager");
  }, []);

  const { family } = useMemo(() => getJobBreakdown(role, getPrefs().seniority), [role]);
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return ROLES.filter((r) => r.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const relevantQuestions = useMemo(() => {
    const wanted = new Set(family.focusTypes);
    return QUESTION_BANK.filter((c) => wanted.has(c.key)).flatMap((c) => c.questions).slice(0, 6);
  }, [family]);

  const applyRole = (r: string) => {
    const v = r.trim();
    if (!v) return;
    setRole(v);
    setProfile({ targetRole: v });
    setQuery("");
    setFocused(false);
    track("job:role_change", { role: v, family: family.key });
  };

  if (!mounted) return <AppShell requirePremium={false}><main className="min-h-screen" /></AppShell>;

  const practiceHref = `/practice?autostart=1&types=${family.focusTypes.join(",")}&count=8`;

  return (
    <AppShell requirePremium={false}>
      <main className="container-wide py-8 sm:py-10">
        {/* Header */}
        <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.14em] text-primary-ink">
          <Briefcase size={14} /> Job breakdown
        </div>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink sm:text-4xl">{role}</h1>
        <p className="mt-1 text-ink-2">{family.label} · {family.blurb}</p>

        {/* Change role — inline, embedded */}
        <div className="relative mt-5 max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setFocused(true); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={(e) => { if (e.key === "Enter") applyRole(query); }}
            placeholder="Break down a different role…"
            className="field !pl-9 !py-2.5 text-sm"
          />
          {focused && suggestions.length > 0 && (
            <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-lg" style={{ borderColor: "var(--border)" }}>
              {suggestions.map((s) => (
                <button key={s} onMouseDown={() => applyRole(s)} className="block w-full px-4 py-2.5 text-left text-sm text-ink-2 transition-colors hover:bg-bg-tint hover:text-ink">{s}</button>
              ))}
            </div>
          )}
        </div>

        {/* Salary band */}
        <Section icon={DollarSign} title="Typical pay" note="US median range · varies by location and employer">
          <div className="flex items-end justify-between">
            <Pay label="Entry" value={family.salary.low} />
            <Pay label="Median" value={family.salary.mid} emphasis />
            <Pay label="Senior" value={family.salary.high} />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
            <div className="h-full rounded-full" style={{ width: "100%", background: "linear-gradient(90deg, var(--primary-soft), var(--primary), var(--primary-ink))" }} />
          </div>
        </Section>

        {/* Interview process */}
        <Section icon={Layers} title="The interview process" note={`${family.process.length} typical rounds`}>
          <ol className="relative ml-3 border-l" style={{ borderColor: "var(--border-strong)" }}>
            {family.process.map((r, i) => (
              <li key={r.name} className="relative pb-5 pl-6 last:pb-0">
                <span className="absolute -left-[7px] top-1 grid h-3.5 w-3.5 place-items-center rounded-full ring-4 ring-[var(--bg)]" style={{ background: "var(--primary)" }} />
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-mono text-2xs font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-medium text-ink">{r.name}</span>
                  <span className="text-2xs text-ink-3">· {r.format}</span>
                </div>
                <p className="mt-0.5 text-sm text-ink-2">{r.focus}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* Competencies */}
        <Section icon={Target} title="What's assessed" note="the competencies every round is scoring">
          <div className="flex flex-wrap gap-2">
            {family.competencies.map((c) => (
              <span key={c} className="rounded-full border px-3 py-1 text-sm text-ink-2" style={{ borderColor: "var(--border-strong)" }}>{c}</span>
            ))}
          </div>
        </Section>

        {/* Skills */}
        <Section icon={ListChecks} title="Skills that matter">
          <div className="grid gap-6 sm:grid-cols-2">
            <SkillCol title="Hard skills" items={family.hardSkills} />
            <SkillCol title="Soft skills" items={family.softSkills} />
          </div>
        </Section>

        {/* Look for / red flags */}
        <Section icon={CheckCircle2} title="Win it / lose it">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-sage-ink">
                <CheckCircle2 size={13} /> What they look for
              </p>
              <ul className="space-y-2">
                {family.lookFor.map((x) => (
                  <li key={x} className="flex items-start gap-2 text-sm text-ink-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--sage)" }} />{x}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-coral-ink">
                <AlertTriangle size={13} /> Red flags to avoid
              </p>
              <ul className="space-y-2">
                {family.redFlags.map((x) => (
                  <li key={x} className="flex items-start gap-2 text-sm text-ink-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--coral)" }} />{x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Practice these */}
        <Section icon={Target} title="Questions you'll get" note="drawn from this role's common rounds">
          <ul className="space-y-2">
            {relevantQuestions.map((q) => (
              <li key={q} className="flex items-start gap-2.5 rounded-lg border px-4 py-2.5 text-sm text-ink-2" style={{ borderColor: "var(--border)" }}>
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--primary)" }} />{q}
              </li>
            ))}
          </ul>
          <ButtonLink href={practiceHref} className="mt-5" onClick={() => track("job:practice", { family: family.key })}>
            Practice this role <ArrowRight size={16} />
          </ButtonLink>
        </Section>
      </main>
    </AppShell>
  );
}

/* Embedded card — a recessed panel (no border, no shadow), content inside. */
function Section({ icon: Icon, title, note, children }: { icon: typeof Briefcase; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="card mt-5 p-6 sm:p-7">
      <div className="mb-4 flex items-baseline gap-2.5">
        <Icon size={16} className="translate-y-0.5 text-primary" />
        <h2 className="font-serif text-lg font-semibold text-ink">{title}</h2>
        {note && <span className="text-xs text-ink-3">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Pay({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className={emphasis ? "text-center" : "text-center opacity-70"}>
      <p className="text-2xs uppercase tracking-wider text-ink-3">{label}</p>
      <p className={emphasis ? "font-mono text-2xl font-semibold text-ink" : "font-mono text-lg font-semibold text-ink-2"}>{money(value)}</p>
    </div>
  );
}

function SkillCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-ink-3">{title}</p>
      <ul className="space-y-1.5">
        {items.map((s) => (
          <li key={s} className="flex items-start gap-2 text-sm text-ink-2">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary" />{s}
          </li>
        ))}
      </ul>
    </div>
  );
}
