const express = require('express');
const axios = require('axios');
const dbConnect = require('../lib/dbConnect');
const ConversationThread = require('../models/ConversationThread');
const OpenClawMemory = require('../models/OpenClawMemory');
const PendingChange = require('../models/PendingChange');
const User = require('../models/User');

// Services
const llmProvider = require('../services/llmProvider');
const githubService = require('../services/gitHubService');

const router = express.Router();

// Configuration
const OLLAMA_BASE_URL = String(process.env.OLLAMA_BASE_URL || '').trim().replace(/\/$/, '');
// When empty, llmProvider falls back to cloud LLMs (Claude, GPT-4, Pollinations)
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
 * Generate AI response using multi-model LLM provider
 * Uses the best available model: Claude > GPT-4 > Ollama
 */
async function generateAIResponse(messages, temperature = 0.35, maxTokens = 2000, taskType = 'general') {
  try {
    const response = await llmProvider.generateResponse(messages, {
      taskType,
      temperature,
      maxTokens,
    });

    if (response.success) {
      return {
        success: true,
        content: response.content,
        metadata: {
          model: response.model,
          provider: response.provider,
          temperature,
          timestamp: new Date(),
        },
      };
    }

    return {
      success: false,
      error: response.error,
      provider: response.provider,
    };
  } catch (err) {
    console.error('❌ AI Response Generation Error:', err);
    return {
      success: false,
      error: `Failed to generate response: ${err.message}`,
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

/**
 * POST /api/agent/code-analysis - AI analyzes code
 */
router.post('/code-analysis', async (req, res) => {
  try {
    const { userId, code, filePath, context } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ ok: false, error: 'userId and code required' });
    }

    await dbConnect();

    // Build analysis prompt
    const prompt = `You are a senior software engineer reviewing this code:

File: ${filePath || 'unknown'}
Context: ${context || 'No additional context provided'}

Code:
\`\`\`
${code}
\`\`\`

Provide a thorough analysis covering:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Security concerns
5. Suggestions for improvement

Be specific and actionable in your feedback.`;

    const messages = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const aiResponse = await generateAIResponse(messages, 0.3, 3000, 'coding');

    if (!aiResponse.success) {
      return res.status(503).json({
        ok: false,
        error: aiResponse.error,
      });
    }

    // Store analysis in conversation history
    const threadData = {
      creatorId: CREATOR_ID,
      participantId: userId,
      title: `Code Analysis: ${filePath || 'Untitled'}`,
      tags: ['code-analysis', 'ai-review'],
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: prompt,
          timestamp: new Date(),
        },
        {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: aiResponse.content,
          timestamp: new Date(),
          metadata: {
            model: aiResponse.metadata.model,
            provider: aiResponse.metadata.provider,
          },
        },
      ],
    };

    const thread = new ConversationThread(threadData);
    await thread.save();

    res.json({
      ok: true,
      analysis: aiResponse.content,
      model: aiResponse.metadata.model,
      provider: aiResponse.metadata.provider,
      threadId: thread._id,
    });
  } catch (err) {
    console.error('❌ Code Analysis Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/agent/code-generate - Generate code for requirements
 */
router.post('/code-generate', async (req, res) => {
  try {
    const { userId, requirements, language = 'javascript', style } = req.body;

    if (!userId || !requirements) {
      return res.status(400).json({ ok: false, error: 'userId and requirements required' });
    }

    await dbConnect();

    const prompt = `You are an expert ${language} software engineer.

Generate production-ready ${language} code for the following requirements:

${requirements}

${style ? `Code style/conventions: ${style}` : ''}

Requirements:
- Include inline comments explaining complex logic
- Add error handling
- Follow best practices
- Include necessary imports/dependencies
- Make it maintainable and testable

Provide the complete, runnable code.`;

    const messages = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const aiResponse = await generateAIResponse(messages, 0.2, 4000, 'coding');

    if (!aiResponse.success) {
      return res.status(503).json({
        ok: false,
        error: aiResponse.error,
      });
    }

    // Save to conversation
    const threadData = {
      creatorId: CREATOR_ID,
      participantId: userId,
      title: `Code Generation: ${requirements.substring(0, 50)}...`,
      tags: ['code-generation', 'ai-generated'],
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: requirements,
          timestamp: new Date(),
        },
        {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: aiResponse.content,
          timestamp: new Date(),
          metadata: {
            model: aiResponse.metadata.model,
            provider: aiResponse.metadata.provider,
            language,
          },
        },
      ],
    };

    const thread = new ConversationThread(threadData);
    await thread.save();

    res.json({
      ok: true,
      code: aiResponse.content,
      model: aiResponse.metadata.model,
      provider: aiResponse.metadata.provider,
      threadId: thread._id,
    });
  } catch (err) {
    console.error('❌ Code Generation Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/agent/pending-changes - List pending changes awaiting approval
 */
router.get('/pending-changes', async (req, res) => {
  try {
    const { userId, status = 'pending' } = req.query;

    await dbConnect();

    const query = { status };
    if (userId) query['requestedBy.userId'] = userId;

    const changes = await PendingChange.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      ok: true,
      count: changes.length,
      changes: changes.map((c) => ({
        changeId: c.changeId,
        title: c.title,
        description: c.description,
        changeType: c.changeType,
        status: c.status,
        priority: c.priority,
        filePath: c.filePath,
        createdAt: c.createdAt,
        reasoning: c.reasoning,
      })),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/agent/pending-changes/:changeId/approve - Approve a pending change
 */
router.post('/pending-changes/:changeId/approve', async (req, res) => {
  try {
    const { changeId } = req.params;
    const { userId, notes } = req.body;

    if (!userId) {
      return res.status(400).json({ ok: false, error: 'userId required' });
    }

    await dbConnect();

    const change = await PendingChange.findOne({ changeId });
    if (!change) {
      return res.status(404).json({ ok: false, error: 'Change not found' });
    }

    // Update approval
    change.status = 'approved';
    change.approvedBy = {
      userId,
      timestamp: new Date(),
      notes,
    };

    await change.save();

    // TODO: Execute the change on GitHub
    res.json({
      ok: true,
      message: 'Change approved',
      changeId,
      status: 'approved',
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/agent/pending-changes/:changeId/reject - Reject a pending change
 */
router.post('/pending-changes/:changeId/reject', async (req, res) => {
  try {
    const { changeId } = req.params;
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ ok: false, error: 'userId required' });
    }

    await dbConnect();

    const change = await PendingChange.findOne({ changeId });
    if (!change) {
      return res.status(404).json({ ok: false, error: 'Change not found' });
    }

    change.status = 'rejected';
    change.rejectedBy = {
      userId,
      timestamp: new Date(),
      reason,
    };

    await change.save();

    res.json({
      ok: true,
      message: 'Change rejected',
      changeId,
      status: 'rejected',
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/agent/github/propose-change - Propose a code change (creates PendingChange)
 */
router.post('/github/propose-change', async (req, res) => {
  try {
    const { userId, filePath, newContent, description, priority = 'medium' } = req.body;

    if (!userId || !filePath || newContent === undefined) {
      return res.status(400).json({
        ok: false,
        error: 'userId, filePath, and newContent required',
      });
    }

    await dbConnect();

    // Get current content from GitHub
    const current = await githubService.getFileContent(filePath);
    const currentContent = current.success ? current.content : '';

    // Generate reasoning using AI
    const analysisMessages = [
      {
        role: 'user',
        content: `Explain why this code change is beneficial:

OLD:
\`\`\`
${currentContent || '(file does not exist)'}
\`\`\`

NEW:
\`\`\`
${newContent}
\`\`\`

Keep it brief (2-3 sentences).`,
      },
    ];

    const reasoning = await generateAIResponse(analysisMessages, 0.3, 500, 'coding');

    // Create pending change
    const change = new PendingChange({
      title: `Update ${filePath}`,
      description: description || 'Code change proposed by agent',
      changeType: current.success ? 'file-update' : 'file-create',
      filePath,
      currentContent,
      proposedContent: newContent,
      priority,
      requestedBy: {
        userId,
        channel: 'api',
      },
      reasoning: {
        reasoning: reasoning.success ? reasoning.content : 'No reasoning available',
        model: reasoning.metadata?.model,
        provider: reasoning.metadata?.provider,
        confidence: 0.8,
      },
    });

    await change.save();

    res.json({
      ok: true,
      changeId: change.changeId,
      status: 'pending',
      reasoning: change.reasoning.reasoning,
    });
  } catch (err) {
    console.error('❌ GitHub Propose Change Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/agent/providers - List available LLM providers
 */
router.get('/providers', async (req, res) => {
  try {
    const status = await llmProvider.getProviderStatus();

    res.json({
      ok: true,
      ...status,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
