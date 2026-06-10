"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Loader2, Save, Sparkles, Trash2 } from "lucide-react";
import { ToolShell } from "@/components/layout/ToolShell";
import { RichText } from "@/components/ui/RichText";
import { GapStoryIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { deleteGapAnswer, getGapAnswers, getProfile, saveGapAnswer } from "@/lib/store";
import type { SavedGapAnswer } from "@/lib/types";
import { uid } from "@/lib/utils";

const GAP_TYPES = [
  { key: "children", emoji: "👶", label: "Raising children" },
  { key: "layoff", emoji: "💼", label: "Laid off / position eliminated" },
  { key: "career_change", emoji: "🔄", label: "Changing careers" },
  { key: "education", emoji: "🎓", label: "School or certification" },
  { key: "health", emoji: "🏥", label: "A health situation" },
  { key: "personal", emoji: "🌍", label: "Personal reasons" },
];
const DURATIONS = ["Less than 1 year", "1-2 years", "2-3 years", "3-5 years", "5+ years"];

export default function GapStoryPage() {
  const [gapType, setGapType] = useState("children");
  const [duration, setDuration] = useState("1-2 years");
  const [activities, setActivities] = useState("");
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<{ label: string; text: string }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [saved, setSaved] = useState<SavedGapAnswer[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => setSaved(getGapAnswers()), []);

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
    } finally {
      setLoading(false);
    }
  };

  const select = (i: number) => {
    setSelected(i);
    setEditText(versions[i].text);
  };

  const save = () => {
    const entry: SavedGapAnswer = {
      id: uid("gap"),
      gapType: GAP_TYPES.find((g) => g.key === gapType)?.label ?? gapType,
      duration,
      versionLabel: selected !== null ? versions[selected].label : "Custom",
      text: editText,
      savedAt: new Date().toISOString(),
    };
    saveGapAnswer(entry);
    setSaved(getGapAnswers());
  };

  const copy = () => {
    navigator.clipboard?.writeText(editText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <ToolShell
      icon={GapStoryIcon}
      badge="Most popular"
      title="Gap Story Builder"
      description="Turn your résumé gap into a confident 30-second answer that sounds like you. Not a script. Practice it until your voice doesn't shake."
    >
      {/* Builder */}
      <div className="card p-7">
        <Label step={1}>What happened?</Label>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {GAP_TYPES.map((g) => (
            <button
              key={g.key}
              onClick={() => setGapType(g.key)}
              className="flex items-center gap-3 rounded-xl border-2 bg-surface p-3.5 text-left text-sm font-medium text-ink transition-all hover:border-primary"
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
              className={cn(
                "rounded-full border-2 px-4 py-2 text-sm font-medium transition-all",
                duration === d ? "border-primary bg-primary-soft text-primary-ink" : "border-line text-ink-2 hover:border-primary"
              )}
            >
              {d}
            </button>
          ))}
        </div>

        <Label step={3} className="mt-7">What did you do during the gap? <span className="font-normal text-ink-3">(optional, but powerful)</span></Label>
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

      {/* Versions */}
      {versions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
          <h2 className="font-serif text-xl font-semibold text-ink">Pick the one that sounds like you</h2>
          {versions.map((v, i) => (
            <button
              key={i}
              onClick={() => select(i)}
              className="block w-full rounded-xl border-2 bg-surface p-5 text-left transition-all hover:shadow-sm"
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
            <div className="card p-6">
              <Label step={4}>Make it yours, then save it</Label>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="field mt-3 min-h-[120px] resize-y leading-relaxed"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={save}><Save size={16} /> Save as my gap answer</Button>
                <Button variant="secondary" onClick={copy}>
                  {copied ? (<><Check size={16} /> Copied</>) : (<><Copy size={16} /> Copy</>)}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Saved */}
      {saved.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-serif text-xl font-semibold text-ink">Your saved gap answers</h2>
          <div className="space-y-3">
            {saved.map((s) => (
              <div key={s.id} className="card flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">
                    {s.gapType} · {s.duration} · {s.versionLabel}
                  </p>
                  <RichText text={s.text} className="mt-1.5 text-sm" />
                </div>
                <button
                  onClick={() => {
                    deleteGapAnswer(s.id);
                    setSaved(getGapAnswers());
                  }}
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
    </ToolShell>
  );
}

function Label({ step, children, className }: { step: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-soft font-mono text-xs font-bold text-primary-ink">
        {step}
      </span>
      <span className="font-medium text-ink">{children}</span>
    </div>
  );
}
