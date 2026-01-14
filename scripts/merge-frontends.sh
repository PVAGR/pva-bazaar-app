#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="/workspaces/pva-bazaar-app"
FRONTEND_DIR="$ROOT_DIR/Frontend"
LEGACY_DIR="$ROOT_DIR/frontend"
TARGET_DIR="$FRONTEND_DIR/public/legacy"

echo "🔁 Merging legacy 'frontend' assets into 'Frontend/public/legacy'"

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "❌ 'Frontend' directory not found"
  exit 1
fi

mkdir -p "$TARGET_DIR"

if [ -d "$LEGACY_DIR" ]; then
  rsync -av --delete \
    --exclude 'index.html' \
    --exclude 'vercel.json' \
    "$LEGACY_DIR/" "$TARGET_DIR/"
  echo "✅ Copied legacy assets to $TARGET_DIR"
else
  echo "ℹ️ No 'frontend' directory found; nothing to merge"
fi

if [ -f "$ROOT_DIR/frontend/status.html" ]; then
  mkdir -p "$FRONTEND_DIR/public"
  cp -f "$ROOT_DIR/frontend/status.html" "$FRONTEND_DIR/public/status.html"
  echo "✅ Published status.html at /public/status.html"
fi

echo "🎯 Merge complete"
