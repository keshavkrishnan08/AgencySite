"use client";

/* Lightweight funnel analytics. PostHog-compatible capture over fetch, so there
   is no SDK dependency. No-ops with no key, so the app runs untouched until you
   set NEXT_PUBLIC_POSTHOG_KEY. See the launch runbook in MONETIZATION.md. */

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

function distinctId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = window.localStorage.getItem("pp:anon");
    if (!id) {
      id = `anon_${Math.floor(performance.now()).toString(36)}${Math.floor(performance.now() % 1 * 1e9).toString(36)}`;
      window.localStorage.setItem("pp:anon", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/** The funnel events worth watching. Keep names stable. */
export type PPEvent =
  | "landing_cta_click"
  | "onboarding_situation"
  | "onboarding_complete"
  | "session_started"
  | "session_complete"
  | "tool_opened"
  | "paywall_hit"
  | "voice_used"
  | "upgrade_view"
  | "upgrade_click"
  | "upgrade_success"
  | "interview_tracked"
  | "offer_logged";

export function track(event: PPEvent, properties: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  if (!KEY) return; // no-op until configured
  try {
    void fetch(`${HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        api_key: KEY,
        event,
        distinct_id: distinctId(),
        properties: { ...properties, $current_url: window.location.pathname },
      }),
    });
  } catch {
    /* analytics must never break the app */
  }
}
