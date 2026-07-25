"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Copy, Loader2, Save, Sparkles, Trash2, FileSearch, ArrowRight, Briefcase } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Inline, RichText } from "@/components/ui/RichText";
import {
  deleteGapAnswer,
  getGapAnswers,
  getProfile,
  getSessions,
  getPredictedSets,
  saveGapAnswer,
  savePredictedSet,
} from "@/lib/store";
import { uid, cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { mixpanelIncrement } from "@/lib/mixpanel";
import { contextSummary } from "@/lib/context";
import type { PredictedQuestion, SavedGapAnswer } from "@/lib/types";

/* Prep tools — one page, three segments.
 *
 * The Question Predictor and Gap Story Builder used to be two separate routes.
 * They're the same job (get ready for a specific interview) so they live in one
 * Stripe-style segmented page now, with a Recent tab that pulls the roles,
 * postings, and stories you've already worked on into one place. */

type Tab = "predictor" | "gap" | "recent";

const TABS: { key: Tab; label: string }[] = [
  { key: "predictor", label: "Question Predictor" },
  { key: "gap", label: "Gap Story" },
  { key: "recent", label: "Recent" },
];

export default function PrepPage() {
  return (
    <Suspense fallback={<AppShell><main className="container-wide py-10" /></AppShell>}>
      <PrepInner />
    </Suspense>
  );
}

function PrepInner() {
  const params = useSearchParams();
  const initial = (params.get("tab") as Tab) || "predictor";
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.key === initial) ? initial : "predictor");

  return (
    <AppShell>
      <main className="container-wide space-y-7 py-8 sm:py-10">
        <header>
          <p className="eyebrow">Prep tools</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">Get ready for the exact interview</h1>
          <p className="mt-1 max-w-2xl text-ink-2">
            Predict what they'll ask, turn your résumé gap into a calm answer, and pick up wherever you left off.
          </p>
        </header>

        {/* Segmented control */}
        <div className="inline-flex rounded-xl border p-1" style={{ borderColor: "var(--border)", background: "var(--bg-sunk)" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all sm:px-4",
                tab === t.key ? "text-ink" : "text-ink-3 hover:text-ink-2"
              )}
              style={tab === t.key ? { background: "var(--surface)", boxShadow: "0 1px 2px rgba(15,23,42,0.08)" } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "predictor" && <PredictorPanel />}
        {tab === "gap" && <GapStoryPanel />}
        {tab === "recent" && <RecentPanel onJump={setTab} />}
      </main>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Question Predictor                                                  */
/* ------------------------------------------------------------------ */

function PredictorPanel() {
  const [posting, setPosting] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<PredictedQuestion[]>([]);
  const [setId, setSetId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    track("tool_opened", { tool: "question_predictor" });
    const p = getProfile();
    setRole(p.targetRole || "");
    setCompany(p.company || "");
  }, []);

  const predict = async () => {
    if (posting.trim().length < 30) {
      setError("Paste the full job posting (at least a few lines).");
      return;
    }
    setError("");
    setLoading(true);
    setQuestions([]);
    setSetId("");
    try {
      const res = await fetch("/api/question-predictor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posting, role }),
      });
      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
        const id = uid("pq");
        savePredictedSet({ id, company: company.trim(), role: role.trim(), questions: data.questions, savedAt: new Date().toISOString() });
        setSetId(id);
        track("questions_predicted", { count: data.questions.length, role, postingChars: posting.trim().length });
        mixpanelIncrement("predictor_runs");
      } else setError(data.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="card p-6 sm:p-7">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "var(--primary-soft)" }}>
            <FileSearch size={17} className="text-primary-ink" />
          </span>
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink">Paste the posting</h2>
            <p className="text-xs text-ink-3">We read the role, seniority, and their exact language.</p>
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-2">Full job posting</span>
          <textarea
            value={posting}
            onChange={(e) => setPosting(e.target.value)}
            placeholder="Paste the entire job description here. Responsibilities, requirements, the company blurb, everything…"
            className="field min-h-[200px] resize-y leading-relaxed"
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-ink-2">
            Company <span className="font-normal text-ink-3">(optional)</span>
          </span>
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g., Mercy Hospital" className="field" />
        </label>
        {error && <p className="mt-2 text-sm text-coral-ink">{error}</p>}
        <Button onClick={predict} disabled={loading} size="lg" className="mt-5 w-full">
          {loading ? (<><Loader2 size={18} className="animate-spin" /> Reading the posting…</>) : (<>Predict the 5 questions <Sparkles size={16} /></>)}
        </Button>
      </div>

      <div className="space-y-4">
        {questions.length === 0 && (
          <div className="card grid min-h-[280px] place-items-center p-8 text-center">
            <div>
              <FileSearch size={26} className="mx-auto text-ink-3" />
              <p className="mt-3 text-sm text-ink-3">Your five most-likely questions will appear here, each with why they ask it and what a strong answer includes.</p>
            </div>
          </div>
        )}
        {questions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h3 className="font-serif text-lg font-semibold text-ink">Most likely questions</h3>
            {questions.map((q, i) => (
              <article key={i} className="card p-5">
                <div className="flex items-start gap-3.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft font-mono text-sm font-bold text-primary-ink">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-serif text-base font-semibold text-ink">&ldquo;{q.question}&rdquo;</h4>
                      <span className="shrink-0 rounded-full bg-sage-soft px-2.5 py-1 font-mono text-xs font-bold text-sage-ink">{q.probability}% likely</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-2">
                      <strong className="text-ink">Why:</strong> <Inline text={q.why} />
                    </p>
                    <div className="mt-3 rounded-lg bg-bg-sunk p-3.5">
                      <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-primary-ink">A strong answer includes</p>
                      <ul className="space-y-1.5">
                        {q.strongAnswer.map((s, j) => (
                          <li key={j} className="flex gap-2 text-sm text-ink-2">
                            <Check size={15} className="mt-0.5 shrink-0 text-sage" /> <Inline text={s} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            <div className="card p-5 text-center" style={{ borderColor: "var(--primary)", background: "var(--primary-soft)" }}>
              <h4 className="font-serif text-base font-semibold text-primary-ink">Now answer them before they do.</h4>
              <ButtonLink
                href={setId ? `/practice?predicted=${setId}` : "/practice"}
                size="md"
                className="mt-3"
                onClick={() => track("tool:handoff", { from: "question_predictor", count: questions.length })}
              >
                Practice these {questions.length} questions <Sparkles size={16} />
              </ButtonLink>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gap Story                                                           */
/* ------------------------------------------------------------------ */

const GAP_TYPES = [
  { key: "children", emoji: "👶", label: "Raising children" },
  { key: "layoff", emoji: "💼", label: "Laid off / eliminated" },
  { key: "career_change", emoji: "🔄", label: "Changing careers" },
  { key: "education", emoji: "🎓", label: "School or certification" },
  { key: "health", emoji: "🏥", label: "A health situation" },
  { key: "personal", emoji: "🌍", label: "Personal reasons" },
];
const DURATIONS = ["Less than 1 year", "1-2 years", "2-3 years", "3-5 years", "5+ years"];

function GapStoryPanel() {
  const [gapType, setGapType] = useState("children");
  const [duration, setDuration] = useState("1-2 years");
  const [activities, setActivities] = useState("");
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<{ label: string; text: string }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [saved, setSaved] = useState<SavedGapAnswer[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    track("tool_opened", { tool: "gap_story" });
    setSaved(getGapAnswers());
  }, []);

  const generate = async () => {
    setLoading(true);
    setVersions([]);
    setSelected(null);
    try {
      const res = await fetch("/api/gap-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gapType, duration, activities, role: getProfile().targetRole }),
      });
      const data = await res.json();
      setVersions(data.versions ?? []);
      track("gap_story_built", { gapType, duration, versions: (data.versions ?? []).length });
      mixpanelIncrement("gap_story_runs");
    } finally {
      setLoading(false);
    }
  };

  const select = (i: number) => {
    setSelected(i);
    setEditText(versions[i].text);
  };
  const save = () => {
    saveGapAnswer({
      id: uid("gap"),
      gapType: GAP_TYPES.find((g) => g.key === gapType)?.label ?? gapType,
      duration,
      versionLabel: selected !== null ? versions[selected].label : "Custom",
      text: editText,
      savedAt: new Date().toISOString(),
    });
    setSaved(getGapAnswers());
  };
  const copy = () => {
    navigator.clipboard?.writeText(editText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="card p-6 sm:p-7">
        <Label step={1}>What happened?</Label>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {GAP_TYPES.map((g) => (
            <button
              key={g.key}
              onClick={() => setGapType(g.key)}
              className="flex items-center gap-3 rounded-xl border bg-surface p-3.5 text-left text-sm font-medium text-ink transition-all hover:border-primary"
              style={{ borderColor: gapType === g.key ? "var(--primary)" : "var(--border)" }}
            >
              <span className="text-xl">{g.emoji}</span>
              {g.label}
            </button>
          ))}
        </div>

        <Label step={2} className="mt-7">How long was the gap?</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={cn("rounded-full border px-4 py-2 text-sm font-medium transition-all", duration === d ? "border-primary bg-primary-soft text-primary-ink" : "text-ink-2 hover:border-primary")}
              style={{ borderColor: duration === d ? "var(--primary)" : "var(--border)" }}
            >
              {d}
            </button>
          ))}
        </div>

        <Label step={3} className="mt-7">
          What did you do during the gap? <span className="font-normal text-ink-3">(optional, but powerful)</span>
        </Label>
        <textarea
          value={activities}
          onChange={(e) => setActivities(e.target.value)}
          placeholder="Freelance work, volunteering, online courses, caregiving, personal projects. Anything that shows you stayed engaged."
          className="field mt-3 min-h-[90px] resize-y"
        />
        <Button onClick={generate} disabled={loading} size="lg" className="mt-6 w-full">
          {loading ? (<><Loader2 size={18} className="animate-spin" /> Writing your answers…</>) : (<>Generate 3 versions <Sparkles size={16} /></>)}
        </Button>
      </div>

      <div className="space-y-4">
        {versions.length === 0 && saved.length === 0 && (
          <div className="card grid min-h-[280px] place-items-center p-8 text-center">
            <div>
              <Sparkles size={24} className="mx-auto text-ink-3" />
              <p className="mt-3 text-sm text-ink-3">Three versions of your gap answer will appear here. Pick the one that sounds like you, make it yours, and save it.</p>
            </div>
          </div>
        )}
        {versions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h3 className="font-serif text-lg font-semibold text-ink">Pick the one that sounds like you</h3>
            {versions.map((v, i) => (
              <button
                key={i}
                onClick={() => select(i)}
                className="block w-full rounded-xl border bg-surface p-5 text-left transition-all hover:border-primary"
                style={{ borderColor: selected === i ? "var(--primary)" : "var(--border)" }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary-ink">{v.label}</span>
                  {selected === i && <Check size={18} className="text-primary" />}
                </div>
                <RichText text={v.text} />
              </button>
            ))}
            {selected !== null && (
              <div className="card p-5">
                <Label step={4}>Make it yours, then save it</Label>
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="field mt-3 min-h-[120px] resize-y leading-relaxed" />
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={save}><Save size={16} /> Save as my gap answer</Button>
                  <Button variant="secondary" onClick={copy}>{copied ? (<><Check size={16} /> Copied</>) : (<><Copy size={16} /> Copy</>)}</Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
        {saved.length > 0 && (
          <div>
            <h3 className="mb-3 font-serif text-base font-semibold text-ink">Your saved gap answers</h3>
            <div className="space-y-3">
              {saved.map((s) => (
                <div key={s.id} className="card flex items-start justify-between gap-4 p-4">
                  <div>
                    <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">{s.gapType} · {s.duration} · {s.versionLabel}</p>
                    <RichText text={s.text} className="mt-1.5 text-sm" />
                  </div>
                  <button
                    onClick={() => { deleteGapAnswer(s.id); setSaved(getGapAnswers()); }}
                    className="shrink-0 rounded-lg p-2 text-ink-3 transition-colors hover:bg-coral-soft hover:text-coral-ink"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recent — the stats view (roles, postings, stories)                 */
/* ------------------------------------------------------------------ */

function RecentPanel({ onJump }: { onJump: (t: Tab) => void }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<{
    roles: { role: string; count: number; avg: number }[];
    predicted: ReturnType<typeof getPredictedSets>;
    gaps: SavedGapAnswer[];
    summary: string;
  }>({ roles: [], predicted: [], gaps: [], summary: "" });

  useEffect(() => {
    const sessions = getSessions();
    const byRole = new Map<string, { count: number; total: number }>();
    sessions.forEach((s) => {
      const r = (s.targetRole || "Practice").trim();
      const cur = byRole.get(r) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += s.overall || 0;
      byRole.set(r, cur);
    });
    const roles = Array.from(byRole.entries())
      .map(([role, v]) => ({ role, count: v.count, avg: Math.round(v.total / Math.max(1, v.count)) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    setData({ roles, predicted: getPredictedSets(), gaps: getGapAnswers(), summary: contextSummary() });
    setReady(true);
  }, []);

  const empty = ready && data.roles.length === 0 && data.predicted.length === 0 && data.gaps.length === 0;

  return (
    <div className="space-y-6">
      {data.summary && (
        <div className="card flex items-start gap-3 p-5" style={{ background: "var(--primary-soft)", borderColor: "var(--primary)" }}>
          <Sparkles size={18} className="mt-0.5 shrink-0 text-primary-ink" />
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-primary-ink">What your coach knows</p>
            <p className="mt-1 text-sm text-ink">{data.summary}</p>
          </div>
        </div>
      )}

      {empty && (
        <div className="card grid min-h-[220px] place-items-center p-8 text-center">
          <div>
            <Briefcase size={26} className="mx-auto text-ink-3" />
            <p className="mt-3 text-sm text-ink-3">Nothing here yet. Predict a posting's questions or build a gap story and it'll show up here.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Roles practiced */}
        {data.roles.length > 0 && (
          <section className="card p-6">
            <h3 className="font-serif text-base font-semibold text-ink">Roles you've practiced</h3>
            <div className="mt-4 space-y-2.5">
              {data.roles.map((r) => (
                <div key={r.role} className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm text-ink-2">{r.role}</span>
                  <span className="shrink-0 text-sm tabular-nums text-ink-3">
                    {r.count}× · <span className="font-semibold text-ink">{r.avg}</span> avg
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Predicted sets */}
        {data.predicted.length > 0 && (
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-semibold text-ink">Postings you've decoded</h3>
              <button onClick={() => onJump("predictor")} className="text-xs font-medium text-primary-ink hover:underline">New +</button>
            </div>
            <div className="mt-4 space-y-2.5">
              {data.predicted.slice(0, 6).map((p) => (
                <Link
                  key={p.id}
                  href={`/practice?predicted=${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition-colors hover:border-primary"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="truncate text-ink-2">
                    {p.company ? `${p.company} · ` : ""}{p.role || "Role"}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-ink-3">{p.questions.length} Qs <ArrowRight size={13} /></span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Gap stories */}
      {data.gaps.length > 0 && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-semibold text-ink">Your gap answers</h3>
            <button onClick={() => onJump("gap")} className="text-xs font-medium text-primary-ink hover:underline">New +</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.gaps.slice(0, 4).map((s) => (
              <div key={s.id} className="rounded-lg border p-3.5" style={{ borderColor: "var(--border)" }}>
                <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">{s.gapType} · {s.duration}</p>
                <RichText text={s.text} className="mt-1.5 line-clamp-3 text-sm" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Label({ step, children, className }: { step: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-soft font-mono text-xs font-bold text-primary-ink">{step}</span>
      <span className="font-medium text-ink">{children}</span>
    </div>
  );
}
