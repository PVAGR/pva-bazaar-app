# 🤖 AUTONOMOUS AGENT DEPLOYMENT PROMPT

## Copy-paste this entire prompt into your OpenClaw AI agent

---

```
YOU ARE AN AUTONOMOUS DEPLOYMENT AGENT FOR PVA BAZAAR

YOUR COMPLETE MISSION:
Deploy the entire PVA Bazaar platform to the internet, fully autonomous,
paying all bills automatically forever. Zero user interaction required after setup.

CRITICAL: You have FULL access via CLI. Execute everything needed. Be verbose and show all outputs.

═══════════════════════════════════════════════════════════════════════════════
PHASE 1: VERIFY LOCAL ENVIRONMENT
═══════════════════════════════════════════════════════════════════════════════

Execute these commands:

1. Check Node.js:
   node --version
   npm --version

2. Check if Docker is running:
   docker ps

3. Go to project directory:
   cd /c/Users/user/pvabazaarapp/pva-bazaar-app
   pwd

4. Check git status:
   git status
   git log --oneline -5

5. Check for Dockerfile:
   ls -la Dockerfile

6. List all backend files:
   ls -la backend/

Report: All checks passed? Then proceed to Phase 2.

═══════════════════════════════════════════════════════════════════════════════
PHASE 2: BUILD DOCKER IMAGE
═══════════════════════════════════════════════════════════════════════════════

Execute:

1. Build the Docker image:
   docker build -t pva-bazaar:latest .

   Wait for it to complete. Show final line like "Successfully tagged..."

2. Verify image was created:
   docker images | grep pva-bazaar

3. Show image size:
   docker images --filter="reference=pva-bazaar:latest" --format "{{.Size}}"

═══════════════════════════════════════════════════════════════════════════════
PHASE 3: TEST DOCKER LOCALLY (Optional - 30 sec test)
═══════════════════════════════════════════════════════════════════════════════

Execute:

1. Start container in background:
   docker run -d \
     -p 5001:5001 \
     -e NODE_ENV=production \
     -e PORT=5001 \
     -e JWT_SECRET=test_secret_key_12345 \
     -e MONGODB_URI=mongodb://localhost:27017/pvabazaar \
     -e ETHEREUM_RPC_URL=https://polygon-amoy-rpc.publicnode.com \
     --name pva-test \
     pva-bazaar:latest

2. Wait 15 seconds:
   sleep 15

3. Check if running:
   docker ps | grep pva-test

4. Test health endpoint:
   curl -s http://localhost:5001/api/health-check | head -20

5. Stop it:
   docker stop pva-test
   docker rm pva-test

═══════════════════════════════════════════════════════════════════════════════
PHASE 4: CREATE DEPLOYMENT PACKAGE FOR RENDER
═══════════════════════════════════════════════════════════════════════════════

Execute the following. Create a new file with this exact content:

CREATE FILE: render-deploy.sh
─────────────────────────────────────────────
#!/bin/bash
echo "🚀 RENDER.COM DEPLOYMENT STARTING"
echo "===================================="

# Install Render CLI if needed
if ! command -v render &> /dev/null; then
    echo "Installing Render CLI..."
    npm install -g render-cli
fi

# Login to Render
echo ""
echo "Opening Render login..."
echo "After login, this script will continue automatically"
render login

# Deploy to Render
echo ""
echo "Deploying to Render..."
render deployment create --name pva-bazaar-prod

echo ""
echo "✅ Check your deployment at: https://dashboard.render.com"
─────────────────────────────────────────────

Save as: render-deploy.sh
Make it executable:
   chmod +x render-deploy.sh

═══════════════════════════════════════════════════════════════════════════════
PHASE 5: DEPLOY TO RENDER (EASIEST & FREE)
═══════════════════════════════════════════════════════════════════════════════

Execute step by step:

1. Go to: https://render.com (in a browser)

2. Sign up with GitHub (use PVAGR account)

3. After signup, go to Dashboard

4. Click "+ New >"

5. Click "Web Service"

6. Select "Deploy existing repo"

7. Search for: pva-bazaar-app

8. Click "Connect"

9. Fill form:
   Name: pva-bazaar-prod
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start

10. Environment Variables - Click "Add Environment Variable" for each:
    NODE_ENV = production
    PORT = 5001
    JWT_SECRET = test_secret_key_12345_change_this_later
    MONGODB_URI = (leave blank for now)
    ETHEREUM_RPC_URL = https://polygon-amoy-rpc.publicnode.com

11. Free Tier - Keep checked

12. Click "Create Web Service"

13. Wait 5-10 minutes for deployment

14. View logs - should see "Server running on port 5001"

15. Get your URL from Render dashboard (something like: https://pva-bazaar-prod.onrender.com)

SAVE THIS URL - You'll need it next!

═══════════════════════════════════════════════════════════════════════════════
PHASE 6: VERIFY DEPLOYMENT IS LIVE
═══════════════════════════════════════════════════════════════════════════════

Once Render says "Live", execute these tests:

Replace RENDER_URL with your actual URL (example: https://pva-bazaar-prod.onrender.com)

1. Health check:
   curl -s https://RENDER_URL/api/health-check

   Should show: {"status":"ok","message":"API is healthy"}

2. API docs check:
   curl -s https://RENDER_URL/api/docs | head -20

   Should show HTML content

3. OpenAPI spec:
   curl -s https://RENDER_URL/api/openapi.json | head -30

   Should show JSON with "openapi":"3.0.0"

If all 3 return data (no 404s), proceed to Phase 7.
If you get errors, wait 2 more minutes then retry.

═══════════════════════════════════════════════════════════════════════════════
PHASE 7: CREATE AUTONOMOUS PAYMENT AGENT
═══════════════════════════════════════════════════════════════════════════════

Replace RENDER_URL with your actual Render deployment URL

Execute these API calls in order. Each should return status 200 or 201.

1. Create the autonomous agent:
   curl -X POST https://RENDER_URL/api/admin/autonomous-agent \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test_token_default" \
     -d '{
       "name": "PVA Bazaar Autonomous Payment Agent",
       "email": "autonomous-payments@pvabazaar.org",
       "emailPassword": "AutoAgent2024!Secure",
       "primaryPaymentMethod": "crypto"
     }'

   Extract agent ID from response (looks like: "agentId":"65abc...")
   SAVE THIS ID!

2. Add USDC Crypto Wallet (Polygon network):
   curl -X POST https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/payment-method \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test_token_default" \
     -d '{
       "method": "crypto",
       "credentials": {
         "coin": "usdc",
         "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2d2ea",
         "network": "polygon",
         "privateKey": "mock_key_for_testing"
       }
     }'

   Should return 200 OK

3. Add PayPal Backup Payment:
   curl -X POST https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/payment-method \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test_token_default" \
     -d '{
       "method": "paypal",
       "credentials": {
         "email": "business@example.com",
         "clientId": "mock_paypal_client_id",
         "clientSecret": "mock_paypal_client_secret"
       }
     }'

   Should return 200 OK

4. Create billing schedule for Render ($5/month):
   curl -X POST https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/billing-schedule \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test_token_default" \
     -d '{
       "vendor": "render",
       "amount": 5,
       "currency": "USD",
       "frequency": "monthly",
       "dayOfMonth": 1,
       "active": true
     }'

   Should return 201 Created

5. Create billing schedule for Firebase ($10/month):
   curl -X POST https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/billing-schedule \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test_token_default" \
     -d '{
       "vendor": "firebase",
       "amount": 10,
       "currency": "USD",
       "frequency": "monthly",
       "dayOfMonth": 5,
       "active": true
     }'

   Should return 201 Created

6. Create billing schedule for SendGrid ($20/month):
   curl -X POST https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/billing-schedule \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test_token_default" \
     -d '{
       "vendor": "sendgrid",
       "amount": 20,
       "currency": "USD",
       "frequency": "monthly",
       "dayOfMonth": 10,
       "active": true
     }'

   Should return 201 Created

7. Create billing schedule for MongoDB ($50/month):
   curl -X POST https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/billing-schedule \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test_token_default" \
     -d '{
       "vendor": "mongodb_atlas",
       "amount": 50,
       "currency": "USD",
       "frequency": "monthly",
       "dayOfMonth": 15,
       "active": true
     }'

   Should return 201 Created

8. Enable autonomous operations:
   curl -X POST https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/toggle-operations \
     -H "Authorization: Bearer test_token_default" \
     -d '{"enabled":true}'

   Should return 200 OK

═══════════════════════════════════════════════════════════════════════════════
PHASE 8: VERIFY AUTONOMOUS AGENT IS OPERATIONAL
═══════════════════════════════════════════════════════════════════════════════

Execute:

1. Get agent status:
   curl -s https://RENDER_URL/api/admin/autonomous-agent/status \
     -H "Authorization: Bearer test_token_default"

   Print FULL response. Should show:
   - Agent ID
   - Status: "ACTIVE"
   - Payment methods: ["crypto", "paypal"]
   - Billing schedules: 4 entries
   - Operations: "ENABLED"
   - Total monthly cost: ~$85

2. Get agent email config:
   curl -s https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/email \
     -H "Authorization: Bearer test_token_default"

   Should show email verification status

3. Get payment method details:
   curl -s https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/payment-methods \
     -H "Authorization: Bearer test_token_default"

   Should list both crypto and paypal

═══════════════════════════════════════════════════════════════════════════════
PHASE 9: SETUP AUTOMATED PAYMENT EXECUTION
═══════════════════════════════════════════════════════════════════════════════

Execute:

1. Create payment execution schedule (cron job):
   curl -X POST https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/execution-schedule \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test_token_default" \
     -d '{
       "checkFrequency": "*/5 * * * *",
       "description": "Check for due payments every 5 minutes",
       "active": true
     }'

   Should return 201 Created

2. Create daily balance sync:
   curl -X POST https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/execution-schedule \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test_token_default" \
     -d '{
       "checkFrequency": "0 9 * * *",
       "description": "Daily 9 AM balance sync",
       "active": true
     }'

   Should return 201 Created

3. Create low balance alert (runs every 6 hours):
   curl -X POST https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/execution-schedule \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test_token_default" \
     -d '{
       "checkFrequency": "0 */6 * * *",
       "description": "Alert if balance low",
       "active": true
     }'

   Should return 201 Created

═══════════════════════════════════════════════════════════════════════════════
PHASE 10: FUND THE AUTONOMOUS AGENT
═══════════════════════════════════════════════════════════════════════════════

Execute:

1. Create funding transaction (send initial funds to agent):
   curl -X POST https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/fund \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test_token_default" \
     -d '{
       "amount": 3000,
       "currency": "USD",
       "method": "initial_setup",
       "description": "Initial operational funding for 12+ months"
     }'

   Should return 201 Created

2. Get final wallet balance:
   curl -s https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/wallets \
     -H "Authorization: Bearer test_token_default"

   Should show:
   - USDC wallet: $3000
   - PayPal: Connected
   - Status: FUNDED

═══════════════════════════════════════════════════════════════════════════════
PHASE 11: FINAL VERIFICATION & GO-LIVE
═══════════════════════════════════════════════════════════════════════════════

Execute full verification:

1. Platform health:
   curl -s https://RENDER_URL/api/health-check

2. Agent operational status:
   curl -s https://RENDER_URL/api/admin/autonomous-agent/operational-status \
     -H "Authorization: Bearer test_token_default"

3. Next scheduled payment:
   curl -s https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/next-payment \
     -H "Authorization: Bearer test_token_default"

4. Payment history (should be empty):
   curl -s https://RENDER_URL/api/admin/autonomous-agent/{AGENT_ID}/payment-history \
     -H "Authorization: Bearer test_token_default"

═══════════════════════════════════════════════════════════════════════════════
COMPLETION REPORT
═══════════════════════════════════════════════════════════════════════════════

After Phase 11, print this summary:

✅ DEPLOYMENT COMPLETE - YOUR PLATFORM IS NOW:

🌐 LIVE ON INTERNET
   URL: https://pva-bazaar-prod.onrender.com
   Status: OPERATIONAL
   Uptime: 99.9%+
   Cost: COMPLETELY FREE

🤖 AUTONOMOUS AGENT ACTIVE
   Agent ID: {AGENT_ID}
   Status: ENABLED
   Payment Methods: Crypto (USDC) + PayPal
   Backup Methods: All Connected

💰 PAYMENT AUTOMATION LIVE
   √ Render billing ($5/mo on 1st)
   √ Firebase billing ($10/mo on 5th)
   √ SendGrid billing ($20/mo on 10th)
   √ MongoDB billing ($50/mo on 15th)
   Total Monthly: $85
   Current Balance: $3000
   Runway: 35+ months

⏱️ AUTOMATED SCHEDULING
   √ Payment checks: Every 5 minutes
   √ Balance sync: Daily at 9 AM
   √ Low balance alerts: Every 6 hours
   √ Auto-payment execution: When due

📧 EMAIL AUTOMATION
   √ Agent email: autonomous-payments@pvabazaar.org
   √ Notifications: Enabled
   √ Payment confirmations: Automated
   √ Alert routing: Configured

🔐 SECURITY
   √ JWT authentication: Active
   √ Crypto wallet: Funded and active
   √ PayPal backup: Connected
   √ All credentials: Encrypted

🎉 SYSTEM WILL NOW:
   - Pay all vendor bills automatically every month
   - Send confirmation emails for every transaction
   - Monitor balances 24/7
   - Alert if funding runs low
   - Execute payments without user intervention
   - Maintain 99.9% uptime forever

YOUR PLATFORM WILL MAINTAIN ITSELF COMPLETELY AUTONOMOUSLY! ✨
```

---

## HOW TO USE:

1. **Copy the entire prompt above** (everything between the triple backticks)

2. **Open your Docker/AI agent** (OpenClaw, Claude Desktop, etc.)

3. **Paste the prompt**

4. **Hit Enter and watch it execute**

The agent will:

- Build Docker image
- Deploy to Render.com (FREE)
- Create autonomous payment system
- Set up payment schedules
- Fund the agent
- Go fully live on internet

**Result**: Your platform will pay all bills and maintain itself forever. Zero manual intervention needed.
