const nodemailer = require('nodemailer');
const AutonomousAgent = require('../models/AutonomousAgent');
const crypto = require('crypto');

/**
 * Autonomous Agent Email Service
 * Handles all email communications for the autonomous agent
 * - Vendor communications
 * - Payment notifications
 * - Billing reminders
 * - Status reports
 */

class AutonomousEmailService {
  constructor() {
    this.transporter = null;
  }

  /**
   * Initialize email service for agent
   */
  static async initializeForAgent(agentId) {
    const agent = await AutonomousAgent.findById(agentId);
    if (!agent) throw new Error('Agent not found');

    if (!agent.email || !agent.emailPassword) {
      throw new Error('Agent email credentials not configured');
    }

    // Decrypt password (in production use proper encryption)
    const decryptedPassword = agent.emailPassword;

    const transporter = nodemailer.createTransport({
      service: 'gmail', // or configure custom SMTP
      auth: {
        user: agent.email,
        pass: decryptedPassword,
      },
    });

    // Verify connection
    await transporter.verify();

    return transporter;
  }

  /**
   * Send payment notification to vendor
   */
  static async sendPaymentNotification(agentId, vendorInfo, transaction) {
    const agent = await AutonomousAgent.findById(agentId);
    if (!agent) throw new Error('Agent not found');

    const transporter = await this.initializeForAgent(agentId);

    const emailContent = `
      <h2>Payment Received</h2>
      <p>Payment has been processed by ${agent.name}</p>

      <h3>Payment Details:</h3>
      <ul>
        <li><strong>Amount:</strong> $${transaction.amount.toFixed(2)} ${transaction.currency}</li>
        <li><strong>Transaction ID:</strong> ${transaction.transactionId}</li>
        <li><strong>Date:</strong> ${new Date(transaction.completedAt).toLocaleString()}</li>
        <li><strong>Payment Method:</strong> ${transaction.paymentMethod.toUpperCase()}</li>
      </ul>

      <h3>Reason:</h3>
      <p>${transaction.reason}</p>

      <p>This is an automated message from ${agent.name}.</p>
    `;

    const mailOptions = {
      from: agent.email,
      to: vendorInfo.email || vendorInfo.contact,
      subject: `Payment Received - ${transaction.transactionId}`,
      html: emailContent,
      date: new Date(),
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log(`Payment notification sent to ${vendorInfo.email}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`Failed to send payment notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send billing reminder
   */
  static async sendBillingReminder(agentId, billingSchedule) {
    const agent = await AutonomousAgent.findById(agentId);
    if (!agent) throw new Error('Agent not found');

    const transporter = await this.initializeForAgent(agentId);

    const daysUntil = billingSchedule.daysUntilBilling();

    const emailContent = `
      <h2>Upcoming Billing Reminder</h2>
      <p>A scheduled payment is due in ${daysUntil} day(s).</p>

      <h3>Payment Details:</h3>
      <ul>
        <li><strong>Vendor:</strong> ${billingSchedule.vendor}</li>
        <li><strong>Amount:</strong> $${billingSchedule.amount.toFixed(2)} ${billingSchedule.currency}</li>
        <li><strong>Due Date:</strong> ${billingSchedule.nextBillingDate.toLocaleString()}</li>
        <li><strong>Frequency:</strong> ${billingSchedule.frequency}</li>
      </ul>

      <h3>Budget Status:</h3>
      <p>Monthly remaining budget: $${(billingSchedule.monthlyBudgetAllocation - billingSchedule.amount).toFixed(2)}</p>

      <p>The payment will be processed automatically unless cancelled.</p>
    `;

    const mailOptions = {
      from: agent.email,
      to: 'admin@pvabazaar.org', // Admin notification
      subject: `Upcoming Payment: ${billingSchedule.vendor} - $${billingSchedule.amount}`,
      html: emailContent,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`Failed to send billing reminder: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send status report
   */
  static async sendStatusReport(agentId) {
    const agent = await AutonomousAgent.findById(agentId);
    if (!agent) throw new Error('Agent not found');

    const transporter = await this.initializeForAgent(agentId);

    // Get recent transactions
    const AgentTransaction = require('../models/AgentTransaction');
    const recentTransactions = await AgentTransaction.find({ agentId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const completedCount = recentTransactions.filter((t) => t.status === 'completed').length;
    const failedCount = recentTransactions.filter((t) => t.status === 'failed').length;

    const emailContent = `
      <h2>Autonomous Agent Status Report</h2>
      <p>Generated: ${new Date().toLocaleString()}</p>

      <h3>Agent Status:</h3>
      <ul>
        <li><strong>Status:</strong> ${agent.status.toUpperCase()}</li>
        <li><strong>Uptime:</strong> ${agent.uptime}%</li>
        <li><strong>Last Active:</strong> ${agent.lastActiveAt?.toLocaleString() || 'Never'}</li>
      </ul>

      <h3>Financial Summary:</h3>
      <ul>
        <li><strong>Total Balance:</strong> $${agent.totalBalanceUSD.toFixed(2)}</li>
        <li><strong>PayPal:</strong> $${agent.balanceByMethod.paypal.toFixed(2)}</li>
        <li><strong>Crypto:</strong> $${agent.balanceByMethod.crypto.toFixed(2)}</li>
        <li><strong>CashApp:</strong> $${agent.balanceByMethod.cashapp.toFixed(2)}</li>
        <li><strong>Card:</strong> $${agent.balanceByMethod.card.toFixed(2)}</li>
        <li><strong>Monthly Budget Used:</strong> ${(agent.maintenanceConfig.monthlyBudget * 0.7).toFixed(2)} / $${agent.maintenanceConfig.monthlyBudget}</li>
      </ul>

      <h3>Recent Transactions (10 most recent):</h3>
      <table border="1" cellpadding="5">
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Method</th>
        </tr>
        ${recentTransactions
          .map(
            (t) => `
          <tr>
            <td>${new Date(t.createdAt).toLocaleDateString()}</td>
            <td>${t.type}</td>
            <td>$${t.amount.toFixed(2)}</td>
            <td>${t.status}</td>
            <td>${t.paymentMethod}</td>
          </tr>
        `,
          )
          .join('')}
      </table>

      <h3>Transaction Summary:</h3>
      <ul>
        <li><strong>Completed:</strong> ${completedCount}</li>
        <li><strong>Failed:</strong> ${failedCount}</li>
        <li><strong>Success Rate:</strong> ${((completedCount / (completedCount + failedCount)) * 100 || 0).toFixed(1)}%</li>
      </ul>

      <h3>Payment Methods Connected:</h3>
      <ul>
        ${agent.paypal?.connected ? '<li>✓ PayPal</li>' : '<li>✗ PayPal</li>'}
        ${agent.cryptoWallets?.length ? `<li>✓ Crypto Wallets (${agent.cryptoWallets.length})</li>` : '<li>✗ Crypto Wallets</li>'}
        ${agent.cashapp?.connected ? '<li>✓ CashApp</li>' : '<li>✗ CashApp</li>'}
        ${agent.card?.connected ? '<li>✓ Card</li>' : '<li>✗ Card</li>'}
        ${agent.bankAccount?.connected ? '<li>✓ Bank Account</li>' : '<li>✗ Bank Account</li>'}
      </ul>

      <h3>Maintenance Status:</h3>
      <ul>
        <li><strong>Auto-pay Enabled:</strong> ${agent.maintenanceConfig.autoPayBills ? '✓' : '✗'}</li>
        <li><strong>Auto-scale Enabled:</strong> ${agent.maintenanceConfig.autoScaleInfra ? '✓' : '✗'}</li>
        <li><strong>Monitoring Enabled:</strong> ${agent.maintenanceConfig.autoMonitor ? '✓' : '✗'}</li>
        <li><strong>Backups Enabled:</strong> ${agent.maintenanceConfig.autoBackup ? '✓' : '✗'}</li>
      </ul>

      <hr>
      <p><small>This report was generated and sent automatically by ${agent.name}.</small></p>
    `;

    const mailOptions = {
      from: agent.email,
      to: 'admin@pvabazaar.org',
      subject: `Agent Status Report - ${new Date().toLocaleDateString()}`,
      html: emailContent,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`Failed to send status report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send low balance alert
   */
  static async sendLowBalanceAlert(agentId) {
    const agent = await AutonomousAgent.findById(agentId);
    if (!agent) throw new Error('Agent not found');

    if (agent.totalBalanceUSD > agent.notificationSettings.lowBalanceThreshold) {
      return { success: false, reason: 'Balance above threshold' };
    }

    const transporter = await this.initializeForAgent(agentId);

    const emailContent = `
      <h2>⚠️ Low Balance Alert</h2>
      <p>The autonomous agent's balance has dropped below the configured threshold.</p>

      <h3>Current Status:</h3>
      <ul>
        <li><strong>Current Balance:</strong> $${agent.totalBalanceUSD.toFixed(2)}</li>
        <li><strong>Threshold:</strong> $${agent.notificationSettings.lowBalanceThreshold}</li>
        <li><strong>Amount Below Threshold:</strong> $${(agent.notificationSettings.lowBalanceThreshold - agent.totalBalanceUSD).toFixed(2)}</li>
      </ul>

      <h3>Balance Breakdown:</h3>
      <ul>
        <li>PayPal: $${agent.balanceByMethod.paypal.toFixed(2)}</li>
        <li>Crypto: $${agent.balanceByMethod.crypto.toFixed(2)}</li>
        <li>CashApp: $${agent.balanceByMethod.cashapp.toFixed(2)}</li>
        <li>Card: $${agent.balanceByMethod.card.toFixed(2)}</li>
        <li>Bank: $${agent.balanceByMethod.bank.toFixed(2)}</li>
      </ul>

      <h3>Action Required:</h3>
      <p>Please add funds to one or more payment methods to ensure continuous operations.</p>

      <p style="color: red;"><strong>Note:</strong> Payments may be suspended if balance cannot be restored.</p>
    `;

    const mailOptions = {
      from: agent.email,
      to: 'admin@pvabazaar.org',
      subject: `Low Balance Alert - Action Required`,
      html: emailContent,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`Failed to send low balance alert: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send payment failure notification
   */
  static async sendPaymentFailureAlert(agentId, transaction, error) {
    const agent = await AutonomousAgent.findById(agentId);
    if (!agent) throw new Error('Agent not found');

    const transporter = await this.initializeForAgent(agentId);

    const emailContent = `
      <h2>❌ Payment Failed</h2>
      <p>An automated payment could not be processed.</p>

      <h3>Transaction Details:</h3>
      <ul>
        <li><strong>Transaction ID:</strong> ${transaction.transactionId}</li>
        <li><strong>Vendor:</strong> ${transaction.to?.vendor || 'Unknown'}</li>
        <li><strong>Amount:</strong> $${transaction.amount.toFixed(2)}</li>
        <li><strong>Method:</strong> ${transaction.paymentMethod}</li>
        <li><strong>Reason:</strong> ${transaction.reason}</li>
        <li><strong>Error:</strong> ${error}</li>
      </ul>

      <h3>Retry Information:</h3>
      <p>Retry attempts: ${transaction.result?.retryCount || 0} / ${transaction.result?.maxRetries || 3}</p>

      <h3>Action Required:</h3>
      <p>Please review the error and either:</p>
      <ol>
        <li>Add funds to your payment method</li>
        <li>Update payment method information</li>
        <li>Manually process the payment and contact support</li>
      </ol>

      <p><strong>If left unresolved, critical services may go offline.</strong></p>
    `;

    const mailOptions = {
      from: agent.email,
      to: 'admin@pvabazaar.org',
      subject: `Payment Failed - ${transaction.transactionId}`,
      html: emailContent,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`Failed to send payment failure alert: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AutonomousEmailService;
