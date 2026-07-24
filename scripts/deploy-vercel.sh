#!/usr/bin/env bash
# Deploy Axon Careers to Vercel production and attach the domain.
#
# Prerequisite: `npx vercel login` with the account that owns the domain.
# Secrets are read from .env.local and piped straight to Vercel. Nothing is
# echoed, so this is safe to run with the output visible.
#
#   ./scripts/deploy-vercel.sh [domain] [vercel-project]
#
# Git already deploys this repo. The job this script really does is push the
# environment variables, without which /api/lead 503s and every presale email
# is refused.
#
set -euo pipefail

DOMAIN="${1:-axonservices.dev}"
# The Vercel project that already owns the domain. Override as arg 2.
PROJECT="${2:-agency-site}"
VC="npx --yes vercel@latest"

cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "!! .env.local not found. Aborting." >&2
  exit 1
fi

echo "==> Verifying login"
$VC whoami

echo "==> Linking project ($PROJECT)"
$VC link --yes --project "$PROJECT" >/dev/null

# Push one env var to production. Silent about the value; loud about the name.
put() {
  local key="$1" val="$2"
  if [ -z "$val" ]; then
    echo "    skip  $key (empty)"
    return
  fi
  $VC env rm "$key" production --yes >/dev/null 2>&1 || true
  printf '%s' "$val" | $VC env add "$key" production >/dev/null 2>&1
  echo "    set   $key"
}

echo "==> Pushing production environment"
set -a
# shellcheck disable=SC1091
. ./.env.local
set +a

for k in ANTHROPIC_API_KEY ANTHROPIC_MODEL \
         NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
         NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY \
         STRIPE_SECRET_KEY NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
         STRIPE_PRICE_ID STRIPE_PRICE_ID_QUARTERLY STRIPE_WEBHOOK_SECRET \
         NEXT_PUBLIC_MIXPANEL_TOKEN NEXT_PUBLIC_MIXPANEL_REPLAY_PCT \
         NEXT_PUBLIC_META_PIXEL_ID \
         RESEND_API_KEY EMAIL_FROM; do
  put "$k" "${!k:-}"
done

put NEXT_PUBLIC_APP_URL "https://${DOMAIN}"
put STRIPE_TRIAL_DAYS "0"

echo "==> Building and deploying to production"
$VC deploy --prod --yes

echo "==> Attaching ${DOMAIN}"
$VC domains add "$DOMAIN" "$PROJECT" || \
  echo "    (already attached, or the domain lives in another scope — check the dashboard)"
$VC alias set "$($VC ls "$PROJECT" --prod -1 2>/dev/null | tail -1)" "$DOMAIN" 2>/dev/null || true

echo
echo "Done. Post-deploy checks:"
echo "  1. https://${DOMAIN} loads the Axon Careers landing page"
echo "  2. Stripe webhook endpoint URL is https://${DOMAIN}/api/stripe-webhook"
echo "  3. Supabase Auth > URL Configuration: site URL = https://${DOMAIN}"
echo "  4. Stripe keys are TEST right now. Swap to live keys + a live \$19.99/3mo"
echo "     price before you expect real revenue."
