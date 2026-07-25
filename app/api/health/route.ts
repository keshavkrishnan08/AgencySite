import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Production readiness probe.
 *
 * Reports whether each integration's env var is PRESENT in the deployed
 * environment. It returns booleans only, never the values, so it's safe to hit
 * publicly. Use it to confirm a key actually made it into Vercel prod (the thing
 * you can't see from a client bundle). Example: curl https://axonservices.dev/api/health
 */
const present = (v?: string | null) => Boolean(v && v.trim());

export function GET() {
  return NextResponse.json({
    ok: true,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    analytics: {
      mixpanel: present(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN),
      metaPixel: present(process.env.NEXT_PUBLIC_META_PIXEL_ID),
    },
    ai: {
      anthropic: present(process.env.ANTHROPIC_API_KEY),
      openai: present(process.env.OPENAI_API_KEY),
    },
    billing: {
      stripeSecret: present(process.env.STRIPE_SECRET_KEY),
      stripeWebhook: present(process.env.STRIPE_WEBHOOK_SECRET),
      stripePublishable: present(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    },
    data: {
      supabaseUrl: present(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseAnon: present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || present(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      supabaseService: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    ops: {
      cronSecret: present(process.env.CRON_SECRET),
      reportsPassword: present(process.env.REPORTS_PASSWORD),
    },
  });
}
