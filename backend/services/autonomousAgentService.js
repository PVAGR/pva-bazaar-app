const AutonomousAgent = require('../models/AutonomousAgent');
const AgentTransaction = require('../models/AgentTransaction');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

class AutonomousAgentService {
  /**
   * Create or initialize the autonomous agent
   */
  static async initializeAgent(agentData = {}) {
    const existingAgent = await AutonomousAgent.findOne({});

    if (existingAgent) {
      return existingAgent;
    }

    const newAgent = new AutonomousAgent({
      name: agentData.name || 'PVA Bazaar Autonomous Agent',
      email: agentData.email || 'autonomous-payments@pvabazaar.org',
      emailPassword: agentData.emailPassword || crypto.randomBytes(32).toString('hex'),
      status: 'active',
      operationsEnabled: true,
      primaryPaymentMethod: agentData.primaryPaymentMethod || 'paypal',
      maintenanceConfig: {
        autoPayBills: true,
        autoScaleInfra: true,
        autoMonitor: true,
        autoBackup: true,
        autoUpdateDependencies: true,
        monthlyBudget: 5000,
        emergencyBudget: 1000,
      },
      healthStatus: {
        lastHealthCheckAt: new Date(),
        fullySynced: false,
        allPaymentMethodsConnected: false,
        sufficientFundsAvailable: false,
      },
    });

    await newAgent.save();
    return newAgent;
  }

  /**
   * Add payment method to agent
   */
  static async addPaymentMethod(agent, method, credentials) {
    const encryptedCredentials = this.encryptCredentials(credentials);

    switch (method) {
      case 'paypal':
        agent.paypal = {
          email: credentials.email,
          clientId: encryptedCredentials.clientId,
          clientSecret: encryptedCredentials.clientSecret,
          connected: true,
          balance: 0,
          lastSyncedAt: new Date(),
        };
        break;

      case 'crypto':
        agent.cryptoWallets.push({
          coin: credentials.coin || 'usdc',
          address: credentials.address,
          privateKeyEncrypted: encryptedCredentials.privateKey,
          balance: 0,
          network: credentials.network || 'polygon',
          lastSyncedAt: new Date(),
        });
        break;

      case 'cashapp':
        agent.cashapp = {
          tag: credentials.tag,
          connected: true,
          apiKey: encryptedCredentials.apiKey,
          balance: 0,
          lastSyncedAt: new Date(),
        };
        break;

      case 'card':
        agent.card = {
          lastFourDigits: credentials.cardNumber.slice(-4),
          expiryMonth: credentials.expiryMonth,
          expiryYear: credentials.expiryYear,
          connected: true,
          tokenId: encryptedCredentials.tokenId,
          billingAddress: credentials.billingAddress,
        };
        break;

      case 'bank':
        agent.bankAccount = {
          accountNumber: encryptedCredentials.accountNumber,
          routingNumber: encryptedCredentials.routingNumber,
          bankName: credentials.bankName,
          accountType: credentials.accountType,
          connected: true,
        };
        break;
    }

    await agent.save();
    return agent;
  }

  /**
   * Create scheduled payment
   */
  static async createScheduledPayment(agent, paymentData) {
    const nextPaymentDate = this.calculateNextPaymentDate(
      paymentData.frequency,
      paymentData.dayOfMonth,
    );

    agent.scheduledPayments.push({
      vendor: paymentData.vendor,
      amount: paymentData.amount,
      currency: paymentData.currency || 'USD',
      frequency: paymentData.frequency,
      nextPaymentDate,
      active: true,
    });

    await agent.save();
    return agent;
  }

  /**
   * Execute scheduled payments
   */
  static async executeScheduledPayments(agent) {
    const now = new Date();
    const duePayments = agent.scheduledPayments.filter((p) => p.active && p.nextPaymentDate <= now);

    const results = [];

    for (const payment of duePayments) {
      try {
        // Check if agent can make payment
        if (!agent.canMakePayment(payment.amount)) {
          await this.sendAlert(
            agent,
            'warning',
            `Insufficient funds for ${payment.vendor} payment of $${payment.amount}`,
          );
          continue;
        }

        // Execute payment
        const transactionResult = await this.executePayment(agent, payment);
        results.push({
          vendor: payment.vendor,
          success: true,
          transactionId: transactionResult._id,
        });

        // Update next payment date
        payment.nextPaymentDate = this.calculateNextPaymentDate(
          payment.frequency,
          payment.dayOfMonth,
        );

        // Send confirmation email
        await this.sendPaymentConfirmation(agent, payment, transactionResult);
      } catch (error) {
        results.push({
          vendor: payment.vendor,
          success: false,
          error: error.message,
        });

        await this.sendAlert(
          agent,
          'critical',
          `Payment failed for ${payment.vendor}: ${error.message}`,
        );
      }
    }

    await agent.save();
    return results;
  }

