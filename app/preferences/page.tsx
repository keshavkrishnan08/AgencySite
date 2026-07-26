"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, MessageSquare, Timer, Heart, RotateCcw, Check } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getPrefs, setPrefs, DEFAULT_PREFS, type Prefs } from "@/lib/store";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

/* Preferences, micro-customizations to the whole experience. Every practice
   session starts from these, and coaching feel is set here. Flat/embedded,
   Stripe-style: controls sit on the background under thin rules, no dropdowns. */

const DOMAINS = [["interview", "Interview"], ["storytelling", "Storytelling"], ["public_speaking", "Public speaking"]];
const DIFFS = [["easy", "Gentle"], ["standard", "Standard"], ["hard", "Tough"]];
const COUNTS = [4, 6, 8, 10, 12];
const TONES = [["", "Balanced"], ["conversational", "Conversational"], ["formal", "Formal"], ["rapid_fire", "Rapid-fire"], ["scenario", "Scenario"]];
const INTERVIEWERS = [["", "Default"], ["friendly", "Friendly"], ["neutral", "Neutral"], ["skeptical", "Skeptical"], ["panel", "Panel"]];
const LENGTHS = [["short", "Short"], ["medium", "Medium"], ["long", "Long"]];
const COACH = [["gentle", "Gentle"], ["balanced", "Balanced"], ["direct", "Direct"]];
const SENIORITY = [["", "Any"], ["entry", "Entry"], ["mid", "Mid"], ["senior", "Senior"], ["exec", "Exec"]];
const STAGES = [["", "Any"], ["screen", "Screen"], ["onsite", "Onsite"], ["final", "Final"]];
const FRAMEWORKS = [["", "Free"], ["star", "STAR"], ["car", "CAR"]];

export default function PreferencesPage() {
  const [mounted, setMounted] = useState(false);
  const [prefs, setLocal] = useState<Prefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setMounted(true); setLocal(getPrefs()); }, []);

  const update = (patch: Partial<Prefs>) => {
    const next = setPrefs(patch);
    setLocal(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
    track("prefs:update", { ...patch });
  };
  const reset = () => { setPrefs(DEFAULT_PREFS); setLocal(DEFAULT_PREFS); track("prefs:reset", {}); };

  if (!mounted) return <AppShell requirePremium={false}><main className="min-h-screen" /></AppShell>;

  return (
    <AppShell requirePremium={false}>
      <main className="container-wide py-8 sm:py-10">
        <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.14em] text-primary-ink">
          <SlidersHorizontal size={14} /> Preferences
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">Tune your experience</h1>
          <span className={cn("flex items-center gap-1.5 text-sm text-sage-ink transition-opacity", saved ? "opacity-100" : "opacity-0")}>
            <Check size={15} /> Saved
          </span>
        </div>
        <p className="mt-1 text-ink-2">Every practice session starts from these. Change anything, it saves instantly.</p>

        <div className="grid items-start gap-x-10 lg:grid-cols-2">
        <Section icon={MessageSquare} title="Practice defaults" span2>
          <Row label="Focus"><Seg options={DOMAINS} value={prefs.domain} onPick={(v) => update({ domain: v })} /></Row>
          <Row label="Difficulty"><Seg options={DIFFS} value={prefs.difficulty} onPick={(v) => update({ difficulty: v })} /></Row>
          <Row label="Questions"><Seg options={COUNTS.map((n) => [String(n), String(n)])} value={String(prefs.count)} onPick={(v) => update({ count: Number(v) })} /></Row>
          <Row label="Phrasing"><Seg options={TONES} value={prefs.tone} onPick={(v) => update({ tone: v })} /></Row>
          <Row label="Interviewer"><Seg options={INTERVIEWERS} value={prefs.interviewer} onPick={(v) => update({ interviewer: v })} /></Row>
          <Row label="Seniority"><Seg options={SENIORITY} value={prefs.seniority} onPick={(v) => update({ seniority: v })} /></Row>
          <Row label="Interview stage"><Seg options={STAGES} value={prefs.stage} onPick={(v) => update({ stage: v })} /></Row>
          <Row label="Answer framework"><Seg options={FRAMEWORKS} value={prefs.framework} onPick={(v) => update({ framework: v })} /></Row>
          <Row label="Answer length"><Seg options={LENGTHS} value={prefs.lengthTarget} onPick={(v) => update({ lengthTarget: v })} /></Row>
        </Section>

        <Section icon={Timer} title="Session options">
          <Row label="Timed by default"><Switch on={prefs.timed} onToggle={() => update({ timed: !prefs.timed })} /></Row>
          <Row label="Voice-first"><Switch on={prefs.voice} onToggle={() => update({ voice: !prefs.voice })} /></Row>
          <Row label="Skip the hub, start immediately"><Switch on={prefs.autostart} onToggle={() => update({ autostart: !prefs.autostart })} /></Row>
        </Section>

        <Section icon={Heart} title="Coaching feel">
          <Row label="Feedback tone"><Seg options={COACH} value={prefs.coachTone} onPick={(v) => update({ coachTone: v })} /></Row>
          <p className="mt-2 text-xs text-ink-3">
            {prefs.coachTone === "gentle" ? "Encouraging first, with one gentle fix at a time."
              : prefs.coachTone === "direct" ? "Blunt and specific, the fastest way to improve."
              : "Honest and balanced: what worked, then what to fix."}
          </p>
        </Section>

        </div>

        <div className="mt-8 border-t pt-6" style={{ borderColor: "var(--border)" }}>
          <button onClick={reset} className="btn-ghost text-sm text-ink-2">
            <RotateCcw size={15} /> Reset to defaults
          </button>
        </div>
      </main>
    </AppShell>
  );
}

function Section({ icon: Icon, title, span2, children }: { icon: typeof MessageSquare; title: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("mt-8 border-t pt-6", span2 && "lg:col-span-2")} style={{ borderColor: "var(--border)" }}>
      <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-ink">
        <Icon size={16} className="text-primary" /> {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm font-medium text-ink-2">{label}</span>
      {children}
    </div>
  );
}

function Seg({ options, value, onPick }: { options: string[][]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-full bg-bg-tint p-1">
      {options.map(([v, label]) => (
        <button
          key={v || "def"}
          onClick={() => onPick(v)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            value === v ? "bg-white text-ink shadow-xs" : "text-ink-2 hover:text-ink"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
      style={{ background: on ? "var(--primary)" : "var(--border-strong)" }}
    >
      <span className="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform" style={{ transform: on ? "translateX(18px)" : "translateX(2px)" }} />
    </button>
  );
}
