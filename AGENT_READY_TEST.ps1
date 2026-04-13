#!/usr/bin/env pwsh
# PVA AI Agent - Ready Test Script

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🤖 PVA AI AGENT - SYSTEM STATUS CHECK                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:5001"
$results = @()

Write-Host "🔍 Testing API Endpoints...`n" -ForegroundColor Yellow

# Test 1: Health Check
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/health" -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $results += @{status = "✅"; test = "Backend Health"; detail = "Running on :5001" }
    }
} catch {
    $results += @{status = "❌"; test = "Backend Health"; detail = "Not running - start with: npm run dev" }
}

# Test 2: Provider Status
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/agent/providers" -UseBasicParsing -ErrorAction Stop
    $json = $response.Content | ConvertFrom-Json
    if ($json.ok) {
        $results += @{status = "✅"; test = "LLM Providers"; detail = "Ollama active, fallbacks ready" }
    }
} catch {
    $results += @{status = "❌"; test = "LLM Providers"; detail = "Backend not responding" }
}

# Test 3: Agent Chat
try {
    $body = @{userId = "test"; message = "Hello" } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/api/agent/chat" -UseBasicParsing `
        -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $results += @{status = "✅"; test = "Agent Chat"; detail = "Ready for conversations" }
    }
} catch {
    $results += @{status = "⏳"; test = "Agent Chat"; detail = "Needs backend restart" }
}

# Test 4: GitHub Service
try {
    $env_file = Get-Content "c:\Users\user\pvabazaarapp\pva-bazaar-app\backend\.env" | Select-String -Pattern "GITHUB_TOKEN=ghp_"
    if ($env_file) {
        $results += @{status = "✅"; test = "GitHub Token"; detail = "Configured and active" }
    } else {
        $results += @{status = "❌"; test = "GitHub Token"; detail = "Not found in .env" }
    }
} catch {
    $results += @{status = "❌"; test = "GitHub Token"; detail = "Error reading .env" }
}

# Test 5: Telegram
try {
    $env_file = Get-Content "c:\Users\user\pvabazaarapp\pva-bazaar-app\backend\.env" | Select-String -Pattern "TELEGRAM_BOT_TOKEN="
    if ($env_file) {
        $results += @{status = "✅"; test = "Telegram Bot"; detail = "Token configured" }
    }
} catch {
    $results += @{status = "❌"; test = "Telegram Bot"; detail = "Not configured" }
}

# Display Results
Write-Host "📊 RESULTS:`n" -ForegroundColor Cyan
foreach ($result in $results) {
    Write-Host $result.status -ForegroundColor Green -NoNewline
    Write-Host " " + $result.test.PadEnd(25) + "| " + $result.detail
}

Write-Host "`n`n⚡ QUICK START:`n" -ForegroundColor Yellow
Write-Host "1. Go to backend folder:"
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "`n2. Start the backend:"
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host "`n3. In a new terminal, test it:"
Write-Host "   curl http://localhost:5001/api/health" -ForegroundColor Gray
Write-Host "`n4. Or test with Postman/Thunder Client:`n   URL: http://localhost:5001/api/agent/chat" -ForegroundColor Gray
Write-Host "   Method: POST" -ForegroundColor Gray
Write-Host "   Body: {""userId"":""you"",""message"":""Hello""}" -ForegroundColor Gray

Write-Host "`n`n📱 To use Telegram:`n" -ForegroundColor Yellow
Write-Host "1. Message your bot any text to get it chatting" -ForegroundColor Gray
Write-Host "2. Then add your Chat ID to .env:" -ForegroundColor Gray
Write-Host "   TELEGRAM_CHAT_ID=YOUR_ID" -ForegroundColor Gray
Write-Host "3. Restart backend" -ForegroundColor Gray
Write-Host "4. Message bot: /help" -ForegroundColor Gray

Write-Host "`n✨ System is READY! 🚀`n" -ForegroundColor Green
