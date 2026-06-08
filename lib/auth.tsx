"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authConfigured, supabaseBrowser } from "./supabase-browser";
import { setProfile } from "./store";

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
      setUser(data.session?.user ?? null);
      syncProfile(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      syncProfile(session?.user ?? null);
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
