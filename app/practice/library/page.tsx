"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, ChevronLeft, Play } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { QUESTION_BANK } from "@/lib/question-bank";
import { cn } from "@/lib/utils";

/* Question Bank browser — a real sub-page of the practice hub. Browse the
   canonical questions by type, search across them, and launch a focused
   session on any category (deep-links into /practice with autostart config). */

function launchHref(cat: (typeof QUESTION_BANK)[number]): string {
  const p = new URLSearchParams({ autostart: "1", count: "6" });
  if (cat.domain) p.set("domain", cat.domain);
  else p.set("types", cat.key);
  return `/practice?${p.toString()}`;
}

export default function LibraryPage() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string>("all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return QUESTION_BANK.map((cat) => ({
      ...cat,
      questions: cat.questions.filter((x) => !query || x.toLowerCase().includes(query)),
    })).filter(
      (cat) => (active === "all" || cat.key === active) && cat.questions.length > 0
    );
  }, [q, active]);

  const total = QUESTION_BANK.reduce((n, c) => n + c.questions.length, 0);

  return (
    <AppShell>
      <main className="container-wide space-y-6 py-8 sm:py-10">
        <div>
          <Link href="/practice" className="btn-ghost mb-3 text-sm">
            <ChevronLeft size={16} /> Back to practice
          </Link>
          <p className="eyebrow">Question bank</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">Browse every question type</h1>
          <p className="mt-1 text-ink-2">
            {total} canonical questions across {QUESTION_BANK.length} types. Find one, or launch a whole category —
            we&apos;ll personalise them to your role.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search questions…"
            className="field !pl-10"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {[{ key: "all", label: "All" }, ...QUESTION_BANK.map((c) => ({ key: c.key, label: c.label }))].map((c) => (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[0.8rem] font-medium transition-all",
                active === c.key ? "border-transparent" : ""
              )}
              style={{
                borderColor: active === c.key ? "var(--primary)" : "var(--border-strong)",
                background: active === c.key ? "var(--primary-soft)" : "var(--surface)",
                color: active === c.key ? "var(--primary-ink)" : "var(--ink-2)",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Categories */}
        {filtered.length === 0 && (
          <p className="py-16 text-center text-ink-3">No questions match &ldquo;{q}&rdquo;.</p>
        )}
        <div className="space-y-5">
          {filtered.map((cat) => (
            <section key={cat.key} className="card p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-lg font-semibold text-ink">{cat.label}</h2>
                  <p className="mt-0.5 text-sm text-ink-2">{cat.blurb}</p>
                </div>
                <ButtonLink href={launchHref(cat)} size="sm" variant="secondary">
                  <Play size={14} /> Practice these
                </ButtonLink>
              </div>
              <ul className="mt-4 space-y-2">
                {cat.questions.map((question) => (
                  <li
                    key={question}
                    className="flex items-start gap-2.5 rounded-lg border px-4 py-2.5 text-sm text-ink-2"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--primary)" }} />
                    {question}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="pt-2 text-center">
          <ButtonLink href="/practice" variant="ghost" size="sm">
            Back to the practice hub <ArrowRight size={14} />
          </ButtonLink>
        </div>
      </main>
    </AppShell>
  );
}
