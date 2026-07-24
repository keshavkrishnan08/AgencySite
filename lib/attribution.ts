"use client";

/* First-touch ad attribution.
 *
 * Meta strips nothing, but users wander: they click an ad, bounce, come back
 * from a bookmark, and convert on a session with no query string. If we read
 * UTMs at conversion time we'd credit "direct" for traffic we paid for. So we
 * capture on the very first pageview and keep it. First touch wins. */

const KEY = "pp:attr";

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  fbclid?: string;
  referrer?: string;
  landing_path?: string;
  capturedAt?: string;
}

const FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"] as const;

/** Read stored attribution, capturing it from the URL on the first visit. */
export function attribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored) return JSON.parse(stored) as Attribution;

    const q = new URLSearchParams(window.location.search);
    const attr: Attribution = { capturedAt: new Date().toISOString() };
    FIELDS.forEach((f) => {
      const v = q.get(f);
      if (v) (attr as Record<string, string>)[f] = v.slice(0, 200);
    });
    // Only record a referrer from another origin; same-site nav isn't a source.
    const ref = document.referrer || "";
    if (ref && !ref.startsWith(window.location.origin)) attr.referrer = ref.slice(0, 300);
    attr.landing_path = window.location.pathname.slice(0, 200);

    // Don't burn a "direct, no referrer" first touch into storage — a later
    // real ad click is more useful than an empty record from a bookmark visit.
    const worthKeeping = FIELDS.some((f) => attr[f]) || attr.referrer;
    if (worthKeeping) window.localStorage.setItem(KEY, JSON.stringify(attr));
    return attr;
  } catch {
    return {};
  }
}

/** Stable anonymous id, shared with lib/analytics so events and leads join up. */
export function anonId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = window.localStorage.getItem("pp:anon");
    if (!id) {
      id = `anon_${Math.floor(performance.now()).toString(36)}${Math.floor((performance.now() % 1) * 1e9).toString(36)}`;
      window.localStorage.setItem("pp:anon", id);
    }
    return id;
  } catch {
    return "anon";
  }
}
