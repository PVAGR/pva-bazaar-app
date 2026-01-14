#!/bin/bash
# Quick Action Script - Disable Vercel Deployment Protection
# This is the CRITICAL BLOCKER preventing production from working

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🔓 CRITICAL: Disable Vercel Deployment Protection        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Your backend is deployed but BLOCKED by authentication."
echo "This prevents the frontend from making API calls."
echo ""
echo "🎯 REQUIRED ACTION:"
echo ""
echo "1. Open this URL in your browser:"
echo "   👉 https://vercel.com/pvagrs-projects/backend/settings/deployment-protection"
echo ""
echo "2. Change 'Deployment Protection' setting:"
echo "   FROM: 'All Deployments' (current)"
echo "   TO:   'Only Preview Deployments' or 'Off'"
echo ""
echo "3. Click 'Save'"
echo ""
echo "4. Test the fix:"
echo "   curl https://backend-pvagrs-projects.vercel.app/api/health"
echo ""
echo "   Should return JSON like:"
echo '   {"ok": true, "message": "PVABazaar API is running", ...}'
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏳ Opening Vercel settings in your browser..."
echo ""

# Try to open in browser
if command -v xdg-open &> /dev/null; then
    xdg-open "https://vercel.com/pvagrs-projects/backend/settings/deployment-protection"
elif command -v open &> /dev/null; then
    open "https://vercel.com/pvagrs-projects/backend/settings/deployment-protection"
else
    echo "❌ Could not auto-open browser. Please manually open:"
    echo "   https://vercel.com/pvagrs-projects/backend/settings/deployment-protection"
fi

echo ""
echo "📋 After disabling protection, check this document:"
echo "   📄 PRODUCTION_READINESS_REPORT.md"
echo ""
echo "   It contains:"
echo "   • Complete validation checklist"
echo "   • Environment variable setup"
echo "   • CORS verification steps"
echo "   • End-to-end testing guide"
echo ""
echo "🚀 Once protection is disabled, your app should work!"
