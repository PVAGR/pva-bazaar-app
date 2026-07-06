# OpenClaw AI Agent - Enhanced Professional Version

**Status:** 🚀 Production-Ready with Multi-Model LLM Support + GitHub Integration + Telegram Control

## Overview

Your personal AI programmer that:

- **Edits Code** on GitHub (with your approval)
- **Writes & Reviews** code using powerful models (Claude 3 > GPT-4 > Ollama)
- **Remembers Everything** with persistent MongoDB conversations
- **Accepts Commands** via Telegram from your phone
- **Asks Permission** before making changes
- **Powers Down** with comprehensive safety guardrails

## Architecture

```
User (Phone/Telegram)
    ↓
Telegram Bot Webhook
    ↓
[Backend Routes]
    ├─ /api/telegram/* - Remote control
    ├─ /api/agent/chat - Conversations
    ├─ /api/agent/code-* - Code analysis & generation
    ├─ /api/agent/github/* - GitHub integration
    ├─ /api/agent/pending-changes - Approval workflow
    └─ /api/agent/providers - LLM status
    ↓
[Multi-Model LLM Router]
   Claude 3 Opus (Best-in-class)
   ↓ GPT-4 Turbo (If no Claude)
   ↓ Ollama local (Fallback)
    ↓
[GitHub API]
   Read files / Create PRs / Update code
    ↓
[MongoDB]
   Persistent:
   - Conversations
   - Code changes awaiting approval
   - Analysis history
```

## Setup Instructions

### 1. Environment Variables

Add to `backend/.env`:

```bash
# GitHub (REQUIRED for code editing)
GITHUB_TOKEN=ghp_xxx...  # Personal access token from GitHub
GITHUB_OWNER=PVAGR       # Your GitHub username/org
GITHUB_REPO=pva-bazaar-app

# OpenAI (Optional premium)
OPENAI_API_KEY=sk-xxx...

# Anthropic (Optional premium - RECOMMENDED)
ANTHROPIC_API_KEY=sk-ant-xxx...

# Ollama (Local fallback - always available)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b

# Telegram (Already configured)
TELEGRAM_BOT_TOKEN=8673642768:AAFHIy1m2fJg_SdZIhLdjViemuND1oUJPPU
TELEGRAM_CHAT_ID=<your-chat-id>  # Where agent sends notifications

# Agent Identity
AGENT_NAME=PVA Guardian
CREATOR_ID=creator@pvabazaar.org
```

### 2. GitHub Token Setup

1. Go to: https://github.com/settings/tokens/new
2. Create "Personal access token (classic)"
3. Select scopes:
   - `repo` - Full control of private repositories
   - `workflow` - Update GitHub Actions workflows
4. Copy token to `GITHUB_TOKEN` in `.env`

### 3. Get Your Telegram Chat ID

Message the bot, then run:

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates" | jq '.result[0].message.chat.id'
```

Add this to `TELEGRAM_CHAT_ID` in `.env`

### 4. Register Telegram Webhook

```bash
POST http://localhost:5001/api/telegram/set-webhook
{
  "webhookUrl": "https://api.pvabazaar.org/api/telegram/webhook"
}
```

Or via terminal:

```bash
curl -X POST http://localhost:5001/api/telegram/set-webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://api.pvabazaar.org/api/telegram/webhook"}'
```

## API Endpoints

### Agent Chat (Existing)

- `POST /api/agent/chat` - Send message, get response
- `GET /api/agent/status` - System status
- `GET /api/agent/conversations` - List your conversations

### NEW: Code Analysis

```bash
POST /api/agent/code-analysis
{
  "userId": "user@example.com",
  "code": "function myCode() { ... }",
  "filePath": "Frontend/src/utils/helpers.js",
  "context": "This is a utility function for..."
}
```

**Response:**

```json
{
  "ok": true,
  "analysis": "Detailed code review with suggestions...",
  "model": "claude-3-opus-20240229",
  "provider": "anthropic"
}
```

### NEW: Code Generation

```bash
POST /api/agent/code-generate
{
  "userId": "user@example.com",
  "requirements": "Create a React component that displays user profile",
  "language": "javascript",
  "style": "ES6, hooks, functional components"
}
```

### NEW: GitHub Integration

```bash
POST /api/agent/github/propose-change
{
  "userId": "user@example.com",
  "filePath": "backend/utils/helpers.js",
  "newContent": "...new code...",
  "description": "Optimize database query",
  "priority": "high"
}
```

**Response:**

```json
{
  "ok": true,
  "changeId": "change-123...",
  "status": "pending",
  "reasoning": "This optimization reduces query time by 40%..."
}
```

### NEW: Pending Changes

```bash
# List pending changes
GET /api/agent/pending-changes?status=pending

# Approve a change
POST /api/agent/pending-changes/{changeId}/approve
{ "userId": "...", "notes": "Looks good" }

# Reject a change
POST /api/agent/pending-changes/{changeId}/reject
{ "userId": "...", "reason": "Needs review" }
```

### NEW: LLM Providers Status

```bash
GET /api/agent/providers
```

**Response:**

```json
{
  "ok": true,
  "providers": {
    "anthropic": {
      "available": true,
      "configured": true,
      "models": ["claude-3-opus-20240229", ...]
    },
    "openai": {
      "available": false,
      "configured": false,
      "models": ["gpt-4-turbo-preview", ...]
    },
    "ollama": {
      "available": true,
      "baseUrl": "http://localhost:11434",
      "models": ["llama3.2:1b", "qwen3.5:latest"]
    }
  }
}
```

## Telegram Commands

**From your phone:**

```
/start        - Show welcome message
/help         - List available commands
/status       - Check agent status
/pending      - Show pending code changes

