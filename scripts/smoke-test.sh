#!/usr/bin/env bash
set -euo pipefail

BASE=${BASE:-http://localhost:3000}
ADMIN_SECRET=${ADMIN_SECRET:-dev_admin_code}
SLUG=${SLUG:-smoke-post}

echo "== Health via frontend proxy =="
curl -sS "$BASE/api/health" || true

echo "== Create blog (quick-publish) =="
curl -sS -H 'Content-Type: application/json' \
  -d "{\"slug\":\"$SLUG\",\"title\":\"Smoke Test\",\"content\":\"From smoke-test\"}" \
  "$BASE/api/blogs/quick-publish" || true

sleep 1

echo "== List blogs =="
curl -sS "$BASE/api/blogs/" || true

sleep 1

echo "== Add a comment =="
curl -sS -H 'Content-Type: application/json' \
  -d '{"authorName":"Smoke","body":"It works!"}' \
  "$BASE/api/comments/$SLUG/add" || true

sleep 1

echo "== Verify pending comments =="
curl -sS "$BASE/api/comments/pending?secret=$ADMIN_SECRET" || true

sleep 1

echo "== Approve the comment =="
echo "(approve step requires captured comment id; skipping in no-jq mode)"

sleep 1

echo "== Fetch approved comments =="
curl -sS "$BASE/api/comments/$SLUG" || true

echo "== DONE =="

# Artifacts smoke: list and fetch details
echo "== Artifacts: list newest =="
curl -sS "$BASE/api/artifacts?sort=newest&limit=2" || true

echo "== Artifacts: fetch first (manual check) =="
curl -sS "$BASE/api/artifacts?sort=newest&limit=1" || true