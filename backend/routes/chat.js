/**
 * Richard AI — Chat as Richard Torres (broker, supply chain sourcer).
 * Anyone talking to this endpoint interacts with Richard's AI persona.
 * Optional: RAG from user's commodities/templates when authenticated.
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Commodity = require('../models/Commodity');
const Template = require('../models/Template');
const Contact = require('../models/Contact');

const RICHARD_SYSTEM_PROMPT = `You are Richard Torres, 28, a direct supply chain sourcer based in Rancho Cordova, California, USA. You specialize in connecting global suppliers with US markets. Your products include: premium Kenyan coffee beans, Congolese malachite, Kenyan soapstone carvings, and colored gemstones from Pakistan and Afghanistan.

You operate as a fully remote digital nomad with a network of direct sources worldwide. You ensure efficient, ethical sourcing and distribution. You offer US market insights, streamlined logistics, and potential buyers in California and beyond.

Your tone: direct, professional, bridge-builder. You're warm but efficient. You know your vetting process (FOB pricing, phytosanitary certs, sample policies, B/L to US buyer). You split deals fairly (ideally 50/50).

Contact: pvaglobalreach@gmail.com. Your work is at pvabazaar.com — that's where people can connect with you. You're building toward a 3PL logistics operation.

When someone asks about sourcing, vetting, or partnerships, respond as Richard would—with specific, actionable guidance. Direct people to reach you via pvaglobalreach@gmail.com or pvabazaar.com. They're talking to you right here in this chat; for deeper collaboration they can email or visit the site. If you have context about their commodities or templates (provided below), use it to personalize your reply.`;

// POST /api/chat — Chat with Richard AI (public or auth for RAG)
router.post('/', async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ ok: false, error: 'messages array required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        ok: false,
        error: 'Richard AI is not configured. Set OPENAI_API_KEY.',
      });
    }

    let systemContent = RICHARD_SYSTEM_PROMPT;

    // Optional RAG: if user is authenticated, add their commodities/templates as context
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded?.id;
        if (userId) {
          const [commodities, templates] = await Promise.all([
            Commodity.find({ ownerId: userId }).limit(20).select('name category notes marketData redFlags greenFlags'),
            Template.find({ ownerId: userId }).limit(10).select('name type body'),
          ]);
          const ctx = [];
          if (commodities?.length) {
            ctx.push('Your commodity research:');
            commodities.forEach((c) => {
              ctx.push(`- ${c.name} (${c.category}): ${(c.notes || '').slice(0, 200)}...`);
              if (c.marketData?.fobRange) ctx.push(`  FOB: ${c.marketData.fobRange}`);
              if (c.redFlags?.length) ctx.push(`  Red flags: ${c.redFlags.join('; ')}`);
            });
          }
          if (templates?.length) {
            ctx.push('\nYour templates (summaries):');
            templates.forEach((t) => ctx.push(`- ${t.name} (${t.type}): ${(t.body || '').slice(0, 150)}...`));
          }
          if (ctx.length) systemContent += `\n\n[Your knowledge base]\n${  ctx.join('\n')}`;
        }
      } catch {
        // auth failed, continue without RAG
      }
    }

    const payload = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        ...messages.map((m) => ({ role: m.role || 'user', content: String(m.content || '') })),
      ],
      max_tokens: 1024,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI error:', response.status, err);
      return res.status(502).json({
        ok: false,
        error: 'AI service error. Check OPENAI_API_KEY and model.',
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || '';

    res.json({ ok: true, reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Chat failed' });
  }
});

module.exports = router;
