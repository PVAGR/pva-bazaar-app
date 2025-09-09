#!/bin/bash

# Stage 5: Final integration test
echo "🔄 Stage 5: Final integration test..."

# Make scripts executable
chmod +x /workspaces/pva-bazaar-app/run-app.sh

# Run the full application
echo "Starting full application with run-app.sh..."
/workspaces/pva-bazaar-app/run-app.sh

echo "✅ Stage 5 complete!"
echo "👉 Final commit:"
echo "git add -A && git commit -m 'Fix: Full application integration working'"
