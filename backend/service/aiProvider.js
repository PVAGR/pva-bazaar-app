/**
 * AI Provider — Supports OpenAI and DeepSeek (OpenAI-compatible).
 * Prefers DEEPSEEK_API_KEY if set, else falls back to OPENAI_API_KEY.
 */
function getAIConfig() {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (deepseekKey) {
    return {
      apiKey: deepseekKey,
      apiUrl: 'https://api.deepseek.com/v1/chat/completions',
      defaultModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      provider: 'deepseek',
    };
  }
  if (openaiKey) {
    return {
      apiKey: openaiKey,
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      provider: 'openai',
    };
  }
  return null;
}

/**
 * Call chat completions API (works with both OpenAI and DeepSeek).
 * @param {Object} options
 * @param {Array} options.messages - Chat messages
 * @param {string} [options.model] - Override default model
 * @param {number} [options.maxTokens=1024]
 * @param {Object} [options.extra] - Extra payload fields (e.g. response_format)
 */
async function chatCompletions({ messages, model, maxTokens = 1024, extra = {} }) {
  const config = getAIConfig();
  if (!config) {
    throw new Error('No AI provider configured. Set DEEPSEEK_API_KEY or OPENAI_API_KEY.');
  }

  const payload = {
    model: model || config.defaultModel,
    messages,
    max_tokens: maxTokens,
    ...extra,
  };

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error (${response.status}): ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

module.exports = { getAIConfig, chatCompletions };
