#!/bin/bash

# Stage 2: Ensure environment setup
echo "🔄 Stage 2: Setting up environment variables..."

# Check if .env file exists in backend, create if needed
if [ ! -f /workspaces/pva-bazaar-app/backend/.env ]; then
  echo "Creating backend/.env file..."
  cat > /workspaces/pva-bazaar-app/backend/.env << EOF
PORT=5000
NODE_ENV=development
# Intentionally omit MONGODB_URI in dev to enable memory DB
USE_MEMORY_DB=true
JWT_SECRET=dev-super-secret
ETHEREUM_RPC_URL=https://mainnet.base.org
ADMIN_WALLET_PUBLIC=0x463ace850a958e768618361e352fe9efe31d5d0e
ALLOWED_ORIGIN=http://localhost:3000
DEV_AUTO_SEED=true
ADMIN_SECRET_CODE=letmein
EOF
  echo "✅ Created backend/.env file"
else
  echo "✅ backend/.env already exists"
fi

# Make sure root env file is clean
echo "Cleaning root env file..."
echo "" > /workspaces/pva-bazaar-app/pva-bazaar-app.env
echo "✅ Cleaned root env file"

echo "✅ Stage 2 complete!"
echo "👉 You can commit these changes with:"
echo "git add -A && git commit -m 'Fix: Environment configuration setup'"
