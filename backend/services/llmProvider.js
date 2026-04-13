/**
 * Multi-Model LLM Provider System
 * Supports: Ollama, OpenAI, Anthropic, and other providers
 * Routes to the best available model for each task
 */

const axios = require('axios');

// Track which models are available
const availableModels = {
  ollama: [],
  openai: [],
  anthropic: [],
};

// Initialize providers based on env
const providers = {
  ollama: {
    enabled: Boolean(process.env.OLLAMA_BASE_URL),
    baseUrl: String(process.env.OLLAMA_BASE_URL || '').trim().replace(/\/$/, '') || 'http://localhost:11434',
    timeout: Math.min(
      Math.max(parseInt(process.env.OLLAMA_TIMEOUT_MS || '60000', 10), 5000),
      120000,
    ),
  },
  openai: {
    enabled: Boolean(process.env.OPENAI_API_KEY),
    apiKey: process.env.OPENAI_API_KEY,
    models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
  },
  anthropic: {
    enabled: Boolean(process.env.ANTHROPIC_API_KEY),
    apiKey: process.env.ANTHROPIC_API_KEY,
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  },
};

console.log('🧠 LLM Providers Initialized:');
console.log(`  - Ollama: ${providers.ollama.enabled ? '✅' : '🔴'}`);
console.log(`  - OpenAI: ${providers.openai.enabled ? '✅' : '🔴'}`);
console.log(`  - Anthropic: ${providers.anthropic.enabled ? '✅' : '🔴'}`);

/**
 * Get the best available model for a task
 * Priority: Claude 3 Opus > GPT-4 Turbo > Ollama (best available)
 */
async function selectBestModel(taskType = 'general') {
  // Priority order for best model
  const modelPriority = [
    { provider: 'anthropic', model: 'claude-3-opus-20240229', score: 100 }, // Reasoning, coding, general
    { provider: 'anthropic', model: 'claude-3-sonnet-20240229', score: 95 }, // Fast reasoning
    { provider: 'openai', model: 'gpt-4-turbo-preview', score: 90 }, // Reasoning
    { provider: 'openai', model: 'gpt-4', score: 85 },
    { provider: 'ollama', model: null, score: 50 }, // Fallback to first available
  ];

  // For coding tasks, prefer Claude or GPT-4
  if (taskType === 'coding' || taskType === 'github') {
    return modelPriority[0]; // Claude 3 Opus
  }

  // Try each in priority order
  for (const candidate of modelPriority) {
    if (candidate.provider === 'anthropic' && providers.anthropic.enabled) {
      return candidate;
    }
    if (candidate.provider === 'openai' && providers.openai.enabled) {
      return candidate;
    }
    if (candidate.provider === 'ollama' && providers.ollama.enabled) {
      // Get the best Ollama model available
      const bestOllama = await getBestOllamaModel();
      if (bestOllama) {
        return { provider: 'ollama', model: bestOllama, score: 50 };
      }
    }
  }

  throw new Error('No LLM providers available');
}

/**
 * Get the best available Ollama model
 */
async function getBestOllamaModel() {
  try {
    const response = await axios.get(`${providers.ollama.baseUrl}/api/tags`, {
      timeout: 5000,
    });

    if (response.data.models && response.data.models.length > 0) {
      // Prefer larger models for better quality
      const modelPreference = ['llama2', 'mistral', 'neural-chat', 'llama2-uncensored'];
      
      for (const pref of modelPreference) {
        const found = response.data.models.find((m) => m.name.includes(pref));
        if (found) return found.name;
      }

      // Return first available
      return response.data.models[0].name;
    }
  } catch (err) {
    console.log('⚠️ Ollama not available');
  }
  return null;
}

/**
 * Generate response using the best available model
 */
async function generateResponse(messages, options = {}) {
  const {
    taskType = 'general',
    temperature = 0.35,
    maxTokens = 2000,
  } = options;

  try {
    const modelChoice = await selectBestModel(taskType);
    
    console.log(`📤 Using ${modelChoice.provider}/${modelChoice.model} for ${taskType}`);

    if (modelChoice.provider === 'anthropic') {
      return await generateWithAnthropic(messages, modelChoice.model, temperature, maxTokens);
    }

    if (modelChoice.provider === 'openai') {
      return await generateWithOpenAI(messages, modelChoice.model, temperature, maxTokens);
    }

    if (modelChoice.provider === 'ollama') {
      return await generateWithOllama(messages, modelChoice.model, temperature, maxTokens);
    }
  } catch (err) {
    console.error('❌ LLM generation failed:', err.message);
    return {
      success: false,
      error: `Failed to generate response: ${err.message}`,
      provider: null,
    };
  }
}

