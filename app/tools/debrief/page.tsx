"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Loader2, Plus, Sparkles } from "lucide-react";
import { ToolShell } from "@/components/layout/ToolShell";
import { Button } from "@/components/ui/Button";
import { AnswerScoreCard } from "@/components/practice/AnswerScoreCard";
import { apiGenerateExample, apiScoreAnswer } from "@/lib/client";
import { getProfile } from "@/lib/store";
import { average, scoreColor } from "@/lib/utils";
import type { ScoredAnswer } from "@/lib/types";

export default function DebriefPage() {
  const [role, setRole] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ScoredAnswer[]>([]);

  useEffect(() => setRole(getProfile().targetRole || ""), []);

  const score = async () => {
    if (question.trim().length < 5 || answer.trim().split(/\s+/).length < 6) return;
    setLoading(true);
    try {
      const result = await apiScoreAnswer({
        question,
        answer,
        targetRole: role,
        category: "behavioral",
        questionNumber: items.length + 1,
      });
      setItems((prev) => [...prev, result]);
      setQuestion("");
      setAnswer("");
    } finally {
      setLoading(false);
    }
  };

  const overall = average(items.map((i) => i.scores.overall));

  return (
    <ToolShell
      icon={ClipboardCheck}
      title="Post-Interview Debrief"
      description="Just walked out wondering 'did that go well?' Type what they asked and what you said. Get honest scoring — so you know exactly what to fix before the next one."
    >
      <div className="card p-7">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-2">What did they ask?</span>
          <input
            className="field"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Tell me about a time you handled a difficult customer."
            autoFocus
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-ink-2">What did you say? (as best you remember)</span>
          <textarea
            className="field min-h-[140px] resize-y leading-relaxed"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your remembered answer…"
          />
        </label>
        <Button onClick={score} disabled={loading} size="lg" className="mt-5 w-full">
          {loading ? (<><Loader2 size={18} className="animate-spin" /> Scoring honestly…</>) : (<>Score this answer <Sparkles size={16} /></>)}
        </Button>
      </div>

      {items.length > 0 && (
        <div className="mt-6 space-y-6">
          <div className="card-elevated flex items-center justify-between p-6">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">Debrief so far</p>
              <p className="mt-1 text-ink-2">{items.length} answer{items.length === 1 ? "" : "s"} scored</p>
            </div>
            <div className="text-right">
              <span className="font-serif text-4xl font-semibold" style={{ color: scoreColor(overall) }}>{overall}</span>
              <span className="text-ink-3"> /100 avg</span>
            </div>
          </div>

          {items.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="mb-3 font-serif text-lg font-semibold text-ink">&ldquo;{item.questionText}&rdquo;</h3>
              <AnswerScoreCard
                answer={item}
                animate={false}
                loadExample={(a) => apiGenerateExample(a.questionText, role, a.category)}
              />
            </motion.div>
          ))}

          <div className="rounded-xl border bg-surface p-5 text-center" style={{ borderColor: "var(--border)" }}>
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="btn-secondary">
              <Plus size={16} /> Debrief another question
            </button>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
