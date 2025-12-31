#!/usr/bin/env bash

# PVA Bazaar — Vercel Environment Setup Helper
# This script prepares and adds required env vars to the Vercel backend project.
# It requires you to be logged in (`vercel login`) and the backend project to be linked.

set -euo pipefail

ROOT_DIR="/workspaces/pva-bazaar-app"
BACKEND_DIR="$ROOT_DIR/backend"

say() { echo -e "$1"; }

say "\n🔧 Vercel Env Setup — Backend Project\n===================================="

# Check Vercel CLI
if ! command -v vercel >/dev/null 2>&1; then
  say "📦 Installing Vercel CLI..."
  npm install -g vercel
fi

# Check login
if ! vercel whoami >/dev/null 2>&1; then
  say "❌ Not logged in. Please run: vercel login"
  exit 1
fi

cd "$BACKEND_DIR"

# Attempt project link (non-interactive where possible)
PROJECT_NAME="pvabazaar-backend"
if ! vercel link --project "$PROJECT_NAME" --yes >/dev/null 2>&1; then
  say "ℹ️ Ensure backend project is linked to Vercel (run 'vercel link'). Continuing."
fi

# Collect or generate values
MONGODB_URI=${MONGODB_URI:-}
JWT_SECRET=${JWT_SECRET:-}
ADMIN_SECRET_CODE=${ADMIN_SECRET_CODE:-}

if [[ -z "$MONGODB_URI" ]]; then
  say "\n🗄️  MONGODB_URI is required (Atlas connection string)."
  read -r -p "Paste MONGODB_URI: " MONGODB_URI
fi

if [[ -z "$JWT_SECRET" ]]; then
  say "\n🔐 Generating JWT_SECRET (32 bytes hex)."
  JWT_SECRET=$(openssl rand -hex 32)
fi

if [[ -z "$ADMIN_SECRET_CODE" ]]; then
  say "\n🛡️  Generating ADMIN_SECRET_CODE (32 bytes hex)."
  ADMIN_SECRET_CODE=$(openssl rand -hex 32)
fi

ALLOWED_ORIGIN_DEFAULT="https://www.pvabazaar.org"
ALLOWED_ORIGIN=${ALLOWED_ORIGIN:-$ALLOWED_ORIGIN_DEFAULT}

say "\n📥 Adding envs to Vercel (production)"
# Use stdin to provide values, specify environment explicitly
printf "%s" "$MONGODB_URI"        | vercel env add MONGODB_URI production
printf "%s" "$JWT_SECRET"          | vercel env add JWT_SECRET production
printf "%s" "$ADMIN_SECRET_CODE"   | vercel env add ADMIN_SECRET_CODE production
printf "%s" "production"           | vercel env add NODE_ENV production
printf "%s" "false"                | vercel env add ENABLE_QUICK_PUBLISH production
printf "%s" "$ALLOWED_ORIGIN"      | vercel env add ALLOWED_ORIGIN production

say "\n✅ Env variables added for backend project: $PROJECT_NAME"
say "- MONGODB_URI: (hidden)"
say "- JWT_SECRET: (hidden)"
say "- ADMIN_SECRET_CODE: (hidden)"
say "- NODE_ENV: production"
say "- ENABLE_QUICK_PUBLISH: false"
say "- ALLOWED_ORIGIN: $ALLOWED_ORIGIN"

say "\n🚀 Next: Run deployment script"
say "bash $ROOT_DIR/deploy-to-production.sh"
