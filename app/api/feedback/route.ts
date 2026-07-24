import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Two kinds of feedback, one route, because they're the same shape of problem:
   a short structured answer we want in the database and nowhere else.

     kind: "review"   -> public.reviews   (rating + words, before payment)
     kind: "outcome"  -> public.outcomes  (why they left, "I got the job" first)

   Both always return ok. A person telling you they got the job must never see
   an error, and a failed insert is our problem, not theirs. */

const str = (v: unknown, max = 400): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
const int = (v: unknown): number | null =>
  Number.isFinite(v) ? Math.round(Number(v)) : null;

const REASONS = new Set([
  "got_job",
  "still_looking",
  "took_break",
  "too_expensive",
  "not_useful",
  "missing_features",
  "other",
]);

export async function POST(req: Request) {
  const limited = await rateLimit(req);
  if (limited) return limited;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ ok: true, stored: false });

  try {
    if (body?.kind === "outcome") {
      const reason = str(body?.reason, 40) ?? "other";
      if (!REASONS.has(reason)) {
        return NextResponse.json({ ok: false, error: "unknown reason" }, { status: 400 });
      }
      const { error } = await db.from("outcomes").insert({
        email: str(body?.email, 200)?.toLowerCase() ?? null,
        anon_id: str(body?.anonId, 80),
        reason,
        got_job: reason === "got_job",
        company: str(body?.company, 160),
        role: str(body?.role, 160),
        salary_band: str(body?.salaryBand, 40),
        weeks_searching: int(body?.weeksSearching),
        sessions_done: int(body?.sessionsDone),
        readiness: int(body?.readiness),
        best_score: int(body?.bestScore),
        streak_longest: int(body?.streakLongest),
        detail: str(body?.detail, 1000),
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, stored: true });
    }

    // Default: a review.
    const rating = int(body?.rating);
    if (rating === null || rating < 1 || rating > 5) {
      return NextResponse.json({ ok: false, error: "rating 1-5 required" }, { status: 400 });
    }
    const { error } = await db.from("reviews").insert({
      email: str(body?.email, 200)?.toLowerCase() ?? null,
      anon_id: str(body?.anonId, 80),
      rating,
      body: str(body?.body, 2000),
      stage: str(body?.stage, 40) ?? "pre_payment",
      situation: str(body?.situation, 40),
      target_role: str(body?.targetRole, 160),
      sessions_done: int(body?.sessionsDone),
      readiness: int(body?.readiness),
      consent_public: body?.consentPublic === true,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, stored: true });
  } catch (e: any) {
    return NextResponse.json({ ok: true, stored: false, error: e?.message ?? "store failed" });
  }
}
