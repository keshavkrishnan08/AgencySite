"use client";

import { supabaseBrowser } from "./supabase-browser";
import type { InterviewPlan, InterviewRecord, Session, UserProfile } from "./types";

/* Additive cloud sync. Every function is fire-and-forget and null-guarded: if
   auth isn't configured or nobody is signed in, it no-ops and the app keeps
   running entirely on localStorage. RLS makes each row reachable only by its
   owner, so a stolen anon key still can't read another user's data. */

async function currentUserId(): Promise<string | null> {
  const sb = supabaseBrowser();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/* ---------------- profile ---------------- */

export async function pushProfile(p: UserProfile): Promise<void> {
  const sb = supabaseBrowser();
  if (!sb) return;
  const id = await currentUserId();
  if (!id) return;
  try {
    await sb.from("profiles").update({
      name: p.name || null,
      situation: p.situation,
      target_role: p.targetRole || null,
      interview_gap: p.interviewGap,
      plan: p.plan,
    }).eq("id", id);
  } catch {
    /* ignore */
  }
}

export async function pullProfile(): Promise<Partial<UserProfile> | null> {
  const sb = supabaseBrowser();
  if (!sb) return null;
  const id = await currentUserId();
  if (!id) return null;
  try {
    const { data } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
    if (!data) return null;
    return {
      name: data.name || "",
      email: data.email || "",
      situation: data.situation ?? null,
      targetRole: data.target_role || "",
      interviewGap: data.interview_gap ?? null,
      plan: (data.plan as UserProfile["plan"]) || "free",
    };
  } catch {
    return null;
  }
}

/* ---------------- sessions ---------------- */

export async function pushSession(s: Session): Promise<void> {
  const sb = supabaseBrowser();
  if (!sb) return;
  const id = await currentUserId();
  if (!id) return;
  try {
    await sb.from("sessions").upsert(
      {
        user_id: id,
        client_id: s.id,
        target_role: s.targetRole || null,
        company: s.company ?? null,
        mode: s.mode,
        overall: s.overall,
        dimensions: s.dimensions,
        duration_seconds: s.durationSeconds,
        answers: s.answers,
        created_at: s.createdAt,
        data: s,
      },
      { onConflict: "user_id,client_id" }
    );
  } catch {
    /* ignore */
  }
}

export async function pullSessions(): Promise<Session[]> {
  const sb = supabaseBrowser();
  if (!sb) return [];
  const id = await currentUserId();
  if (!id) return [];
  try {
    const { data } = await sb.from("sessions").select("data").eq("user_id", id);
    return (data ?? []).map((r) => r.data as Session).filter(Boolean);
  } catch {
    return [];
  }
}

/* ---------------- interviews ---------------- */

export async function pushInterview(rec: InterviewRecord): Promise<void> {
  const sb = supabaseBrowser();
  if (!sb) return;
  const id = await currentUserId();
  if (!id) return;
  try {
    await sb.from("interviews").upsert(
      {
        user_id: id,
        client_id: rec.id,
        company: rec.company || null,
        role: rec.role || null,
        date: rec.date || null,
        status: rec.status,
        notes: rec.notes ?? null,
        created_at: rec.createdAt,
        data: rec,
      },
      { onConflict: "user_id,client_id" }
    );
  } catch {
    /* ignore */
  }
}

export async function deleteInterviewCloud(clientId: string): Promise<void> {
  const sb = supabaseBrowser();
  if (!sb) return;
  const id = await currentUserId();
  if (!id) return;
  try {
    await sb.from("interviews").delete().eq("user_id", id).eq("client_id", clientId);
  } catch {
    /* ignore */
  }
}

export async function pullInterviews(): Promise<InterviewRecord[]> {
  const sb = supabaseBrowser();
  if (!sb) return [];
  const id = await currentUserId();
  if (!id) return [];
  try {
    const { data } = await sb.from("interviews").select("data").eq("user_id", id);
    return (data ?? []).map((r) => r.data as InterviewRecord).filter(Boolean);
  } catch {
    return [];
  }
}

/* ---------------- plan (single active) ---------------- */

export async function pushPlan(plan: InterviewPlan): Promise<void> {
  const sb = supabaseBrowser();
  if (!sb) return;
  const id = await currentUserId();
  if (!id) return;
  try {
    await sb.from("plans").upsert(
      {
        user_id: id,
        client_id: plan.id,
        company: plan.company || null,
        role: plan.role || null,
        interview_date: plan.dateISO || null,
        days: plan.days,
        created_at: plan.createdAt,
        data: plan,
      },
      { onConflict: "user_id,client_id" }
    );
  } catch {
    /* ignore */
  }
}

export async function pullPlan(): Promise<InterviewPlan | null> {
  const sb = supabaseBrowser();
  if (!sb) return null;
  const id = await currentUserId();
  if (!id) return null;
  try {
    const { data } = await sb
      .from("plans")
      .select("data, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.data as InterviewPlan) ?? null;
  } catch {
    return null;
  }
}
