"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Copy, Check, Loader2, Sparkles } from "lucide-react";
import { ToolShell } from "@/components/layout/ToolShell";
import { StoryIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { AnswerScoreCard } from "@/components/practice/AnswerScoreCard";
import { apiScoreAnswer } from "@/lib/client";
import { getProfile } from "@/lib/store";
import type { ScoredAnswer } from "@/lib/types";

const STEPS = [
  { key: "who", label: "Who are you?", hint: "One sentence. Your role and the thing you're known for.", ph: "I'm an operations coordinator who keeps busy teams calm and organized." },
  { key: "done", label: "What have you done?", hint: "Two sentences. Your proudest, most relevant wins. With a number if you can.", ph: "At my last job I ran scheduling for a team of 15 and cut missed appointments by 22%. Before that I rebuilt our intake process from scratch." },
  { key: "why", label: "Why are you here?", hint: "One sentence. Why this role, this company, right now.", ph: "I'm here because this role lets me own a process end-to-end and make it measurably better." },
  { key: "next", label: "What's next?", hint: "One sentence. Where you're headed. Ambitious but grounded.", ph: "Next, I want to take on a bigger team and build something that lasts." },
] as const;

export default function YourStoryPage() {
  const [role, setRole] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({ who: "", done: "", why: "", next: "" });
  const [scored, setScored] = useState<ScoredAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setRole(getProfile().targetRole || ""), []);

  const story = useMemo(
    () => STEPS.map((s) => vals[s.key].trim()).filter(Boolean).join(" "),
    [vals]
  );
  const wordCount = story.trim() ? story.trim().split(/\s+/).length : 0;

  const scoreStory = async () => {
    if (wordCount < 15) return;
    setLoading(true);
    try {
      const result = await apiScoreAnswer({
        question: "Tell me about yourself.",
        answer: story,
        targetRole: role,
        category: "warmup",
        questionNumber: 1,
      });
      setScored(result);
      setTimeout(() => window.scrollTo({ top: 9999, behavior: "smooth" }), 80);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard?.writeText(story);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <ToolShell
      icon={StoryIcon}
      title="Your Story Builder"
      description="The hardest question is the first one. Build your 'tell me about yourself' in four steps. Five sentences, sixty seconds, sounds like you wrote it. Because you did."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-4">
          {STEPS.map((s, i) => (
            <div key={s.key} className="card p-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-soft font-mono text-xs font-bold text-primary-ink">
                  {i + 1}
                </span>
                <span className="font-medium text-ink">{s.label}</span>
              </div>
              <p className="mt-1.5 text-sm text-ink-3">{s.hint}</p>
              <textarea
                value={vals[s.key]}
                onChange={(e) => setVals((v) => ({ ...v, [s.key]: e.target.value }))}
                placeholder={s.ph}
                className="field mt-3 min-h-[70px] resize-y text-sm leading-relaxed"
              />
            </div>
          ))}
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="card-elevated p-7">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
                <Sparkles size={18} className="text-primary" /> Your story
              </h2>
              <span className="text-xs text-ink-3">{wordCount} words · ~{Math.max(1, Math.round(wordCount / 2.5))}s</span>
            </div>
            {story ? (
              <p className="text-[1.05rem] leading-loose text-ink">{story}</p>
            ) : (
              <p className="leading-loose text-ink-3">Your answer will assemble here as you fill in the four steps…</p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={scoreStory} disabled={loading || wordCount < 15}>
                {loading ? (<><Loader2 size={16} className="animate-spin" /> Scoring…</>) : (<>Score my story <Sparkles size={15} /></>)}
              </Button>
              <Button variant="secondary" onClick={copy} disabled={!story}>
                {copied ? (<><Check size={16} /> Copied</>) : (<><Copy size={16} /> Copy</>)}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {scored && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <h2 className="mb-4 font-serif text-xl font-semibold text-ink">How your story scores</h2>
          <AnswerScoreCard answer={scored} animate />
        </motion.div>
      )}
    </ToolShell>
  );
}
