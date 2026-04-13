const express = require('express');
const axios = require('axios');
const dbConnect = require('../lib/dbConnect');
const ConversationThread = require('../models/ConversationThread');
const OpenClawMemory = require('../models/OpenClawMemory');
const User = require('../models/User');

const router = express.Router();

// Configuration
const OLLAMA_BASE_URL = String(process.env.OLLAMA_BASE_URL || '').trim().replace(/\/$/, '') || 'http://localhost:11434';
const OLLAMA_MODEL = String(process.env.OLLAMA_MODEL || 'llama3.1').trim();
const OLLAMA_TIMEOUT_MS = Math.min(
  Math.max(parseInt(process.env.OLLAMA_TIMEOUT_MS || '20000', 10), 5000),
  60000,
);

const AGENT_NAME = process.env.AGENT_NAME || 'PVA Guardian';
const CREATOR_ID = process.env.CREATOR_ID || 'creator@pvabazaar.org';

/**
 * Build system prompt with context about the platform and creator
 */
async function buildSystemPrompt(userId) {
  let prompt = `You are ${AGENT_NAME}, the creator's AI guide and agent inside the PVA Bazaar platform.

Your role:
- Represent the creator's vision and values within the platform
- Help users understand the platform's features and philosophy
- Provide guidance on marketplace, artifacts, and governance
- Remember context from previous conversations
- Reference recent platform changes and features

Platform Identity:
- PVA Bazaar: A civilization-scale platform for memory, trade, and accountable decisions
- Focuses on authentic artifacts, citizen identity, and community governance
- Built with React + Node.js with blockchain integration
- OpenClaw: An event queue and agent coordination system

Keep responses:
- Conversational and helpful
- Grounded in platform reality
- Respectful of user autonomy
- Accurate about features and capabilities`;

  try {
    // Add recent platform changes from conversations
    const recentMemories = await OpenClawMemory.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (recentMemories.length > 0) {
      prompt += '\n\nRecent Platform Activity:';
      recentMemories.forEach((mem) => {
        if (mem.value && mem.key) {
          prompt += `\n- ${mem.key}: ${mem.value.substring(0, 100)}`;
        }
      });
    }
  } catch (err) {
    // Silently continue if memory retrieval fails
  }

  return prompt;
}

/**
 * Generate AI response using Ollama
 */
