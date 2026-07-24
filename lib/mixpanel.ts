"use client";

import mixpanel from "mixpanel-browser";
import { anonId, attribution } from "./attribution";

/* Mixpanel: the deep-analysis sink.
 *
 * The other sinks each answer one question — Supabase is the durable copy we
 * own, Vercel gives traffic and vitals next to the deploy, Meta optimises the
 * ad. Mixpanel is where you actually interrogate behaviour: funnels, retention,
 * per-page click-through, feature adoption, replays of the sessions that
 * dropped.
 *
 * Two things make it comprehensive without hand-instrumenting every element:
 *
 *   autocapture — every click, form submit and input interaction, tagged with
 *     the element, its text and its page. This is what makes "% of visitors
 *     who clicked this button" answerable for buttons nobody thought to
 *     instrument.
 *   super properties — attribution, plan, and session depth are registered
 *     once and ride along on every event, so any funnel can be broken down by
 *     campaign or by how experienced the user is without extra work.
 *
 * Env-gated: with no token every function here is a no-op, so local dev and a
 * misconfigured deploy both stay silent rather than throwing.
 */

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
// Session replay is the expensive one. Sample it rather than recording all.
const REPLAY_PCT = Number(process.env.NEXT_PUBLIC_MIXPANEL_REPLAY_PCT ?? "10");

let started = false;

export function mixpanelReady(): boolean {
  return Boolean(TOKEN) && started;
}

/** Initialise once, on the client. Safe to call repeatedly. */
export function initMixpanel(): void {
  if (started || !TOKEN || typeof window === "undefined") return;
  try {
    mixpanel.init(TOKEN, {
      // We fire our own page:view from <Telemetry/> with richer properties
      // (referring route, attribution), so Mixpanel's own pageview would only
      // double-count.
      track_pageview: false,
      persistence: "localStorage",
      // Everything a person touches, without per-element instrumentation.
      autocapture: {
        pageview: false,
        click: true,
        input: true,
        submit: true,
        scroll: true,
      },
      record_sessions_percent: Math.max(0, Math.min(100, REPLAY_PCT)),
      // Our own anonymous id, so Mixpanel joins to Supabase events and leads.
      loaded: (mp) => {
        try {
          mp.identify(anonId());
        } catch {
          /* ignore */
        }
      },
    } as Parameters<typeof mixpanel.init>[1]);

    started = true;

    // Attribution rides on every event, so any funnel breaks down by campaign.
    const attr = attribution();
    mixpanel.register({
      utm_source: attr.utm_source ?? null,
      utm_medium: attr.utm_medium ?? null,
      utm_campaign: attr.utm_campaign ?? null,
      utm_content: attr.utm_content ?? null,
      landing_path: attr.landing_path ?? null,
      referrer: attr.referrer ?? null,
      app: "axon-careers",
    });
  } catch {
    /* analytics must never break the app */
  }
}

/** Register properties that should ride on every subsequent event. */
export function mixpanelRegister(props: Record<string, unknown>): void {
  if (!mixpanelReady()) return;
  try {
    mixpanel.register(props);
  } catch {
    /* ignore */
  }
}

/** Tie the anonymous id to a real person, and set profile properties. */
export function mixpanelIdentify(email: string, props: Record<string, unknown> = {}): void {
  if (!mixpanelReady() || !email) return;
  try {
    // alias links the pre-signup anonymous history to the identified user, so
    // the funnel from first ad click through to payment stays one person.
    mixpanel.alias(email, anonId());
    mixpanel.identify(email);
    mixpanel.people.set({ $email: email, ...props });
  } catch {
    /* ignore */
  }
}

/** Increment a lifetime counter on the person (sessions run, answers given). */
export function mixpanelIncrement(prop: string, by = 1): void {
  if (!mixpanelReady()) return;
  try {
    mixpanel.people.increment(prop, by);
  } catch {
    /* ignore */
  }
}

export function mixpanelTrack(event: string, props: Record<string, unknown> = {}): void {
  if (!mixpanelReady()) return;
  try {
    mixpanel.track(event, props);
  } catch {
    /* ignore */
  }
}