  /**
   * Execute single payment
   */
  static async executePayment(agent, payment) {
    // Deduct from agent balance based on primary payment method
    const method = agent.primaryPaymentMethod;
    agent.balanceByMethod[method] -= payment.amount;
    agent.totalBalanceUSD -= payment.amount;

    // Create transaction record
    const transaction = new AgentTransaction({
      agentId: agent._id,
      vendor: payment.vendor,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: method,
      type: 'payment',
      status: 'completed',
      timestamp: new Date(),
    });

    await transaction.save();
    agent.recentTransactions.push(transaction._id);

    // Keep only last 50 transactions
    if (agent.recentTransactions.length > 50) {
      agent.recentTransactions = agent.recentTransactions.slice(-50);
    }

    await agent.save();
    return transaction;
  }

  /**
   * Fund agent wallet
   */
  static async fundAgent(agent, amount, method = 'initial_funding') {
    agent.balanceByMethod[agent.primaryPaymentMethod] =
      (agent.balanceByMethod[agent.primaryPaymentMethod] || 0) + amount;
    agent.totalBalanceUSD += amount;

    const funding = new AgentTransaction({
      agentId: agent._id,
      vendor: 'PVA Bazaar',
      amount,
      currency: 'USD',
      paymentMethod: agent.primaryPaymentMethod,
      type: 'funding',
      status: 'completed',
      description: method,
      timestamp: new Date(),
    });

    await funding.save();
    agent.recentTransactions.push(funding._id);
    await agent.save();

    return {
      success: true,
      totalBalance: agent.totalBalanceUSD,
      transaction: funding,
    };
  }

  /**
   * Get agent status
   */
  static async getAgentStatus(agent) {
    return {
      id: agent._id,
      name: agent.name,
      email: agent.email,
      status: agent.status,
      operationsEnabled: agent.operationsEnabled,
      totalBalance: agent.totalBalanceUSD,
      balanceByMethod: agent.balanceByMethod,
      paymentMethods: agent.getActivePaymentMethods(),
      scheduledPayments: agent.scheduledPayments.filter((p) => p.active).length,
      uptime: agent.uptime,
      healthStatus: agent.healthStatus,
      lastActiveAt: agent.lastActiveAt,
      maintenanceConfig: agent.maintenanceConfig,
    };
  }

  /**
   * Send payment confirmation email
   */
  static async sendPaymentConfirmation(agent, payment, transaction) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: agent.email,
          pass: agent.emailPassword,
        },
      });

      const mailOptions = {
        from: agent.email,
        to: agent.email,
        subject: `💰 Payment Executed - ${payment.vendor}`,
        html: `
          <h2>Payment Executed Successfully</h2>
          <p><strong>Vendor:</strong> ${payment.vendor}</p>
          <p><strong>Amount:</strong> $${payment.amount} ${payment.currency}</p>
          <p><strong>Payment Method:</strong> ${payment.paymentMethod}</p>
          <p><strong>Transaction ID:</strong> ${transaction._id}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>New Balance:</strong> $${agent.totalBalanceUSD}</p>
          <hr>
          <p><small>This is an automated payment from PVA Bazaar Autonomous Agent</small></p>
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send payment confirmation:', error);
    }
  }

  /**
   * Send alert
   */
  static async sendAlert(agent, severity, message) {
    agent.notificationSettings.alertOnLowBalance &&
      agent.notificationSettings.email &&
      this.sendAlertEmail(agent, severity, message);

    // Store in audit log
    agent.auditLog.push({
      action: 'alert',
      details: { severity, message },
      timestamp: new Date(),
    });

    await agent.save();
  }

  /**
   * Send alert email
   */
  static async sendAlertEmail(agent, severity, message) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: agent.email,
          pass: agent.emailPassword,
        },
      });

      const mailOptions = {
        from: agent.email,
        to: agent.email,
        subject: `⚠️ [${severity.toUpperCase()}] Agent Alert`,
        html: `
          <h2>${severity.toUpperCase()} Alert</h2>
          <p>${message}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p>Please check your PVA Bazaar dashboard for more details.</p>
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send alert email:', error);
    }
  }

  /**
   * Calculate next payment date
   */
  static calculateNextPaymentDate(frequency, dayOfMonth = 1) {
    const now = new Date();
    const nextDate = new Date(now);

    if (frequency === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (frequency === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
      nextDate.setDate(dayOfMonth);
    } else if (frequency === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      nextDate.setDate(dayOfMonth);
    }

    return nextDate;
  }

  /**
   * Encrypt credentials
   */
  static encryptCredentials(credentials) {
    const cipher = (data) => {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
      const iv = crypto.randomBytes(16);
      const encryptor = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = encryptor.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += encryptor.final('hex');
      return { encrypted, iv: iv.toString('hex') };
    };

    const encrypted = {};
    for (const [key, value] of Object.entries(credentials)) {
      if (value) {
        encrypted[key] = cipher(value);
      }
    }
    return encrypted;
  }

  /**
   * Check health and sync balances
   */
  static async performHealthCheck(agent) {
    agent.healthStatus.lastHealthCheckAt = new Date();
    agent.healthStatus.allPaymentMethodsConnected = agent.getActivePaymentMethods().length >= 2;
    agent.healthStatus.sufficientFundsAvailable =
      agent.totalBalanceUSD >= agent.maintenanceConfig.monthlyBudget;
    agent.lastActiveAt = new Date();

    await agent.save();
    return agent.healthStatus;
  }
}

module.exports = AutonomousAgentService;
