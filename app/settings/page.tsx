"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check, CreditCard, Trash2, User, Bell, ShieldCheck, SlidersHorizontal,
  Download, ExternalLink, LogOut, Calendar, ChevronRight, Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { ExitSurvey } from "@/components/feedback/ExitSurvey";
import {
  DEFAULT_PROFILE, getProfile, resetAll, setProfile, getSessions,
} from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { SITUATION_META, formatDate, cn } from "@/lib/utils";
import { PLANS, type PlanKey } from "@/lib/pricing";
import { track } from "@/lib/analytics";
import type { InterviewGap, Situation, UserProfile } from "@/lib/types";

const GAP_OPTS: [InterviewGap, string][] = [
  ["<1yr", "Less than a year ago"],
  ["1-3yr", "1–3 years ago"],
  ["3-5yr", "3–5 years ago"],
  ["5+yr", "5+ years ago"],
];

interface Sub { premium: boolean; status: string; until: string | null; interval: string | null }

export default function SettingsPage() {
  const router = useRouter();
  const { configured, user, signOut } = useAuth();
  const [profile, setLocalProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [sub, setSub] = useState<Sub | null>(null);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
    const p = getProfile();
    setLocalProfile(p);
    if (p.email) {
      fetch("/api/subscription-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": p.email },
      })
        .then((r) => r.json())
        .then((s) => setSub(s))
        .catch(() => {});
    }
  }, []);

  const update = (patch: Partial<UserProfile>) => setLocalProfile((p) => ({ ...p, ...patch }));
  const save = () => { setProfile(profile); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const del = () => {
    if (typeof window !== "undefined" && window.confirm("Delete your account and all practice data? This cannot be undone.")) {
      resetAll();
      router.push("/");
    }
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ profile: getProfile(), sessions: getSessions() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "axon-careers-data.json";
    a.click();
    track("settings:export", {});
  };
  const goToPortal = async () => {
    setPortalBusy(true);
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email }),
      });
      const data = await res.json();
      if (data?.url) { window.location.href = data.url; return; }
    } catch { /* fall through */ }
    setPortalBusy(false);
    setExitOpen(false);
    window.alert("We couldn't open the billing portal just now. Email support and we'll sort your subscription out.");
  };

  if (!mounted) return <AppShell><main className="min-h-screen" /></AppShell>;

  const planInfo = sub?.interval && (["monthly", "quarterly", "annual"] as PlanKey[]).includes(sub.interval as PlanKey)
    ? PLANS[sub.interval as PlanKey] : null;
  const statusMeta = subStatusMeta(sub);

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">Settings</h1>
            <p className="mt-1 text-ink-2">Your account, subscription, and how the product behaves.</p>
          </div>
          <span className={`flex items-center gap-1.5 text-sm text-sage-ink transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}>
            <Check size={15} /> Saved
          </span>
        </div>

        {/* ── Account ── */}
        <Section icon={User} title="Account" note="who you are on Axon Careers">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" hint="shown in your coaching">
              <input className="field" value={profile.name} onChange={(e) => update({ name: e.target.value })} placeholder="Your name" />
            </Field>
            <Field label="Email" hint="used for sign-in and billing">
              <input className="field" value={profile.email} onChange={(e) => update({ email: e.target.value })} placeholder="you@email.com" />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-2xs text-ink-3">
            {profile.createdAt && <span>Member since {formatDate(profile.createdAt)}</span>}
            <span>{getSessions().length} sessions practiced</span>
          </div>
          <Button onClick={save} className="mt-4" size="sm">Save changes</Button>
        </Section>

        {/* ── Subscription (deep) ── */}
        <Section icon={CreditCard} title="Subscription" note="plan, billing, and cancellation">
          <div className="rounded-xl p-5" style={{ background: "var(--bg-sunk)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-serif text-xl font-semibold text-ink">
                  {sub?.premium ? "Premium" : "Free"}
                </span>
                <span className="rounded-full px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider"
                  style={{ color: statusMeta.color, background: statusMeta.bg }}>
                  {statusMeta.label}
                </span>
              </div>
              {planInfo && <span className="font-mono text-lg font-semibold text-ink">{planInfo.price}<span className="text-sm font-normal text-ink-3"> {planInfo.cadence}</span></span>}
            </div>

            {/* detail rows */}
            <div className="mt-4 divide-y" style={{ borderColor: "var(--border)" }}>
              <DetailRow label="Plan" value={planInfo ? `Premium · ${planInfo.toggle}` : sub?.premium ? "Premium" : "Free plan"} />
              {planInfo && <DetailRow label="Price" value={`${planInfo.price} ${planInfo.cadence} · ${planInfo.perMonth}`} />}
              <DetailRow
                label={sub?.status === "canceled" || sub?.until && new Date(sub.until) < new Date() ? "Ended" : sub?.premium ? "Renews" : "Status"}
                value={sub?.until ? formatDate(sub.until) : sub?.premium ? "—" : "No active subscription"}
                icon={sub?.until ? Calendar : undefined}
              />
              {sub?.status && <DetailRow label="Billing status" value={statusMeta.long} />}
            </div>

            {/* actions */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {sub?.premium ? (
                <>
                  <Button onClick={goToPortal} disabled={portalBusy} size="sm">
                    {portalBusy ? <><Loader2 size={15} className="animate-spin" /> Opening…</> : <><ExternalLink size={15} /> Manage billing & payment</>}
                  </Button>
                  <button onClick={() => setExitOpen(true)} className="text-sm font-medium text-coral-ink hover:underline">
                    Cancel subscription
                  </button>
                </>
              ) : (
                <Button onClick={() => router.push("/upgrade")} size="sm">Start a plan</Button>
              )}
            </div>
            <p className="mt-3 text-2xs leading-relaxed text-ink-3">
              {sub?.premium
                ? "Billing, payment method, invoices and cancellation are all handled securely in Stripe. Cancel anytime — you keep access until the end of your current billing period."
                : "You don't have an active subscription. Access unlocks the moment you start a plan."}
            </p>
          </div>
        </Section>

        {/* ── Career profile ── */}
        <Section icon={User} title="Career profile" note="what we tailor your practice around">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Target role"><input className="field" value={profile.targetRole} onChange={(e) => update({ targetRole: e.target.value })} placeholder="e.g., Office Manager" /></Field>
            <Field label="Company"><input className="field" value={profile.company ?? ""} onChange={(e) => update({ company: e.target.value })} placeholder="e.g., Mercy Hospital" /></Field>
            <Field label="Situation">
              <select className="field" value={profile.situation ?? ""} onChange={(e) => update({ situation: (e.target.value || null) as Situation | null })}>
                <option value="">Not set</option>
                {(Object.keys(SITUATION_META) as Situation[]).map((s) => <option key={s} value={s}>{SITUATION_META[s].label}</option>)}
              </select>
            </Field>
            <Field label="Last interviewed">
              <select className="field" value={profile.interviewGap ?? ""} onChange={(e) => update({ interviewGap: (e.target.value || null) as InterviewGap | null })}>
                <option value="">Not set</option>
                {GAP_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>
          <Button onClick={save} className="mt-4" size="sm">Save changes</Button>
        </Section>

        {/* ── Practice preferences link ── */}
        <Section icon={SlidersHorizontal} title="Practice preferences" note="defaults, coaching tone, and session options">
          <LinkRow href="/preferences" title="Tune your experience" sub="Set the domain, difficulty, count, phrasing, interviewer, timing and coaching feel every session starts from." />
        </Section>

        {/* ── Notifications ── */}
        <Section icon={Bell} title="Notifications">
          <ToggleRow
            label="Practice tips by email"
            sub="An occasional email with one specific way to sharpen your interview. No spam, unsubscribe anytime."
            on={profile.emailTips ?? true}
            onToggle={() => { const v = !(profile.emailTips ?? true); update({ emailTips: v }); setProfile({ emailTips: v }); }}
          />
        </Section>

        {/* ── Privacy & data ── */}
        <Section icon={ShieldCheck} title="Privacy & data" note="you own your data">
          <LinkRow onClick={exportData} title="Export your data" sub="Download everything we store about you — profile and every practice session — as JSON." icon={Download} />
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <p className="flex items-center gap-2 text-sm font-medium text-coral-ink"><Trash2 size={15} /> Delete account</p>
            <p className="mt-1 text-2xs leading-relaxed text-ink-3">Permanently deletes your account and all practice history. This can't be undone.</p>
            <button onClick={del} className="mt-3 rounded-full border px-4 py-2 text-sm font-medium text-coral-ink transition-colors hover:bg-coral-soft" style={{ borderColor: "var(--coral)" }}>
              Delete my account
            </button>
          </div>
        </Section>

        {/* ── Session ── */}
        {configured && user && (
          <Section icon={LogOut} title="Session">
            <button onClick={async () => { await signOut(); router.push("/"); }} className="btn-ghost text-sm text-ink-2">
              <LogOut size={15} /> Sign out
            </button>
          </Section>
        )}

        <p className="mt-10 text-center text-2xs text-ink-3">Axon Careers · axonservices.dev</p>
      </main>

      {exitOpen && (
        <ExitSurvey onClose={() => setExitOpen(false)} onConfirm={() => { void goToPortal(); }} />
      )}
    </AppShell>
  );
}

/* ── helpers ── */
function subStatusMeta(sub: Sub | null): { label: string; long: string; color: string; bg: string } {
  const s = sub?.status;
  if (!sub || s === "none" || !s) return { label: "Free", long: "No subscription on file.", color: "var(--ink-2)", bg: "var(--bg-tint)" };
  if (s === "active") return { label: "Active", long: "Active and billing normally.", color: "var(--sage-ink)", bg: "var(--sage-soft)" };
  if (s === "trialing") return { label: "Trial", long: "In a trial period.", color: "var(--primary-ink)", bg: "var(--primary-soft)" };
  if (s === "past_due") return { label: "Past due", long: "A payment failed — we're retrying. Update your card to avoid losing access.", color: "var(--amber-ink)", bg: "var(--amber-soft)" };
  if (s === "canceled") return { label: "Canceled", long: "Canceled. Access ends at the period shown.", color: "var(--ink-2)", bg: "var(--bg-tint)" };
  return { label: s, long: s, color: "var(--ink-2)", bg: "var(--bg-tint)" };
}

/* Stripe-style settings row: a title + description rail on the left, the
   controls on the right, full-width, separated by a thin top rule. */
function Section({ icon: Icon, title, note, children }: { icon: typeof User; title: string; note?: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <section className="grid gap-x-10 gap-y-4 border-t py-8 lg:grid-cols-[220px_1fr]" style={{ borderColor: "var(--border)" }}>
      <div>
        <h2 className="flex items-center gap-2 font-serif text-base font-semibold text-ink">
          <Icon size={15} className="text-primary" /> {title}
        </h2>
        {note && <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{note}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-2xs text-ink-3">{hint}</span>}
    </label>
  );
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Calendar }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-ink-2">{label}</span>
      <span className="flex items-center gap-1.5 font-medium text-ink">{Icon && <Icon size={13} className="text-ink-3" />}{value}</span>
    </div>
  );
}

function ToggleRow({ label, sub, on, onToggle }: { label: string; sub: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-2xs leading-relaxed text-ink-3">{sub}</p>
      </div>
      <button onClick={onToggle} role="switch" aria-checked={on} className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors" style={{ background: on ? "var(--primary)" : "var(--border-strong)" }}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function LinkRow({ href, onClick, title, sub, icon: Icon }: { href?: string; onClick?: () => void; title: string; sub: string; icon?: typeof Download }) {
  const inner = (
    <div className="flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors hover:bg-bg-tint" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-start gap-3">
        {Icon && <Icon size={17} className="mt-0.5 shrink-0 text-primary" />}
        <div>
          <p className="text-sm font-medium text-ink">{title}</p>
          <p className="mt-0.5 text-2xs leading-relaxed text-ink-3">{sub}</p>
        </div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-ink-3" />
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <button onClick={onClick} className="block w-full text-left">{inner}</button>;
}
