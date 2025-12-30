#!/bin/bash

# Stage 2: Ensure environment setup
echo "🔄 Stage 2: Setting up environment variables..."

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  fi
}

# Check if .env file exists in backend, create if needed (non-destructive)
ENV_PATH="/workspaces/pva-bazaar-app/backend/.env"
if [ ! -f "$ENV_PATH" ]; then
  echo "Creating backend/.env file..."
  JWT_SECRET_GEN=$(generate_secret)
  ADMIN_SECRET_GEN=$(generate_secret)
  cat > "$ENV_PATH" << EOF
PORT=5000
NODE_ENV=development
# Intentionally omit MONGODB_URI in dev to enable memory DB
USE_MEMORY_DB=true
JWT_SECRET=$JWT_SECRET_GEN
ETHEREUM_RPC_URL=https://mainnet.base.org
ADMIN_WALLET_PUBLIC=0x463ace850a958e768618361e352fe9efe31d5d0e
ALLOWED_ORIGIN=http://localhost:3000
DEV_AUTO_SEED=true
ADMIN_SECRET_CODE=$ADMIN_SECRET_GEN
EOF
  echo "✅ Created backend/.env file"
  echo "🔐 Generated JWT_SECRET and ADMIN_SECRET_CODE for development."
else
  echo "✅ backend/.env already exists (not modified)"
fi

echo "ℹ️ No changes to root pva-bazaar-app.env (kept ignored and untouched)"

echo "✅ Stage 2 complete!"
echo "👉 You can commit these changes with:"
echo "git add -A && git commit -m 'Fix: Environment configuration setup'"
