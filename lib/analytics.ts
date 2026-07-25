"use client";

/* Funnel analytics fan-out. Mixpanel is the analysis surface; Supabase is the
   durable copy we own; Vercel and Meta cover traffic and ad optimisation.
   Every sink no-ops without its key, so the app runs untouched when unset.
   See the launch runbook in MONETIZATION.md. */

import { track as vercelTrack } from "@vercel/analytics";
import { attribution } from "./attribution";
import { initMixpanel, mixpanelIdentify, mixpanelRegister, mixpanelTrack } from "./mixpanel";

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

/* Two tiers of event.
 *
 * FunnelEvent — the handful of steps the business is judged on. Stable names,
 *   exhaustive union, safe to build dashboards and ad optimisation on. Never
 *   rename one of these without migrating the dashboards.
 *
 * MicroEvent — everything else, namespaced `area:thing`. These are for finding
 *   out WHY a funnel number moved: which CTA, which step, how far they
 *   scrolled, where they hesitated. Cheap to add, safe to churn, and the
 *   namespace keeps them from polluting the funnel list.
 */
type Namespace =
  | "page"        // page:view, page:exit
  | "scroll"      // scroll:50
  | "engage"      // engage:15s, engage:idle
  | "ui"          // ui:cta_click, ui:accordion_open
  | "section"     // section:view
  | "onboarding"  // onboarding:step_view, onboarding:answer
  | "practice"    // practice:answer_start, practice:voice_start
  | "session"     // session:results_view, session:share
  | "paywall"     // paywall:view, paywall:cta_click
  | "presale"     // presale:email_focus
  | "form"        // form:field_focus, form:error
  | "account"     // account:signin, account:signup_error
  | "metrics"     // metrics:view
  | "job"         // job:role_change, job:practice
  | "prefs"       // prefs:update, prefs:reset
  | "tool";       // tool:run, tool:handoff

export type MicroEvent = `${Namespace}:${string}`;

/** The funnel events worth watching. Keep names stable. */
export type FunnelEvent =
  | "landing_cta_click"
  | "onboarding_situation"
  | "onboarding_complete"
  | "session_started"
  | "session_complete"
  | "account_created"
  | "tool_opened"
  | "paywall_hit"
  | "voice_used"
  | "upgrade_view"
  | "upgrade_click"
  | "upgrade_success"
  | "questions_predicted"
  | "gap_story_built"
  | "lead_captured"
  | "presale_intent";

/** Anything track() accepts. */
export type PPEvent = FunnelEvent | MicroEvent;

/* Map our funnel events to Meta's standard events so the ad campaign can
   optimize for and attribute conversions. */
const META_EVENT: Partial<Record<FunnelEvent, string>> = {
  // During the presale the email IS the conversion, so that's what the campaign
  // optimises for. Swap the objective to Subscribe once payments are live.
  lead_captured: "Lead",
  presale_intent: "InitiateCheckout",
  onboarding_complete: "Lead",
  account_created: "CompleteRegistration",
  upgrade_view: "ViewContent",
  upgrade_click: "InitiateCheckout",
  upgrade_success: "Subscribe",
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Set once the user identifies themselves, so events join to a lead/profile. */
let identity: string | null = null;
export function identify(email: string, props: Record<string, unknown> = {}): void {
  identity = (email || "").trim().toLowerCase() || null;
  if (identity) mixpanelIdentify(identity, props);
}

/** Properties that should ride on every subsequent event (plan, cohort, etc). */
export function setContext(props: Record<string, unknown>): void {
  mixpanelRegister(props);
}

/* Four sinks, in order of how much we trust them:
     1. Supabase  — ours, survives ad blockers, the number we spend against
     2. Mixpanel  — the analysis surface: funnels, retention, replays, click rates
     3. Vercel    — traffic and vitals, next to the deployment
     4. Meta      — so the campaign can optimise for conversions
   Each is fire-and-forget and independently guarded. A dead sink never blocks
   the other two and never surfaces to the user. */
export function track(event: PPEvent, properties: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;

  const path = window.location.pathname;
  const anon = distinctId();

  // 1. Our own copy. Roughly a fifth of this demographic blocks the pixel, and
  //    it isn't a random fifth, so a pixel-only funnel is a biased funnel.
  try {
    const attr = attribution();
    void fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        name: event,
        anonId: anon,
        email: identity,
        props: properties,
        path,
        attribution: attr,
      }),
    }).catch(() => {});
  } catch {
    /* never break the app */
  }

  // 2. Mixpanel — the analysis surface. Autocapture already records raw
  //    clicks and submits; these are the named steps worth building funnels on.
  try {
    initMixpanel();
    mixpanelTrack(event, { ...properties, path });
  } catch {
    /* never break the app */
  }

  // 3. Vercel Web Analytics custom event, so conversions sit next to the
  //    pageview and traffic-source data on the same dashboard as the deploy.
  try {
    const flat: Record<string, string | number | boolean | null> = {};
    for (const [k, v] of Object.entries(properties).slice(0, 10)) {
      if (v === null || ["string", "number", "boolean"].includes(typeof v)) {
        flat[k] = v as string | number | boolean | null;
      }
    }
    vercelTrack(event, flat);
  } catch {
    /* never break the app */
  }

  // 4. Meta Pixel standard event (fires only when the Pixel is loaded).
  const metaEvent = (META_EVENT as Record<string, string | undefined>)[event];
  if (metaEvent && typeof window.fbq === "function") {
    try {
      const payload =
        event === "upgrade_success"
          ? { currency: "USD", value: Number(properties.value) || 19.99 }
          : {};
      window.fbq("track", metaEvent, payload);
    } catch {
      /* never break the app */
    }
  }
}
