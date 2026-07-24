"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileSearch, Loader2, Sparkles, Check } from "lucide-react";
import { ToolShell } from "@/components/layout/ToolShell";
import { Inline } from "@/components/ui/RichText";
import { PredictorIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/Button";
import { getProfile, savePredictedSet } from "@/lib/store";
import { uid } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { mixpanelIncrement } from "@/lib/mixpanel";
import type { PredictedQuestion } from "@/lib/types";

export default function QuestionPredictorPage() {
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
        // Persist so Practice can run a session on these exact questions.
        const id = uid("pq");
        savePredictedSet({
          id,
          company: company.trim(),
          role: role.trim(),
          questions: data.questions,
          savedAt: new Date().toISOString(),
        });
        setSetId(id);
        track("questions_predicted", { count: data.questions.length, role, postingChars: posting.trim().length });
        mixpanelIncrement("predictor_runs");
      } else setError(data.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      icon={PredictorIcon}
      title="Question Predictor"
      description="Paste the job posting. AI reads the role, seniority, and exact language they used. Then predicts the five questions they're most likely to ask. Stop guessing."
    >
      <div className="card p-7">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-2">Paste the full job posting</span>
          <textarea
            value={posting}
            onChange={(e) => setPosting(e.target.value)}
            placeholder="Paste the entire job description here. Responsibilities, requirements, the company blurb, everything…"
            className="field min-h-[200px] resize-y leading-relaxed"
            autoFocus
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-ink-2">
            Company <span className="font-normal text-ink-3">(optional)</span>
          </span>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g., Mercy Hospital"
            className="field"
          />
        </label>
        {error && <p className="mt-2 text-sm text-coral-ink">{error}</p>}
        <Button onClick={predict} disabled={loading} size="lg" className="mt-5 w-full">
          {loading ? (<><Loader2 size={18} className="animate-spin" /> Reading the posting…</>) : (<>Predict the 5 questions <Sparkles size={16} /></>)}
        </Button>
      </div>

      {questions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
          <h2 className="font-serif text-xl font-semibold text-ink">Most likely questions</h2>
          {questions.map((q, i) => (
            <article key={i} className="card p-6">
              <div className="flex items-start gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft font-mono text-sm font-bold text-primary-ink">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-serif text-lg font-semibold text-ink">&ldquo;{q.question}&rdquo;</h3>
                    <span className="shrink-0 rounded-full bg-sage-soft px-2.5 py-1 font-mono text-xs font-bold text-sage-ink">
                      {q.probability}% likely
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">
                    <strong className="text-ink">Why they ask it:</strong> <Inline text={q.why} />
                  </p>
                  <div className="mt-3 rounded-lg bg-bg-sunk p-4">
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
          <div
            className="rounded-2xl border-2 p-6 text-center"
            style={{ borderColor: "var(--primary)", background: "var(--primary-soft)" }}
          >
            <h3 className="font-serif text-lg font-semibold text-primary-ink">
              Now answer them before they do.
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-2">
              Run a full scored session on these exact questions, most likely first. Every answer is graded on all
              five dimensions and feeds your metrics.
            </p>
            <ButtonLink
              href={setId ? `/practice?predicted=${setId}` : "/practice"}
              size="lg"
              className="mt-4"
              onClick={() => track("tool:handoff", { from: "question_predictor", count: questions.length })}
            >
              Practice these {questions.length} questions <Sparkles size={16} />
            </ButtonLink>
          </div>
        </motion.div>
      )}
    </ToolShell>
  );
}