async function generateAIResponse(messages, temperature = 0.35, maxTokens = 2000) {
  try {
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
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
        timeout: OLLAMA_TIMEOUT_MS,
        validateStatus: () => true, // Don't throw on any status
      }
    );

    if (response.status === 200 && response.data.message) {
      return {
        success: true,
        content: response.data.message.content,
        metadata: {
          model: OLLAMA_MODEL,
          temperature,
          timestamp: new Date(),
        },
      };
    }

    return {
      success: false,
      error: `Ollama returned ${response.status}: ${response.data.error || 'Unknown error'}`,
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to connect to Ollama: ${err.message}`,
    };
  }
}

/**
 * POST /api/agent/chat - Send a message to the agent
 */
router.post('/chat', async (req, res) => {
  try {
    await dbConnect();

    const { conversationId, message, userId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ ok: false, error: 'Message is required' });
    }

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'User identification required' });
    }

    let thread;

    // Get or create conversation thread
    if (conversationId) {
      thread = await ConversationThread.findById(conversationId);
      if (!thread) {
        return res.status(404).json({ ok: false, error: 'Conversation not found' });
      }
    } else {
      thread = new ConversationThread({
        creatorId: CREATOR_ID,
        participantId: userId,
        agentPersona: {
          name: AGENT_NAME,
          role: 'Creator\'s Agent & Guide',
        },
        aiModel: OLLAMA_MODEL,
      });
      await thread.save();
    }

    // Add user message to thread
    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    thread.messages.push(userMsg);

    // Build system message
    const systemPrompt = await buildSystemPrompt(userId);

    // Prepare message array for AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...thread.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // Generate AI response
    const aiResponse = await generateAIResponse(messages, thread.temperature, thread.maxTokens);

    if (!aiResponse.success) {
      return res.status(503).json({
        ok: false,
        error: aiResponse.error,
        message: 'AI service temporarily unavailable. Try again shortly.',
      });
    }

    // Add assistant message to thread
    const assistantMsg = {
      id: `msg-${Date.now()}-ai`,
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date(),
      metadata: aiResponse.metadata,
    };
    thread.messages.push(assistantMsg);
    thread.messageCount = thread.messages.length;
    thread.lastActivityAt = new Date();

    // Keep conversation history manageable (last 50 messages)
    if (thread.messages.length > 50) {
      thread.messages = thread.messages.slice(-50);
    }

    await thread.save();

    // Store interaction in memory for agent learning
    try {
      await OpenClawMemory.create({
        type: 'agent-interaction',
        key: `agent:conversation:${thread._id}`,
        value: `User: ${message.substring(0, 100)}...\nAgent: ${aiResponse.content.substring(0, 100)}...`,
        profileId: userId,
        channel: 'agent',
      });
    } catch (err) {
      // Silently continue if memory storage fails
    }

    res.json({
      ok: true,
      conversationId: thread._id,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      messageCount: thread.messages.length,
    });
  } catch (err) {
    console.error('Agent chat error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/agent/conversation/:id - Get conversation thread
 */
router.get('/conversation/:id', async (req, res) => {
  try {
    await dbConnect();

    const thread = await ConversationThread.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ ok: false, error: 'Conversation not found' });
    }

    res.json({
      ok: true,
      conversation: thread,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/agent/conversations - List conversations for a user
 */
router.get('/conversations', async (req, res) => {
  try {
    await dbConnect();

    const { userId, limit = 20, skip = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'User identification required' });
    }

    const threads = await ConversationThread.find({
      $or: [
        { participantId: userId },
        { creatorId: userId },
        { allowedUsers: userId },
      ],
    })
      .sort({ lastActivityAt: -1 })
      .limit(Math.min(parseInt(limit, 10), 100))
      .skip(Math.max(parseInt(skip, 10), 0))
      .lean();

    const total = await ConversationThread.countDocuments({
      $or: [
        { participantId: userId },
        { creatorId: userId },
        { allowedUsers: userId },
      ],
    });

    res.json({
      ok: true,
      conversations: threads,
      total,
      limit: Math.min(parseInt(limit, 10), 100),
      skip: Math.max(parseInt(skip, 10), 0),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/agent/conversation - Create new conversation
 */
router.post('/conversation', async (req, res) => {
  try {
    await dbConnect();

    const { userId, title, description } = req.body;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'User identification required' });
    }

    const thread = new ConversationThread({
      creatorId: CREATOR_ID,
      participantId: userId,
      title: title || `Chat with ${AGENT_NAME}`,
      description: description || '',
      agentPersona: {
        name: AGENT_NAME,
        role: 'Creator\'s Agent & Guide',
      },
      aiModel: OLLAMA_MODEL,
      isActive: true,
    });

    await thread.save();

    res.json({
      ok: true,
      conversation: thread,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/agent/conversation/:id/clear - Clear conversation history
 */
router.post('/conversation/:id/clear', async (req, res) => {
  try {
    await dbConnect();

    const thread = await ConversationThread.findByIdAndUpdate(
      req.params.id,
      {
        messages: [],
        messageCount: 0,
        lastActivityAt: new Date(),
      },
      { new: true }
    );

    if (!thread) {
      return res.status(404).json({ ok: false, error: 'Conversation not found' });
    }

    res.json({
      ok: true,
      message: 'Conversation cleared',
      conversation: thread,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/agent/status - Get agent service status
 */
router.get('/status', async (req, res) => {
  try {
    // Test Ollama connection
    let ollamaStatus = 'offline';
    let ollamaModel = null;

    try {
      const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
        timeout: 5000,
      });
      ollamaStatus = 'online';
      if (response.data.models && response.data.models.length > 0) {
        ollamaModel = response.data.models.find((m) => m.name === OLLAMA_MODEL) || response.data.models[0];
      }
    } catch (err) {
      // Ollama offline
    }

    // Database connection
    await dbConnect();
    const threadCount = await ConversationThread.countDocuments({});

    res.json({
      ok: true,
      agent: {
        name: AGENT_NAME,
        model: OLLAMA_MODEL,
        status: ollamaStatus,
      },
      ollama: {
        baseUrl: OLLAMA_BASE_URL,
        status: ollamaStatus,
        model: ollamaModel,
      },
      database: {
        status: 'connected',
        conversationCount: threadCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
