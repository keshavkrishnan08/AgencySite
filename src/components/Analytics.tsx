'use client';

import Script from 'next/script';
import { useEffect } from 'react';

const PH_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Funnel events. Keep these names stable — dashboards query them by string. */
export const EVENTS = {
  ctaClick: 'cta_click',
  formStart: 'form_start',
  formComplete: 'form_complete',
  resultViewed: 'result_viewed',
  paywallViewed: 'paywall_viewed',
  checkoutStarted: 'checkout_started',
  trialStarted: 'trial_started',
  purchased: 'purchased',
  pageView: 'page_view',
} as const;

export type FunnelEvent = (typeof EVENTS)[keyof typeof EVENTS];

/**
 * posthog-js is browser-only and heavy. It is imported lazily rather than at
 * module scope so it never enters the server bundle — a static import breaks
 * Next's static-paths worker on any prerendered route.
 */
let ph: typeof import('posthog-js').default | null = null;

async function posthog() {
  if (!PH_KEY || typeof window === 'undefined') return null;
  ph ??= (await import('posthog-js')).default;
  return ph;
}

/** Fires to PostHog and the Meta Pixel together so the funnel stays consistent. */
export function track(event: FunnelEvent, props: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;

  void posthog().then((p) => p?.capture(event, props));

  const pixelMap: Partial<Record<FunnelEvent, string>> = {
    [EVENTS.ctaClick]: 'ViewContent',
    [EVENTS.formComplete]: 'Lead',
    [EVENTS.paywallViewed]: 'AddToCart',
    [EVENTS.checkoutStarted]: 'InitiateCheckout',
    [EVENTS.trialStarted]: 'StartTrial',
    [EVENTS.purchased]: 'Purchase',
  };
  const pixelEvent = pixelMap[event];
  if (pixelEvent) window.fbq?.('track', pixelEvent, props);
}

/** Track a named page view with the pixel — use on key conversion pages. */
export function trackPage(page: string, params: Record<string, string> = {}) {
  if (typeof window === 'undefined') return;
  void posthog().then((p) => p?.capture('$pageview', { page, ...params }));
  window.fbq?.('trackCustom', 'PageView', { page, ...params });
}

export function Analytics() {
  useEffect(() => {
    if (!PH_KEY) return;
    void posthog().then((p) =>
      p?.init(PH_KEY, {
        api_host: PH_HOST,
        capture_pageview: true,
        capture_pageleave: true,
        persistence: 'localStorage+cookie',
      }),
    );
  }, []);

  if (!PIXEL_ID) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
      </Script>
      <noscript>
        <img height="1" width="1" style={{ display: 'none' }} alt=""
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}
