import "server-only";
import { supabaseAdmin } from "./supabase";

/* Records per-account AI usage in the database. Fire-and-forget and fully
   guarded: no account header or no Supabase config => no-op. Uses the service
   role + an atomic SQL function so counts are race-safe. The account key is the
   email the client sends in x-user-id (also the profiles/usage key). */
export function recordUsage(req: Request): void {
  const email = (req.headers.get("x-user-id") || "").trim().slice(0, 200);
  if (!email) return;
  const db = supabaseAdmin();
  if (!db) return;
  void db.rpc("increment_ai_usage", { p_email: email }).then(
    () => {},
    () => {}
  );
}
