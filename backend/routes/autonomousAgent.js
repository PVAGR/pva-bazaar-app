const express = require('express');
const router = express.Router();
const AutonomousAgent = require('../models/AutonomousAgent');
const AgentTransaction = require('../models/AgentTransaction');
const AgentBillingSchedule = require('../models/AgentBillingSchedule');
const AutonomousPaymentService = require('../services/autonomousPaymentService');
const AutonomousEmailService = require('../services/autonomousEmailService');
const AutonomousMaintenanceScheduler = require('../services/autonomousMaintenanceScheduler');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Autonomous Agent Routes
 * Admin-only endpoints for managing autonomous agent
 */

// Get agent status (admin)
router.get('/status', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const agents = await AutonomousAgent.find()
    .select('-emailPassword -bankAccount.accountNumber -bankAccount.routingNumber')
    .lean();

  const withSchedules = await Promise.all(agents.map(async agent => {
    const schedules = await AgentBillingSchedule.countDocuments({
      agentId: agent._id,
      active: true
    });
    const overdue = await AgentBillingSchedule.countDocuments({
      agentId: agent._id,
      active: true,
      nextBillingDate: { $lte: new Date() }
    });
    return {
      ...agent,
      scheduleCount: schedules,
      overdueCount: overdue
    };
  }));

  res.json({
    success: true,
    agents: withSchedules,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalBalance: agents.reduce((sum, a) => sum + a.totalBalanceUSD, 0)
  });
}));

// Get specific agent (admin)
router.get('/:agentId', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const agent = await AutonomousAgent.findById(req.params.agentId)
    .select('-emailPassword -bankAccount.accountNumber -bankAccount.routingNumber');

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const transactions = await AgentTransaction.find({ agentId: agent._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const schedules = await AgentBillingSchedule.find({ agentId: agent._id })
    .lean();

  res.json({
    success: true,
    agent,
    recentTransactions: transactions,
    billingSchedules: schedules
  });
}));

// Create new agent (admin)
router.post('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { name, email, emailPassword, primaryPaymentMethod } = req.body;

  if (!name || !email || !emailPassword) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const existingAgent = await AutonomousAgent.findOne({ email });
  if (existingAgent) {
    return res.status(409).json({ error: 'Agent with this email already exists' });
  }

  const agent = await AutonomousAgent.create({
    name,
    email,
    emailPassword, // In production, encrypt this
    primaryPaymentMethod: primaryPaymentMethod || 'paypal'
  });

  res.status(201).json({
    success: true,
    agent: agent.toObject({ transform: (doc, ret) => {
      delete ret.emailPassword;
      return ret;
    } })
  });
}));

// Update agent configuration (admin)
router.put('/:agentId/config', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const agent = await AutonomousAgent.findById(req.params.agentId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const { maintenanceConfig, limits, autoPayBills } = req.body;

  if (maintenanceConfig) {
    agent.maintenanceConfig = { ...agent.maintenanceConfig, ...maintenanceConfig };
  }

  if (limits) {
    agent.limits = { ...agent.limits, ...limits };
  }

  if (autoPayBills !== undefined) {
    agent.maintenanceConfig.autoPayBills = autoPayBills;
  }

  agent.lastModifiedBy = req.user._id;
  await agent.save();

  await agent.logAction('config_updated', req.user._id, { changes: req.body });

  res.json({ success: true, agent });
}));