[Type anything else for AI assistance]
```

**Approval Workflow:**

1. Agent proposes code change
2. Telegram message: "📝 Change proposed: ..."
3. Inline buttons: [✅ Approve] [❌ Reject]
4. Click to approve/reject
5. Agent stores approval + executes if approved

## Model Selection Strategy

The agent automatically selects the **best available model** for each task:

### For Coding Tasks:

1. **Claude 3 Opus** - Best reasoning + coding ability
2. **GPT-4 Turbo** - Excellent reasoning
3. **Ollama best local** - Fallback

### For General Questions:

1. Whatever is fastest/available
2. Falls back gracefully if offline

### Priority Ranking:

```
Claude 3 Opus (100)      ← Best reasoning, coding, analysis
  ↓
Claude 3 Sonnet (95)     ← Fast reasoning
  ↓
GPT-4 Turbo (90)         ← Strong all-around
  ↓
GPT-4 (85)               ← Still excellent
  ↓
Ollama local (50)        ← Always available fallback
```

## Approval Workflow

**All code changes require your approval:**

```
1. Agent analyzes task
   ↓
2. Generates code change
   ↓
3. Creates PendingChange in MongoDB
   ↓
4. Sends Telegram notification with:
   - What changed
   - Why it's beneficial
   - File path
   - Approval buttons
   ↓
5. You tap ✅ or ❌
   ↓
6. If approved:
   - Execute on GitHub
   - Create PR or commit
   - Update conversation
   - Mark as executed
```

## Safety Guardrails

✅ **Implemented:**

- All code changes require explicit user approval
- Changes tracked in MongoDB with full audit trail
- File content validation before submission
- GitHub API rate limiting
- Telegram message validation
- Error handling with fallbacks
- No automatic file deletion

🔒 **Coming Soon:**

- Code sandboxing (static analysis before commit)
- Dangerous pattern detection
- Approval reason logging
- Change rollback mechanism
- PR review automation

## Example Workflows

### Scenario 1: Code Review

```
User → /help
Bot  → Shows available commands

User → Can you review my utils file?
Bot  → [Fetches file from GitHub]
       [Analyzes with Claude]
       → Sends detailed review via Telegram
       → Stores in conversation history
```

### Scenario 2: Code Generation & Submission

```
User → /help
      → Generate a React component for user profile

Agent → Creates code
       → Proposes change to backend/components/UserProfile.jsx
       → Sends Telegram: "✅ Approve | ❌ Reject"

User → ✅ (taps Approve)

Agent → Creates branch
       → Commits code
       → Creates PR
       → Sends confirmation via Telegram
```

### Scenario 3: Bug Fix

```
User → "Fix the auth module to handle expired tokens"

Agent → Analyzes current auth code
       → Identifies issue
       → Generates fix
       → Proposes change with reasoning:
         "Current code doesn't refresh tokens on expiry,
          causing user logouts. This fix adds automatic
          token refresh cycle."
       → Telegram notification

User → ✅ Approve

Agent → Commits fix
       → All changes stored with full history
```

## Troubleshooting

### "No LLM providers available"

- Make sure Ollama is running: `curl http://localhost:11434/api/tags`
- Or add OpenAI/Anthropic API keys

### Telegram not sending messages

- Check `TELEGRAM_BOT_TOKEN` is valid
- Make sure webhook is registered: `GET /api/telegram/webhook-info`
- Verify `TELEGRAM_CHAT_ID` is set

### GitHub changes not working

- Verify `GITHUB_TOKEN` has `repo` scope
- Check token isn't expired
- Make sure `GITHUB_OWNER` and `GITHUB_REPO` are correct

### Slow responses

- If using local Ollama with large models, it's normal
- Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for faster responses
- Claude 3 Opus is fastest for code

## Performance Notes

**Model Response Times (Approximate):**

- Claude 3 Opus (via API): 2-5s
- GPT-4 Turbo (via API): 3-8s
- Ollama llama3.2:1b (local): 10-30s
- Ollama qwen3.5 (local): 30-60s

**Recommendation:** Use Claude + Ollama fallback for best UX

## Files Changed

```
✅ backend/services/llmProvider.js      - Multi-model LLM router
✅ backend/services/gitHubService.js    - GitHub API integration
✅ backend/models/PendingChange.js      - Approval workflow storage
✅ backend/routes/agent.js              - Enhanced agent endpoints
✅ backend/routes/telegram.js           - Telegram bot webhook
✅ backend/api/index.js                 - Integrated routing
✅ backend/.env                         - Environment configuration
```

## Next Steps

1. **Set GitHub token** - Add `GITHUB_TOKEN` to `.env`
2. **Get Telegram chat ID** - Message the bot and get ID
3. **Test endpoints:**
   - `GET /api/agent/status` - Verify LLM providers
   - `GET /api/telegram/webhook-info` - Verify Telegram
   - `POST /api/agent/chat` - Send test message
4. **Try code analysis:** `POST /api/agent/code-analysis`
5. **Test GitHub:** `POST /api/agent/github/propose-change`
6. **Control via Telegram:** Message @YourBotName `/help`

## Monitoring

Check agent health:

```bash
curl http://localhost:5001/api/agent/status
curl http://localhost:5001/api/agent/providers
curl http://localhost:5001/api/telegram/webhook-info
```

## Cost Considerations

**Free (Always):**

- Ollama (local)
- GitHub API (5000 req/hour)

**Paid (Optional):**

- OpenAI GPT-4: ~$0.04/1K tokens
- Anthropic Claude: ~$0.003/1K tokens
- Start small, scale as needed

## Questions?

The agent can help! Try:

```
What can you do?
How do I submit a code change?
Help me understand the approval workflow
```

Encoded by: OpenClaw AI Agent 🤖
Generated: 2026-04-13
