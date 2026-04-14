const express = require('express');
const router = express.Router();
const AutonomousAgent = require('../models/AutonomousAgent');
const AutonomousAgentService = require('../services/autonomousAgentService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Initialize/Get autonomous agent
 */
router.post('/api/admin/autonomous-agent', requireAdmin, asyncHandler(async (req, res) => {
  const { name, email, emailPassword, primaryPaymentMethod } = req.body;

  let agent = await AutonomousAgent.findOne({});

  if (!agent) {
    agent = await AutonomousAgentService.initializeAgent({
      name,
      email,
      emailPassword,
      primaryPaymentMethod
    });
  }

  res.status(201).json({
    success: true,
    message: 'Autonomous agent initialized',
    agentId: agent._id,
    agent: await AutonomousAgentService.getAgentStatus(agent)
  });
}));

/**
 * Get agent status
 */
router.get('/api/admin/autonomous-agent/status', requireAdmin, asyncHandler(async (req, res) => {
  let agent = await AutonomousAgent.findOne({});

  if (!agent) {
    agent = await AutonomousAgentService.initializeAgent();
  }

  const status = await AutonomousAgentService.getAgentStatus(agent);

  res.json({
    success: true,
    status,
    walletInfo: {
      paypal: agent.paypal,
      crypto: agent.cryptoWallets,
      cashapp: agent.cashapp,
      card: { connected: agent.card?.connected },
      bank: { connected: agent.bankAccount?.connected }
    }
  });
}));

/**
 * Add payment method
 */
router.post('/api/admin/autonomous-agent/:agentId/payment-method', requireAdmin, asyncHandler(async (req, res) => {
  const agent = await AutonomousAgent.findById(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const { method, credentials } = req.body;

  await AutonomousAgentService.addPaymentMethod(agent, method, credentials);

  res.json({
    success: true,
    message: `${method} payment method added`,
    agent: await AutonomousAgentService.getAgentStatus(agent)
  });
}));

/**
 * Create billing schedule
 */
router.post('/api/admin/autonomous-agent/:agentId/billing-schedule', requireAdmin, asyncHandler(async (req, res) => {
  const agent = await AutonomousAgent.findById(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const { vendor, amount, frequency, dayOfMonth } = req.body;

  await AutonomousAgentService.createScheduledPayment(agent, {
    vendor,
    amount,
    frequency,
    dayOfMonth
  });

  res.status(201).json({
    success: true,
    message: `Billing schedule created for ${vendor}`,
    agent: await AutonomousAgentService.getAgentStatus(agent)
  });
}));

/**
 * Toggle operations
 */
router.post('/api/admin/autonomous-agent/:agentId/toggle-operations', requireAdmin, asyncHandler(async (req, res) => {
  const agent = await AutonomousAgent.findById(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const { enabled } = req.body;
  agent.operationsEnabled = enabled !== undefined ? enabled : !agent.operationsEnabled;
  await agent.save();

  res.json({
    success: true,
    message: `Operations ${agent.operationsEnabled ? 'enabled' : 'disabled'}`,
    operationsEnabled: agent.operationsEnabled
  });
}));

/**
 * Fund agent
 */
router.post('/api/admin/autonomous-agent/:agentId/fund', requireAdmin, asyncHandler(async (req, res) => {
  const agent = await AutonomousAgent.findById(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const { amount, method } = req.body;

  const result = await AutonomousAgentService.fundAgent(agent, amount, method);

  res.status(201).json({
    success: true,
    message: `Agent funded with $${amount}`,
    ...result
  });
}));

/**
 * Execute scheduled payments (manual trigger)
 */
router.post('/api/admin/autonomous-agent/:agentId/execute-payments', requireAdmin, asyncHandler(async (req, res) => {
  const agent = await AutonomousAgent.findById(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const results = await AutonomousAgentService.executeScheduledPayments(agent);

  res.json({
    success: true,
    message: 'Payment execution completed',
    results,
    agentStatus: await AutonomousAgentService.getAgentStatus(agent)
  });
}));

/**
 * Health check
 */
router.get('/api/admin/autonomous-agent/:agentId/health', requireAdmin, asyncHandler(async (req, res) => {
  const agent = await AutonomousAgent.findById(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const health = await AutonomousAgentService.performHealthCheck(agent);

  res.json({
    success: true,
    health,
    agentStatus: await AutonomousAgentService.getAgentStatus(agent)
  });
}));

/**
 * Get payment methods
 */
router.get('/api/admin/autonomous-agent/:agentId/payment-methods', requireAdmin, asyncHandler(async (req, res) => {
  const agent = await AutonomousAgent.findById(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const methods = agent.getActivePaymentMethods();

  res.json({
    success: true,
    activePaymentMethods: methods,
    details: {
      paypal: agent.paypal?.connected || false,
      crypto: agent.cryptoWallets?.length || 0,
      cashapp: agent.cashapp?.connected || false,
      card: agent.card?.connected || false,
      bank: agent.bankAccount?.connected || false
    }
  });
}));

/**
 * Get wallets
 */
router.get('/api/admin/autonomous-agent/:agentId/wallets', requireAdmin, asyncHandler(async (req, res) => {
  const agent = await AutonomousAgent.findById(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  res.json({
    success: true,
    balances: {
      total: agent.totalBalanceUSD,
      byMethod: agent.balanceByMethod
    },
    wallets: {
      paypal: {
        connected: agent.paypal?.connected || false,
        balance: agent.paypal?.balance || 0
      },
      crypto: agent.cryptoWallets.map(w => ({
        coin: w.coin,
        balance: w.balance,
        network: w.network
      })),
      cashapp: {
        connected: agent.cashapp?.connected || false,
        balance: agent.cashapp?.balance || 0
      },
      card: {
        connected: agent.card?.connected || false
      },
      bank: {
        connected: agent.bankAccount?.connected || false
      }
    }
  });
}));

module.exports = router;