// Add payment method (admin)
router.post('/:agentId/payment-method', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const agent = await AutonomousAgent.findById(req.params.agentId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const { method, credentials } = req.body;

  switch (method) {
    case 'paypal':
      agent.paypal = {
        ...agent.paypal,
        email: credentials.email,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        connected: true
      };
      break;

    case 'crypto':
      agent.cryptoWallets.push({
        coin: credentials.coin,
        address: credentials.address,
        network: credentials.network,
        balance: 0
      });
      break;

    case 'cashapp':
      agent.cashapp = {
        tag: credentials.tag,
        apiKey: credentials.apiKey,
        connected: true
      };
      break;

    case 'card':
      agent.card = {
        lastFourDigits: credentials.lastFourDigits,
        expiryMonth: credentials.expiryMonth,
        expiryYear: credentials.expiryYear,
        tokenId: credentials.tokenId,
        connected: true
      };
      break;

    case 'bank':
      agent.bankAccount = {
        accountNumber: credentials.accountNumber,
        routingNumber: credentials.routingNumber,
        bankName: credentials.bankName,
        accountType: credentials.accountType,
        connected: true
      };
      break;

    default:
      return res.status(400).json({ error: 'Unknown payment method' });
  }

  await agent.save();
  await agent.logAction('payment_method_added', req.user._id, { method });

  res.json({ success: true, message: `${method} payment method added` });
}));

// Sync balances (admin)
router.post('/:agentId/sync-balances', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const result = await AutonomousPaymentService.syncBalances(req.params.agentId);
  res.json({ success: true, ...result });
}));

// Get transactions (admin)
router.get('/:agentId/transactions', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { type, status, limit = 50, skip = 0 } = req.query;

  const query = { agentId: req.params.agentId };
  if (type) query.type = type;
  if (status) query.status = status;

  const transactions = await AgentTransaction.find(query)
    .sort({ createdAt: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit))
    .lean();

  const total = await AgentTransaction.countDocuments(query);

  res.json({
    success: true,
    transactions,
    pagination: { total, skip: parseInt(skip), limit: parseInt(limit) }
  });
}));

// Create billing schedule (admin)
router.post('/:agentId/billing-schedule', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { vendor, amount, frequency, dayOfMonth } = req.body;

  if (!vendor || !amount || !frequency) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const schedule = await AgentBillingSchedule.create({
    agentId: req.params.agentId,
    scheduleName: `${vendor} - ${frequency}`,
    vendor,
    amount,
    frequency,
    dayOfMonth: dayOfMonth || 1,
    active: true,
    createdBy: req.user._id
  });

  // Calculate first billing date
  schedule.nextBillingDate = schedule.calculateNextBillingDate();
  await schedule.save();

  res.status(201).json({ success: true, schedule });
}));

// Get billing schedules (admin)
router.get('/:agentId/billing-schedules', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const schedules = await AgentBillingSchedule.find({
    agentId: req.params.agentId
  })
    .sort({ nextBillingDate: 1 })
    .lean();

  res.json({
    success: true,
    schedules,
    active: schedules.filter(s => s.active).length,
    overdue: schedules.filter(s => s.isOverdue?.() !== false).length
  });
}));

// Manual payment execution (admin)
router.post('/:agentId/execute-payment', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { vendor, amount, reason, vendorEmail } = req.body;

  if (!vendor || !amount || !reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await AutonomousPaymentService.processPayment(
      req.params.agentId,
      { name: vendor, email: vendorEmail },
      amount,
      reason
    );

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}));

// Toggle operations (admin)
router.post('/:agentId/toggle-operations', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const agent = await AutonomousAgent.findById(req.params.agentId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  agent.operationsEnabled = !agent.operationsEnabled;
  await agent.save();
  await agent.logAction('operations_toggled', req.user._id, { enabled: agent.operationsEnabled });

  res.json({
    success: true,
    operationsEnabled: agent.operationsEnabled,
    message: `Operations ${agent.operationsEnabled ? 'enabled' : 'disabled'}`
  });
}));

// Send test email (admin)
router.post('/:agentId/send-test-email', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { to, subject, message } = req.body;

  try {
    const AutonomousEmailService = require('../services/autonomousEmailService');
    const result = await AutonomousEmailService.sendStatusReport(req.params.agentId);
    res.json({ success: true, message: 'Test email sent', result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}));

// Get agent spending report (admin)
router.get('/:agentId/spending-report', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;

  const spending = await AutonomousPaymentService.calculateSpending(req.params.agentId, period);

  res.json({
    success: true,
    period,
    spending,
    totalSpent: spending.reduce((sum, s) => sum + s.total, 0)
  });
}));

module.exports = router;
