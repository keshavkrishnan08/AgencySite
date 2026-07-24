"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authConfigured, supabaseBrowser } from "./supabase-browser";
import { getProfile, getSessions, hydrateLocal, setProfile } from "./store";
import { pullProfile, pullSessions, pushProfile, pushSession } from "./cloud";

interface AuthState {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string; needsConfirm?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithLink: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = authConfigured();
  const hydrated = useRef(false);

  // Two-way sync on sign-in: pull cloud records into local, then push any
  // local-only records (from anon use) up. Idempotent; runs once per session.
  const hydrate = useCallback(async () => {
    if (hydrated.current) return;
    hydrated.current = true;
    const [profile, sessions] = await Promise.all([pullProfile(), pullSessions()]);
    hydrateLocal({ profile, sessions });
    getSessions().forEach((s) => void pushSession(s));
    void pushProfile(getProfile());
  }, []);

  // Mirror the Supabase identity into the local profile so existing
  // email/premium logic keeps working unchanged.
  const syncProfile = useCallback((u: User | null) => {
    if (!u) return;
    const name = (u.user_metadata?.name as string) || "";
    setProfile({ email: u.email || "", ...(name ? { name } : {}) });
  }, []);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) {
      setLoading(false);
      return;
    }
    sb.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      syncProfile(u);
      if (u) void hydrate();
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      syncProfile(u);
      if (u) void hydrate();
    });
    return () => sub.subscription.unsubscribe();
  }, [syncProfile]);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const sb = supabaseBrowser();
    if (!sb) return { error: "Auth is not configured yet." };
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: name ? { name } : undefined },
    });
    if (error) return { error: error.message };
    // If email confirmation is on, there's no session until they confirm.
    return { needsConfirm: !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = supabaseBrowser();
    if (!sb) return { error: "Auth is not configured yet." };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }, []);

  const signInWithLink = useCallback(async (email: string) => {
    const sb = supabaseBrowser();
    if (!sb) return { error: "Auth is not configured yet." };
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined },
    });
    return error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => {
    const sb = supabaseBrowser();
    await sb?.auth.signOut();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, configured, signUp, signIn, signInWithLink, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
