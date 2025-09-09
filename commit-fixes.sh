#!/bin/bash

# Script to commit all the fixes we've made

echo "📝 Committing all fixes to the PVA Bazaar App..."

# Stage all changes
git add -A

# Commit with a descriptive message
git commit -m "Fix: Application stabilization

- Fixed case-sensitivity issues in User model imports
- Configured environment setup with proper .env
- Updated backend to use in-memory MongoDB for dev
- Connected frontend to backend APIs
- Created dev scripts for easier testing
- Updated documentation with setup instructions
- Added port configuration to avoid conflicts"

echo "✅ All fixes have been committed!"
echo "You can now push these changes with: git push origin main"
