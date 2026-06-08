"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AppNav } from "./AppNav";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/lib/auth";

/* Authed app chrome: a hover-expand sidebar on the left (lg+) plus a slim top
   bar. Content gets a fixed 76px left clearance for the collapsed rail; the
   rail expands over the page on hover, so content never reflows.

   When auth is configured and nobody is signed in, this redirects to /signin.
   Until the Supabase anon key is set, authConfigured() is false and the guard
   is inert, so the app behaves exactly as before. */
export function AppShell({ children }: { children: ReactNode }) {
  const { configured, user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const blocked = configured && !loading && !user;

  useEffect(() => {
    if (blocked) router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
  }, [blocked, pathname, router]);

  if (blocked) {
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
