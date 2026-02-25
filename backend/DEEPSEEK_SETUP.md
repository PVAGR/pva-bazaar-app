# DeepSeek AI Setup

Chat (Richard AI) and Oracle Assessment use DeepSeek when `DEEPSEEK_API_KEY` is set.

## Local development

1. Create or edit `backend/.env.local` (gitignored).
2. Add:
   ```
   DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
   ```
3. Restart the backend server.

## Production (Vercel)

1. Open your Vercel project → Settings → Environment Variables.
2. Add `DEEPSEEK_API_KEY` with your API key.
3. Redeploy.

## Priority

- If `DEEPSEEK_API_KEY` is set → uses DeepSeek (cost-effective).
- Else if `OPENAI_API_KEY` is set → uses OpenAI.
- If neither is set → Chat returns 503, Oracle falls back to mock data.

## Optional

- `DEEPSEEK_MODEL` — default: `deepseek-chat` (use `deepseek-reasoner` for complex reasoning).
