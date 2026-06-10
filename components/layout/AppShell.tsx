"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AppNav } from "./AppNav";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/lib/auth";
import { getProfile, isPremium, onStoreChange, setProfile, upgradeToPremium } from "@/lib/store";

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

export function AppShell({ children, requirePremium = true }: { children: ReactNode; requirePremium?: boolean }) {
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
  // anyone typing the URL) is never let in.
  const [verifying, setVerifying] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("upgraded") === "1"
  );

  useEffect(() => {
    const sync = () => setPremium(isPremium());
    sync();
    return onStoreChange(sync);
  }, []);

  useEffect(() => {
    if (!verifying) return;
    const sessionId = new URLSearchParams(window.location.search).get("session_id") || "";
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
        checkedFor = null; // re-confirm against the DB on next gate
        setPremium(true);
      }
      window.history.replaceState({}, "", pathname); // strip the query either way
      setVerifying(false);
    })();
    return () => {
      alive = false;
    };
  }, [verifying, pathname]);

  // Reconcile access against the authoritative subscription before gating.
  useEffect(() => {
    if (!configured) return; // gate inert
    if (loading) return; // wait for auth to resolve
    if (!user) {
      setSubChecked(true);
      return;
    }
    const email = getProfile().email;
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
      .then((s: { premium: boolean; status: string }) => {
        if (!alive) return;
        // "none" = no subscription row (e.g. just paid, webhook not in yet):
        // leave the local/optimistic flag alone. Otherwise the DB is the truth.
        if (s && s.status !== "none") {
          // Set the premium STATE synchronously with the result — don't rely on
          // the async store-change event, or for one render `subChecked` is true
          // while `premium` is still false and the gate wrongly bounces to /upgrade.
          if (s.premium) {
            upgradeToPremium();
            setPremium(true);
          } else if (isPremium()) {
            setProfile({ plan: "free" });
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
  const needsPay = ready && !!user && subChecked && !premium && !exemptFromPay && !verifying;

  useEffect(() => {
    if (needsAuth) router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
  }, [needsAuth, pathname, router]);

  useEffect(() => {
    if (needsPay) router.replace("/upgrade");
  }, [needsPay, router]);

  if (needsAuth || needsPay || checkingSub || verifying) {
    return (
      <main className="grid min-h-screen place-items-center gap-3 text-center">
        <Loader2 size={28} className="animate-spin text-primary" />
        {verifying && <p className="text-sm text-ink-3">Confirming your payment…</p>}
      </main>
    );
  }

  return (
    <>
      <AppSidebar />
      <div className="lg:pl-[76px]">
        <AppNav minimal />
        {children}
      </div>
    </>
  );
}
