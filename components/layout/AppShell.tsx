"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { AppNav } from "./AppNav";
import { AppSidebar } from "./AppSidebar";
import { CoachChat } from "@/components/chat/CoachChat";
import { ProductTour } from "@/components/tour/ProductTour";
import { NudgeToasts } from "@/components/nudge/Nudges";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { getProfile, getSessions, isPremium, onStoreChange, setProfile, upgradeToPremium } from "@/lib/store";
import { PLANS, PLAN_ORDER, priceParts, type PlanKey } from "@/lib/pricing";
import { track } from "@/lib/analytics";

/* Authed app chrome + access gate.

   The app is for paying customers. Access rules (only when auth is configured):
     1. not signed in            -> /signin
     2. signed in, not premium   -> /upgrade   (except on /upgrade and /settings)
     3. signed in + premium       -> in.

   Access is authoritative from the subscription. We must NOT decide "not paying"
   until that check returns, or a returning subscriber signing in fresh (premium
   only in the DB, not yet local) gets wrongly bounced to /upgrade. So while the
   subscription check is in flight we show a loader, never a redirect.

   Until the Supabase anon key is set, authConfigured() is false and the gate is
   inert, so local/dev keeps working. */
// Remembers which account's subscription we've already verified this session,
// so navigating between authed pages doesn't re-show the gate loader.
let checkedFor: string | null = null;