/**
 * Generate with Claude (Anthropic)
 */
async function generateWithAnthropic(messages, model, temperature, maxTokens) {
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: messages.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
      },
      {
        headers: {
          'x-api-key': providers.anthropic.apiKey,
          'anthropic-version': '2023-06-01',
        },
        timeout: 120000,
      }
    );

    if (response.data.content && response.data.content[0]) {
      return {
        success: true,
        content: response.data.content[0].text,
        provider: 'anthropic',
        model,
        metadata: {
          temperature,
          maxTokens,
          timestamp: new Date(),
        },
      };
    }

    return {
      success: false,
      error: 'No content in Anthropic response',
      provider: 'anthropic',
    };
  } catch (err) {
    return {
      success: false,
      error: `Anthropic error: ${err.message}`,
      provider: 'anthropic',
    };
  }
}

/**
 * Generate with GPT (OpenAI)
 */
async function generateWithOpenAI(messages, model, temperature, maxTokens) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        temperature,
        max_tokens: maxTokens,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      },
      {
        headers: {
          'Authorization': `Bearer ${providers.openai.apiKey}`,
        },
        timeout: 120000,
      }
    );

    if (response.data.choices && response.data.choices[0]) {
      return {
        success: true,
        content: response.data.choices[0].message.content,
        provider: 'openai',
        model,
        metadata: {
          temperature,
          maxTokens,
          timestamp: new Date(),
        },
      };
    }

    return {
      success: false,
      error: 'No choices in OpenAI response',
      provider: 'openai',
    };
  } catch (err) {
    return {
      success: false,
      error: `OpenAI error: ${err.message}`,
      provider: 'openai',
    };
  }
}

/**
 * Generate with Ollama (local models)
 */
async function generateWithOllama(messages, model, temperature, maxTokens) {
  try {
    const response = await axios.post(
      `${providers.ollama.baseUrl}/api/chat`,
      {
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      },
      {
        timeout: providers.ollama.timeout,
        validateStatus: () => true,
      }
    );

    if (response.status === 200 && response.data.message) {
      return {
        success: true,
        content: response.data.message.content,
        provider: 'ollama',
        model,
        metadata: {
          temperature,
          maxTokens,
          timestamp: new Date(),
        },
      };
    }

    return {
      success: false,
      error: `Ollama returned ${response.status}: ${response.data.error || 'Unknown error'}`,
      provider: 'ollama',
    };
  } catch (err) {
    return {
      success: false,
      error: `Ollama error: ${err.message}`,
      provider: 'ollama',
    };
  }
}

/**
 * Get status of all available LLM providers
 */
async function getProviderStatus() {
  const status = {
    timestamp: new Date().toISOString(),
    providers: {},
  };

  // Check Ollama
  if (providers.ollama.enabled) {
    try {
      const response = await axios.get(`${providers.ollama.baseUrl}/api/tags`, {
        timeout: 5000,
      });
      status.providers.ollama = {
        available: true,
        baseUrl: providers.ollama.baseUrl,
        models: response.data.models ? response.data.models.map((m) => m.name) : [],
      };
    } catch (err) {
      status.providers.ollama = {
        available: false,
        error: err.message,
      };
    }
  }

  // Check OpenAI (just check if key is set)
  status.providers.openai = {
    available: providers.openai.enabled,
    configured: Boolean(providers.openai.apiKey),
    models: providers.openai.models,
  };

  // Check Anthropic (just check if key is set)
  status.providers.anthropic = {
    available: providers.anthropic.enabled,
    configured: Boolean(providers.anthropic.apiKey),
    models: providers.anthropic.models,
  };

  return status;
}

module.exports = {
  generateResponse,
  selectBestModel,
  getProviderStatus,
  getBestOllamaModel,
  providers,
};
