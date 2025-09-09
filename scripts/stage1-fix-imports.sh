 #!/bin/bash

# Stage 1: Fix case-sensitivity imports
echo "🔄 Stage 1: Fixing case-sensitivity imports..."

# Make sure all imports use the consistent lowercase 'user.js'
# Backend imports
grep -l "require.*models.*User" /workspaces/pva-bazaar-app/backend/**/*.js | while read file; do
  sed -i 's/require(['"'"'"]\.\.\/models\/User['"'"'"]\)/require(\1\.\.\/models\/user\1)/g' "$file"
  echo "✅ Fixed import in $file"
done

# Root directory imports 
grep -l "require.*models.*User" /workspaces/pva-bazaar-app/*.js /workspaces/pva-bazaar-app/routes/*.js | while read file; do
  sed -i 's/require(['"'"'"]\.\.\/.*\/models\/User['"'"'"]\)/require(\1\.\.\/backend\/models\/user\1)/g' "$file"
  echo "✅ Fixed import in $file"
done

echo "✅ Stage 1 complete!"
echo "👉 You can commit these changes with:"
echo "git add -A && git commit -m 'Fix: Case-sensitivity in User model imports'"
