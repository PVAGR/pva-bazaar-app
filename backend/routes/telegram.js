/**
 * Telegram Bot Integration for OpenClaw Agent
 * Allows remote access to agent via Telegram commands
 */

const express = require('express');
const axios = require('axios');
const dbConnect = require('../lib/dbConnect');
const ConversationThread = require('../models/ConversationThread');
const PendingChange = require('../models/PendingChange');

const router = express.Router();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Owner's chat ID
const AGENT_NAME = process.env.AGENT_NAME || 'PVA Guardian';

const telegramAPI = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

console.log(`📱 Telegram Bot Integration: ${TELEGRAM_BOT_TOKEN ? '✅' : '🔴'}`);

/**
 * Send message to Telegram
 */
async function sendTelegramMessage(chatId, message, options = {}) {
  try {
    await axios.post(`${telegramAPI}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'MarkdownV2',
      ...options,
    });
  } catch (err) {
    console.error('❌ Telegram send error:', err.message);
  }
}

/**
 * POST /api/telegram/webhook - Receive messages from Telegram
 */
router.post('/webhook', async (req, res) => {
  try {
    res.status(200).json({ ok: true });

    const { message, callback_query } = req.body;

    if (!message && !callback_query) {
      return;
    }

    const chatId = message?.chat?.id || callback_query?.from?.id;
    const userId = message?.from?.id;
    const text = message?.text || '';

    if (!chatId) return;

    await dbConnect();

    // Handle text commands
    if (message && text) {
      handleTextCommand(chatId, userId, text);
    }

    // Handle button callbacks
    if (callback_query) {
      handleCallback(chatId, userId, callback_query.data);
    }
  } catch (err) {
    console.error('❌ Telegram webhook error:', err);
  }
});

/**
 * Handle text commands from Telegram
 */
async function handleTextCommand(chatId, userId, text) {
  try {
    // Command routing
    if (text.startsWith('/start')) {
      await sendTelegramMessage(
        chatId,
        `Welcome to ${AGENT_NAME}! 👋\n\nI can help you with:\n• Code analysis\n• Code generation\n• GitHub integration\n• Viewing pending changes\n\nUse /help for available commands.`,
      );
    }

    if (text === '/help') {
      await sendTelegramMessage(
        chatId,
        `Available Commands:\n\n/pending \\- Show pending code changes\n/status \\- Agent status\n/providers \\- Show LLM providers\n/help \\- This message`,
      );
    }

    if (text === '/status') {
      await sendTelegramMessage(
        chatId,
        `✅ ${AGENT_NAME} is online\n\nReady to assist with your coding needs\\!`,
      );
    }

    if (text === '/pending') {
      await showPendingChanges(chatId, userId);
    }

    if (text === '/providers') {
      await showProviders(chatId);
    }

    // General message - route to agent
    if (!text.startsWith('/')) {
      await handleAgentMessage(chatId, userId, text);
    }
  } catch (err) {
    console.error('❌ Command handler error:', err);
    await sendTelegramMessage(chatId, `Error: ${err.message}`);
  }
}

/**
 * Handle callback queries (button clicks)
 */
async function handleCallback(chatId, userId, data) {
  try {
    const [action, changeId] = data.split(':');

    if (action === 'approve') {
      const change = await PendingChange.findOne({ changeId });
      if (change) {
        change.status = 'approved';
        change.approvedBy = {
          userId: String(userId),
          timestamp: new Date(),
          notes: 'Approved via Telegram',
        };
        await change.save();

        await sendTelegramMessage(chatId, `✅ Change approved\\: ${change.title}`);
      }
    }

    if (action === 'reject') {
      const change = await PendingChange.findOne({ changeId });
      if (change) {
        change.status = 'rejected';
        change.rejectedBy = {
          userId: String(userId),
          timestamp: new Date(),
          reason: 'Rejected via Telegram',
        };
        await change.save();

        await sendTelegramMessage(chatId, `❌ Change rejected\\: ${change.title}`);
      }
    }
  } catch (err) {
    console.error('❌ Callback handler error:', err);
  }
}

/**
 * Route message to agent and get response
 */
async function handleAgentMessage(chatId, userId, userMessage) {
  try {
    // Show typing indicator
    await axios.post(`${telegramAPI}/sendChatAction`, {
      chat_id: chatId,
      action: 'typing',
    });

    // Get or create conversation thread
    let thread = await ConversationThread.findOne({
      participantId: String(userId),
      'messages.0': { $exists: true }, // Has messages
    }).sort({ createdAt: -1 });

    const messages = thread
      ? thread.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }))
      : [];

    messages.push({
      role: 'user',
      content: userMessage,
    });

    // Format for AI
    const systemPrompt = `You are ${AGENT_NAME}, helping a user via Telegram. Keep responses concise (under 500 chars when possible). Be helpful and direct.`;

    const llmMessages = [{ role: 'system', content: systemPrompt }, ...messages];

    // Get response from agent
    const llmProvider = require('../services/llmProvider');
    const response = await llmProvider.generateResponse(llmMessages, {
      taskType: 'general',
      temperature: 0.35,
      maxTokens: 1000,
    });

    if (!response.success) {
      await sendTelegramMessage(chatId, `Error: ${response.error}`);
      return;
    }

    // Store conversation
    if (!thread) {
      thread = new ConversationThread({
        participantId: String(userId),
        title: 'Telegram Chat',
        tags: ['telegram'],
      });
    }

    thread.messages.push({
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      metadata: { source: 'telegram' },
    });

    thread.messages.push({
      id: `msg-${Date.now()}-ai`,
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      metadata: {
        model: response.model,
        provider: response.provider,
        source: 'telegram',
      },
    });

    // Limit to 50 messages
    if (thread.messages.length > 50) {
      thread.messages = thread.messages.slice(-50);
    }

    await thread.save();

    // Send response, split if too long
    const maxLength = 4096; // Telegram limit
    if (response.content.length > maxLength) {
      const chunks = response.content.match(/[\s\S]{1,4000}/g) || [];
      for (const chunk of chunks) {
        await sendTelegramMessage(chatId, chunk);
      }
    } else {
      await sendTelegramMessage(chatId, response.content);
    }
  } catch (err) {
    console.error('❌ Agent message handler error:', err);
    await sendTelegramMessage(chatId, `Error processing message: ${err.message}`);
  }
}

/**
 * Show pending changes with approval buttons
 */
async function showPendingChanges(chatId, userId) {
  try {
    const changes = await PendingChange.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(5);

    if (changes.length === 0) {
      await sendTelegramMessage(chatId, 'No pending changes');
      return;
    }

    for (const change of changes) {
      const message = `📝 *${change.title}*\n\n${change.description || ''}\n\n📍 ${change.filePath || 'Multiple files'}\n\n💡 _${change.reasoning?.reasoning || 'No reasoning'}_`;

      const buttons = {
        inline_keyboard: [
          [
            {
              text: '✅ Approve',
              callback_data: `approve:${change.changeId}`,
            },
            {
              text: '❌ Reject',
              callback_data: `reject:${change.changeId}`,
            },
          ],
        ],
      };

      await sendTelegramMessage(chatId, message, {
        reply_markup: buttons,
      });
    }
  } catch (err) {
    console.error('❌ Show pending error:', err);
  }
}

/**
 * Show available LLM providers
 */
async function showProviders(chatId) {
  try {
    const llmProvider = require('../services/llmProvider');
    const status = await llmProvider.getProviderStatus();

    let text = '🧠 *Available LLM Providers*:\n\n';

    if (status.providers.anthropic?.available) {
      text += '✅ Claude 3 \\(Anthropic\\)\n';
    }

    if (status.providers.openai?.available) {
      text += '✅ GPT\\-4 \\(OpenAI\\)\n';
    }

    if (status.providers.ollama?.available) {
      text += `✅ Ollama \\(${status.providers.ollama.models?.length || 0} models\\)\n`;
    }

    if (!status.providers.anthropic?.available && !status.providers.openai?.available) {
      text += '🔴 No premium LLMs configured\n';
    }

    await sendTelegramMessage(chatId, text);
  } catch (err) {
    console.error('❌ Show providers error:', err);
  }
}

/**
 * Set webhook URL - call this once to register
 */
router.post('/set-webhook', async (req, res) => {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(400).json({
        ok: false,
        error: 'TELEGRAM_BOT_TOKEN not configured',
      });
    }

    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({
        ok: false,
        error: 'webhookUrl required (e.g., https://pvabazaar.org/api/telegram/webhook)',
      });
    }

    const response = await axios.post(`${telegramAPI}/setWebhook`, {
      url: webhookUrl,
    });

    res.json({
      ok: true,
      message: 'Webhook set',
      result: response.data,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

/**
 * Get webhook info
 */
router.get('/webhook-info', async (req, res) => {
  try {
    const response = await axios.post(`${telegramAPI}/getWebhookInfo`);

    res.json({
      ok: true,
      webhook: response.data.result,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

module.exports = router;