export function AppShell({
  children,
  requirePremium = true,
  bare = false,
}: {
  children: ReactNode;
  requirePremium?: boolean;
  bare?: boolean;
}) {
  const { configured, user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Seed from localStorage so a cached nav renders instantly with the right
  // access state (no loader flash, no one-frame false redirect).
  const [premium, setPremium] = useState(() => (typeof window !== "undefined" ? isPremium() : false));
  const [subChecked, setSubChecked] = useState(
    () => typeof window !== "undefined" && checkedFor !== null && checkedFor === getProfile().email
  );
  // Returning from Stripe Checkout (?upgraded=1): hold a loader and VERIFY the
  // session was actually paid before granting access. A user who cancels (or
  // anyone typing the URL) is never let in. Seeded false (matches SSR — no
  // hydration mismatch) and flipped on in the client-only effect below.
  const [verifying, setVerifying] = useState(false);
  // The authoritative subscription decision (null = not yet checked). Once the
  // sub-status check has decided, it WINS over the local profile.plan flag — so a
  // "canceled but still within the paid period" user (whose profile.plan is
  // 'free') keeps access, and store writes can't clobber the grant.
  const subDecision = useRef<boolean | null>(null);

  useEffect(() => {
    const sync = () => setPremium(subDecision.current !== null ? subDecision.current : isPremium());
    sync();
    return onStoreChange(sync);
  }, []);

  useEffect(() => {
    // Client-only: detect the Stripe return here (not in initial state) so SSR
    // and first client render agree (no hydration mismatch).
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") !== "1") return;
    setVerifying(true);
    const sessionId = params.get("session_id") || "";
    let alive = true;
    (async () => {
      let paid = false;
      try {
        const r = await fetch("/api/verify-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        paid = !!(await r.json())?.paid;
      } catch {
        /* treat as unpaid */
      }
      if (!alive) return;
      if (paid) {
        upgradeToPremium();
        subDecision.current = true;
        checkedFor = null; // re-confirm against the DB on next gate
        setPremium(true);
      }
      window.history.replaceState({}, "", pathname); // strip the query either way
      setVerifying(false);
    })();
    return () => {
      alive = false;
    };
  }, [pathname]);

  // Reconcile access against the authoritative subscription before gating.
  useEffect(() => {
    if (!configured) return; // gate inert
    if (loading) return; // wait for auth to resolve
    if (!user) {
      setSubChecked(true);
      return;
    }
    // Key on the AUTHENTICATED identity, not localStorage (which lags the session
    // right after sign-in and would send an empty email -> "none" -> wrong bounce).
    const email = user.email || getProfile().email;
    if (!email) {
      setSubChecked(true);
      return;
    }
    if (checkedFor === email) {
      // Already verified this account this session; skip the blocking check.
      setSubChecked(true);
      return;
    }
    let alive = true;
    fetch("/api/subscription-status", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": email },
    })
      .then((r) => r.json())
      .then((s: { premium?: boolean; status?: string; rateLimited?: boolean; error?: string }) => {
        if (!alive) return;
        // "none" = no subscription row (e.g. just paid, webhook not in yet):
        // leave the local/optimistic flag alone. Otherwise the DB is the truth.
        // Only a DEFINITIVE status counts. A rate-limit/error response (no boolean
        // premium, or rateLimited) is inconclusive — leave the current state
        // alone; never revoke a paying user over a transient 429 or network blip.
        const definitive = s && typeof s.premium === "boolean" && !s.rateLimited && !s.error;
        if (definitive && s.status !== "none") {
          // Authoritative: record the decision so onStoreChange/hydrate can't
          // override it, and set the premium state synchronously with the result.
          subDecision.current = !!s.premium;
          if (s.premium) {
            upgradeToPremium();
            setPremium(true);
          } else {
            if (isPremium()) setProfile({ plan: "free" });
            setPremium(false);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        checkedFor = email;
        if (alive) setSubChecked(true);
      });
    return () => {
      alive = false;
    };
  }, [configured, loading, user]);

  // /upgrade so they can pay; /settings so they can always manage/sign out.
  const exemptFromPay = !requirePremium || pathname === "/upgrade" || pathname === "/settings";
  const ready = configured && !loading;
  const needsAuth = ready && !user;
  // Don't judge "not paying" until the subscription check has returned.
  const checkingSub = ready && !!user && !subChecked && !exemptFromPay;
  // Never judge "not paying" while a checkout return is still being verified.
  // Free hook: /practice is unblurred until the user gets their first scored answer.
  // After that, everything blurs except the /session/ results page (so they can see
  // their score — that's the "aha" moment that drives the paywall conversion).
  const hasSeenScore = typeof window !== "undefined" && localStorage.getItem("pp:free_scored") === "1";
  const isResultsPage = pathname.startsWith("/session/");
  const isPracticePage = pathname === "/practice";
  const freeSessionExempt = !hasSeenScore && isPracticePage;
  // Let them see their score result once — then blur everything after
  const freeResultExempt = hasSeenScore && isResultsPage && getSessions().length <= 1;
  const needsPay = ready && !!user && subChecked && !premium && !exemptFromPay && !verifying && !freeSessionExempt && !freeResultExempt;

  useEffect(() => {
    if (needsAuth) router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
  }, [needsAuth, pathname, router]);

  // Auth is still hard-required (you need an account). But we NO LONGER bounce
  // unpaid users to /upgrade — the app renders normally and, if they haven't
  // paid, the content blurs behind a renew overlay instead. So there's nothing
  // "in front of" the app: paying users land straight in it.
  if (needsAuth || checkingSub || verifying) {
    return (
      <main className="grid min-h-screen place-items-center gap-3 text-center">
        <Loader2 size={28} className="animate-spin text-primary" />
        {verifying && <p className="text-sm text-ink-3">Confirming your payment…</p>}
      </main>
    );
  }

  // Chromeless mode: a focused surface (e.g. checkout) with no clickable nav or
  // sidebar — just the gated content.
  if (bare) return <>{children}</>;

  return (
    <>
      <AppSidebar />
      <div className="lg:pl-[76px]">
        <AppNav minimal />
        {needsPay ? (
          <div className="relative h-[calc(100vh-3.5rem)] overflow-hidden">
            {/* The real app, rendered but frozen behind a blur — so people see
                exactly what they're unlocking, not a wall. No scroll. */}
            <div className="pointer-events-none select-none blur-[6px] saturate-[0.9] h-full overflow-hidden" aria-hidden>
              {children}
            </div>
            <PaywallOverlay onRenew={() => router.push("/upgrade")} onManage={() => router.push("/settings")} />
          </div>
        ) : (
          children
        )}
      </div>
      {/* The coach button is always present (floating, bottom-right). The tour is
          first-run only and never over the paywall. */}
      <CoachChat />
      <NudgeToasts />
      {!needsPay && <ProductTour />}
    </>
  );
}

/* Soft paywall. Shown over a blurred app for a signed-in user without an active
   subscription — never a redirect, never a dead end. They can start/renew, or
   drop into settings to manage the account. */
function PaywallOverlay({ onRenew, onManage }: { onRenew: () => void; onManage: () => void }) {
  const [plan, setPlan] = useState<PlanKey>("quarterly");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const p = PLANS[plan];
  const [dollars, cents] = priceParts(plan);

  const subscribe = async () => {
    setLoading(true);
    setErr("");
    track("upgrade_click", { plan, source: "paywall" });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: getProfile().email || undefined }),
      });
      const data = await res.json();
      if (data?.url) { window.location.href = data.url; return; }
      throw new Error(data?.error || "Checkout unavailable");
    } catch {
      setErr("Couldn't start checkout. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-start justify-center overflow-y-auto px-4 py-8 sm:items-center sm:py-0">
      <div className="w-full max-w-md rounded-2xl border shadow-2xl" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {/* Header */}
        <div className="rounded-t-2xl px-6 py-5 text-center text-white" style={{ background: "linear-gradient(135deg, #19a9b8 0%, #0c5660 100%)" }}>
          <h2 className="font-serif text-2xl font-semibold">Unlock unlimited practice</h2>
          <p className="mt-1 text-sm text-white/75">Your score is ready to climb. Pick a plan.</p>
        </div>

        {/* Plan selector */}
        <div className="space-y-2 px-5 pt-5">
          {PLAN_ORDER.map((key) => {
            const pl = PLANS[key];
            const on = plan === key;
            return (
              <button
                key={key}
                onClick={() => setPlan(key)}
                className="relative flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all"
                style={{
                  borderColor: on ? "var(--primary)" : "var(--border-strong)",
                  background: on ? "var(--primary-soft)" : "transparent",
                  boxShadow: on ? "0 0 0 1px var(--primary)" : "none",
                }}
              >
                {key === "quarterly" && (
                  <span className="absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: "var(--primary-ink)" }}>
                    1-day free trial
                  </span>
                )}
                <span className="grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border-2" style={{ borderColor: on ? "var(--primary)" : "var(--border-strong)", width: 18, height: 18 }}>
                  {on && <span className="rounded-full" style={{ background: "var(--primary)", width: 10, height: 10 }} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{pl.toggle}</span>
                    {pl.savePct > 0 && <span className="rounded-full bg-sage-soft px-1.5 py-0.5 text-[10px] font-bold text-sage-ink">Save {pl.savePct}%</span>}
                  </span>
                  <span className="block text-xs text-ink-3">{pl.perMonth}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="font-serif text-base font-semibold text-ink">{pl.price}</span>
                  {pl.was && <span className="block text-[10px] text-ink-3 line-through">{pl.was}</span>}
                </span>
              </button>
            );
          })}
        </div>

        {/* Subscribe button */}
        <div className="px-5 pb-5 pt-4">
          {plan === "quarterly" ? (
            <p className="mb-3 text-center text-xs text-ink-3">Due today: <strong className="text-sage-ink">$0.00</strong> · then {p.price} after trial</p>
          ) : (
            <p className="mb-3 text-center text-xs text-ink-3">Due today: <strong>{p.price}</strong></p>
          )}
          <Button size="lg" className="w-full !py-3.5" onClick={subscribe} disabled={loading}>
            {loading ? <><Loader2 size={18} className="animate-spin" /> Redirecting…</> : plan === "quarterly" ? <>Start free trial</> : <>Subscribe · {p.price}</>}
          </Button>
          {err && <p className="mt-2 text-center text-xs text-coral-ink">{err}</p>}
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-3">
            <ShieldCheck size={12} /> Secure checkout · cancel anytime
          </p>
          <button onClick={onManage} className="mt-2 block w-full text-center text-xs text-ink-3 transition-colors hover:text-ink-2">
            Manage account
          </button>
        </div>
      </div>
    </div>
  );
}
