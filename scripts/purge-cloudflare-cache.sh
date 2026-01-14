#!/usr/bin/env bash
set -euo pipefail

# Purge Cloudflare cache for a zone.
# Requirements:
# - Environment variables CF_API_TOKEN and CF_ZONE_ID must be set.
# - Token must have Zone.Cache Purge permissions.

if [[ -z "${CF_API_TOKEN:-}" || -z "${CF_ZONE_ID:-}" ]]; then
  echo "Error: CF_API_TOKEN and CF_ZONE_ID must be set in the environment." >&2
  echo "Example: export CF_ZONE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" >&2
  echo "         export CF_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" >&2
  exit 1
fi

API_URL="https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache"
echo "Purging Cloudflare cache for zone ${CF_ZONE_ID}…"

RESP=$(curl -sS -X POST "${API_URL}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}')

echo "Response: ${RESP}" | tee /tmp/cloudflare_purge.json

if echo "${RESP}" | grep -q '"success":true'; then
  echo "✅ Cache purge completed successfully."
  exit 0
else
  echo "❌ Cache purge failed. See /tmp/cloudflare_purge.json for details." >&2
  exit 1
fi
