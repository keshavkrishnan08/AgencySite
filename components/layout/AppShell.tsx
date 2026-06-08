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
     2. signed in, not premium   -> /upgrade   (except on /upgrade itself, so
                                                 they can actually pay)
     3. signed in + premium      -> in.

   Premium is read from the local profile, which is hydrated from the DB on
   sign-in and flipped on a successful checkout. We give hydration a short grace
   window so a real premium user is never bounced to /upgrade on first paint.

   Until the Supabase anon key is set, authConfigured() is false and the whole
   gate is inert, so local/dev keeps working. */
export function AppShell({ children, requirePremium = true }: { children: ReactNode; requirePremium?: boolean }) {
  const { configured, user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [premium, setPremium] = useState(false);

  useEffect(() => {
    const sync = () => setPremium(isPremium());
    sync();
    return onStoreChange(sync);
  }, []);

  // Reconcile access against the authoritative subscription. Keeps premium while
  // inside the paid period; drops it once the sub has ended. "none" means no
  // subscription row (e.g. just paid, webhook not in yet) so we leave it alone.
  useEffect(() => {
    if (!configured || loading || !user) return;
    const email = getProfile().email;
    if (!email) return;
    fetch("/api/subscription-status", { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": email } })
      .then((r) => r.json())
      .then((s: { premium: boolean; status: string }) => {
        if (!s || s.status === "none") return;
        if (s.premium) {
          if (!isPremium()) upgradeToPremium();
        } else if (isPremium()) {
          setProfile({ plan: "free" });
        }
      })
      .catch(() => {});
  }, [configured, loading, user]);

  // /upgrade so they can pay; /settings so they can always manage/sign out.
  const exemptFromPay = !requirePremium || pathname === "/upgrade" || pathname === "/settings";
  const ready = configured && !loading;
  const needsAuth = ready && !user;
  const needsPay = ready && !!user && !premium && !exemptFromPay;

  // 1) signed out -> sign in
  useEffect(() => {
    if (needsAuth) router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
  }, [needsAuth, pathname, router]);

  // 2) signed in but not paying -> upgrade (after a grace window for DB hydrate)
  useEffect(() => {
    if (!needsPay) return;
    const t = setTimeout(() => {
      if (!isPremium()) router.replace("/upgrade");
    }, 1400);
    return () => clearTimeout(t);
  }, [needsPay, router]);

  if (needsAuth || needsPay) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 size={28} className="animate-spin text-primary" />
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
