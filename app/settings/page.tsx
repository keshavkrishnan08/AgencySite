"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, Trash2, User } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ExitSurvey } from "@/components/feedback/ExitSurvey";
import {
  DEFAULT_PROFILE,
  getProfile,
  isPremium,
  resetAll,
  setProfile,
} from "@/lib/store";
import { SITUATION_META } from "@/lib/utils";
import type { InterviewGap, Situation, UserProfile } from "@/lib/types";

const GAP_OPTS: [InterviewGap, string][] = [
  ["<1yr", "Less than a year ago"],
  ["1-3yr", "1–3 years ago"],
  ["3-5yr", "3–5 years ago"],
  ["5+yr", "5+ years ago"],
];

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setLocalProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLocalProfile(getProfile());
  }, []);

  const update = (patch: Partial<UserProfile>) => setLocalProfile((p) => ({ ...p, ...patch }));

  const save = () => {
    setProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const del = () => {
    if (typeof window !== "undefined" && window.confirm("Delete your account and all practice data? This cannot be undone.")) {
      resetAll();
      router.push("/");
    }
  };

  if (!mounted) return <AppShell><main className="min-h-screen" /></AppShell>;

  const premium = isPremium();

  return (
    <AppShell>
      <main className="container-content py-10">
        <h1 className="font-serif text-3xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-ink-2">Manage your account, plan, and preferences.</p>

        <div className="mt-8 space-y-6">
          {/* Account */}
          <section className="card p-7">
            <h2 className="mb-5 flex items-center gap-2 font-serif text-lg font-semibold text-ink">
              <User size={18} className="text-primary" /> Account
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input className="field" value={profile.name} onChange={(e) => update({ name: e.target.value })} placeholder="Your name" />
              </Field>
              <Field label="Email">
                <input className="field" value={profile.email} onChange={(e) => update({ email: e.target.value })} placeholder="you@email.com" />
              </Field>
            </div>
          </section>

          {/* Preferences */}
          <section className="card p-7">
            <h2 className="mb-5 font-serif text-lg font-semibold text-ink">Preferences</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Target role">
                <input className="field" value={profile.targetRole} onChange={(e) => update({ targetRole: e.target.value })} placeholder="e.g., Office Manager" />
              </Field>
              <Field label="Company">
                <input className="field" value={profile.company ?? ""} onChange={(e) => update({ company: e.target.value })} placeholder="e.g., Mercy Hospital" />
              </Field>
              <Field label="Situation">
                <select
                  className="field"
                  value={profile.situation ?? ""}
                  onChange={(e) => update({ situation: (e.target.value || null) as Situation | null })}
                >
                  <option value="">Not set</option>
                  {(Object.keys(SITUATION_META) as Situation[]).map((s) => (
                    <option key={s} value={s}>{SITUATION_META[s].label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Last interviewed">
                <select
                  className="field"
                  value={profile.interviewGap ?? ""}
                  onChange={(e) => update({ interviewGap: (e.target.value || null) as InterviewGap | null })}
                >
                  <option value="">Not set</option>
                  {GAP_OPTS.map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <label className="mt-5 flex items-center gap-3">
              <button
                onClick={() => update({ emailTips: !profile.emailTips })}
                className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
                style={{ background: profile.emailTips ? "var(--primary)" : "var(--border-strong)" }}
                aria-pressed={profile.emailTips}
              >
                <span
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
                  style={{ left: 2, transform: profile.emailTips ? "translateX(20px)" : "translateX(0)" }}
                />
              </button>
              <span className="text-sm text-ink-2">Email me daily tips and weekly progress reports</span>
            </label>
          </section>

          <div className="flex items-center gap-3">
            <Button onClick={save}>{saved ? (<><Check size={16} /> Saved</>) : "Save changes"}</Button>
          </div>

          {/* Subscription */}
          <section className="card p-7">
            <h2 className="mb-5 flex items-center gap-2 font-serif text-lg font-semibold text-ink">
              <CreditCard size={18} className="text-primary" /> Subscription
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-bg-sunk p-5">
              <div>
                <p className="font-semibold text-ink">
                  Current plan:{" "}
                  <span style={{ color: premium ? "var(--gold-ink)" : "var(--ink-2)" }}>
                    {premium ? "Premium ★" : "Free"}
                  </span>
                </p>
                <p className="text-sm text-ink-3">
                  {premium ? "Active · cancel anytime" : "One scored answer, then it's locked"}
                </p>
              </div>
              {premium ? (
                <Button variant="secondary" onClick={() => setExitOpen(true)}>
                  Manage billing
                </Button>
              ) : (
                <ButtonLink href="/upgrade" variant="gold">
                  Upgrade to Premium
                </ButtonLink>
              )}
            </div>
          </section>

          {/* Danger */}
          <section className="card p-7" style={{ borderColor: "var(--coral-soft)" }}>
            <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-coral-ink">
              <Trash2 size={18} /> Delete account
            </h2>
            <p className="mb-4 text-sm text-ink-2">
              Permanently delete your account and all practice history. This cannot be undone.
            </p>
            <button
              onClick={del}
              className="rounded-full border px-5 py-2.5 text-sm font-medium text-coral-ink transition-colors hover:bg-coral-soft"
              style={{ borderColor: "var(--coral)" }}
            >
              Delete my account
            </button>
          </section>
        </div>
      </main>

      {/* Cancelling routes through the outcome survey. "I got the job" is the
          first option, and it's the statistic nothing else here can observe. */}
      {exitOpen && (
        <ExitSurvey
          onClose={() => setExitOpen(false)}
          onConfirm={() => {
            setProfile({ plan: "free" });
            setExitOpen(false);
          }}
        />
      )}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}
