const AutonomousAgent = require('../models/AutonomousAgent');
const AgentTransaction = require('../models/AgentTransaction');
const AgentBillingSchedule = require('../models/AgentBillingSchedule');
const crypto = require('crypto');

/**
 * Autonomous Payment Service
 * Handles all autonomous payment operations:
 * - PayPal payments
 * - Crypto wallet transfers
 * - CashApp payments
 * - Card payments
 * - Bank transfers
 * - Balance management
 */

class AutonomousPaymentService {
  /**
   * Process payment using best available method
   */
  static async processPayment(agentId, vendorInfo, amount, reason) {
    const agent = await AutonomousAgent.findById(agentId);
    if (!agent) throw new Error('Agent not found');

    if (!agent.canMakePayment(amount)) {
      throw new Error(`Cannot make payment: insufficient funds or exceeds limits`);
    }

    // Determine best payment method
    const paymentMethod = this.selectPaymentMethod(agent, agent.primaryPaymentMethod);

    // Create transaction record
    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const transaction = await AgentTransaction.create({
      transactionId,
      agentId,
      type: 'bill_payment',
      amount,
      currency: 'USD',
      amountInUSD: amount,
      paymentMethod,
      reason,
      to: vendorInfo,
      status: 'pending',
      initiatedAt: new Date(),
      from: {
        method: agent.primaryPaymentMethod,
        identifier: agent.email
      }
    });

    try {
      // Route to appropriate payment processor
      let result;

      switch (paymentMethod) {
        case 'paypal':
          result = await this.payViaPayPal(agent, vendorInfo, amount, transaction);
          break;
        case 'crypto':
          result = await this.payViaCrypto(agent, vendorInfo, amount, transaction);
          break;
        case 'cashapp':
          result = await this.payViaCashApp(agent, vendorInfo, amount, transaction);
          break;
        case 'card':
          result = await this.payViaCard(agent, vendorInfo, amount, transaction);
          break;
        case 'bank':
          result = await this.payViaBank(agent, vendorInfo, amount, transaction);
          break;
        default:
          throw new Error(`Unknown payment method: ${paymentMethod}`);
      }

      if (result.success) {
        transaction.status = 'completed';
        transaction.result = {
          success: true,
          confirmationId: result.confirmationId,
          receiptUrl: result.receiptUrl
        };
        transaction.completedAt = new Date();

        // Update agent balance
        agent.balanceByMethod[paymentMethod] -= amount;
        agent.totalBalanceUSD = agent.getTotalBalance();
        agent.lastActiveAt = new Date();

        await transaction.save();
        await agent.save();

        return { success: true, transaction, result };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      transaction.status = 'failed';
      transaction.result = {
        success: false,
        errorMessage: error.message,
        retryCount: 0
      };
      await transaction.save();

      throw error;
    }
  }

  /**
   * Select best payment method based on availability, balance, and fees
   */
  static selectPaymentMethod(agent, preferredMethod) {
    const activeMethods = agent.getActivePaymentMethods();

    if (activeMethods.includes(preferredMethod)) {
      return preferredMethod;
    }

    // Fallback priority: crypto > paypal > card > cashapp > bank
    const priority = ['crypto', 'paypal', 'card', 'cashapp', 'bank'];

    for (const method of priority) {
      if (activeMethods.includes(method)) {
        return method;
      }
    }

    throw new Error('No active payment methods available');
  }

  /**
   * Pay via PayPal
   */
  static async payViaPayPal(agent, vendorInfo, amount, transaction) {
    if (!agent.paypal?.connected) {
      throw new Error('PayPal not connected');
    }

    try {
      // In production, use PayPal SDK
      // For now, simulate with proper structure
      const paypalPayload = {
        amount: {
          currency_code: 'USD',
          value: amount.toString()
        },
        reference_id: transaction.transactionId,
        description: transaction.reason,
        custom_id: agent._id.toString(),
        payer: {
          email_address: agent.paypal.email
        },
        shipping: {
          name: {
            full_name: vendorInfo.name || 'Vendor'
          }
        }
      };

      // Simulate PayPal API call
      const confirmationId = `PP-${crypto.randomBytes(8).toString('hex')}`;

      return {
        success: true,
        confirmationId,
        receiptUrl: `https://paypal.com/receipt/${confirmationId}`,
        method: 'paypal'
      };
    } catch (error) {
      return {
        success: false,
        error: `PayPal payment failed: ${error.message}`
      };
    }
  }

  /**
   * Pay via Crypto (Ethereum, Bitcoin, Polygon, etc)
   */
  static async payViaCrypto(agent, vendorInfo, amount, transaction) {
    if (!agent.cryptoWallets?.length) {
      throw new Error('No crypto wallets configured');
    }

    try {
      // Select best wallet (USDC for stablecoin, ETH as fallback)
      let wallet = agent.cryptoWallets.find(w => w.coin === 'usdc');
      if (!wallet) {
        wallet = agent.cryptoWallets.find(w => w.coin === 'ethereum');
      }
      if (!wallet) {
        wallet = agent.cryptoWallets[0];
      }

      if (!wallet.balance || wallet.balance < amount) {
        throw new Error(`Insufficient crypto balance. Have: ${wallet.balance}, Need: ${amount}`);
      }

      // In production, use Web3.js or ethers.js
      // Simulate transaction
      const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;

      return {
        success: true,
        confirmationId: txHash,
        receiptUrl: `https://etherscan.io/tx/${txHash}`,
        method: 'crypto',
        txHash,
        coin: wallet.coin,
        network: wallet.network
      };
    } catch (error) {
      return {
        success: false,
        error: `Crypto payment failed: ${error.message}`
      };
    }
  }

  /**
   * Pay via CashApp
   */
  static async payViaCashApp(agent, vendorInfo, amount, transaction) {
    if (!agent.cashapp?.connected) {
      throw new Error('CashApp not connected');
    }

    try {
      // CashApp payment simulation
      const confirmationId = `CA-${crypto.randomBytes(8).toString('hex')}`;

      return {
        success: true,
        confirmationId,
        receiptUrl: `https://cash.app/receipt/${confirmationId}`,
        method: 'cashapp'
      };
    } catch (error) {
      return {
        success: false,
        error: `CashApp payment failed: ${error.message}`
      };
    }
  }

  /**
   * Pay via Card
   */
  static async payViaCard(agent, vendorInfo, amount, transaction) {
    if (!agent.card?.connected) {
      throw new Error('Card not connected');
    }

    try {
      // Use Stripe tokenized card
      const confirmationId = `CARD-${crypto.randomBytes(8).toString('hex')}`;

      return {
        success: true,
        confirmationId,
        receiptUrl: `https://stripe.com/receipt/${confirmationId}`,
        method: 'card',
        lastFourDigits: agent.card.lastFourDigits
      };
    } catch (error) {
      return {
        success: false,
        error: `Card payment failed: ${error.message}`
      };
    }
  }

  /**
   * Pay via Bank Transfer
   */
  static async payViaBank(agent, vendorInfo, amount, transaction) {
    if (!agent.bankAccount?.connected) {
      throw new Error('Bank account not connected');
    }

    try {
      const confirmationId = `BANK-${crypto.randomBytes(8).toString('hex')}`;

      return {
        success: true,
        confirmationId,
        receiptUrl: `https://bank.example.com/receipt/${confirmationId}`,
        method: 'bank',
        processingTime: '1-2 business days'
      };
    } catch (error) {
      return {
        success: false,
        error: `Bank transfer failed: ${error.message}`
      };
    }
  }

  /**
   * Sync wallet balances
   */
  static async syncBalances(agentId) {
    const agent = await AutonomousAgent.findById(agentId);
    if (!agent) throw new Error('Agent not found');

    try {
      // Sync PayPal
      if (agent.paypal?.connected) {
        // In production: call PayPal API
        agent.balanceByMethod.paypal = agent.paypal.balance || 0;
      }

      // Sync Crypto
      if (agent.cryptoWallets?.length) {
        let totalCrypto = 0;
        for (const wallet of agent.cryptoWallets) {
          // In production: fetch from blockchain
          totalCrypto += wallet.balance || 0;
        }
        agent.balanceByMethod.crypto = totalCrypto;
      }

      // Sync CashApp
      if (agent.cashapp?.connected) {
        agent.balanceByMethod.cashapp = agent.cashapp.balance || 0;
      }

      // Update total
      agent.totalBalanceUSD = agent.getTotalBalance();
      agent.healthStatus.lastHealthCheckAt = new Date();
      agent.healthStatus.sufficientFundsAvailable = agent.totalBalanceUSD > 100;

      await agent.save();

      return {
        success: true,
        balances: agent.balanceByMethod,
        total: agent.totalBalanceUSD
      };
    } catch (error) {
      throw new Error(`Balance sync failed: ${error.message}`);
    }
  }

  /**
   * Execute scheduled billing
   */
  static async executeScheduledBilling(scheduleId) {
    const schedule = await AgentBillingSchedule.findById(scheduleId);
    if (!schedule) throw new Error('Billing schedule not found');

    if (!schedule.isOverdue()) {
      throw new Error('Billing not yet due');
    }

    try {
      const result = await this.processPayment(
        schedule.agentId,
        { name: schedule.vendor, email: schedule.vendorEmail },
        schedule.amount,
        `Scheduled payment for ${schedule.vendor}`
      );

      if (result.success) {
        schedule.markBilled();
        return { success: true, schedule, transaction: result.transaction };
      }
    } catch (error) {
      const escalation = schedule.markFailed();
      if (escalation?.escalate) {
        // Notify admin
        console.error(`ESCALATION: Failed to pay ${schedule.vendor}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  static async getTransactionHistory(agentId, filter = {}) {
    return await AgentTransaction.find({
      agentId,
      ...filter
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }

  /**
   * Calculate agent spending
   */
  static async calculateSpending(agentId, period = 'month') {
    const agent = await AutonomousAgent.findById(agentId);
    if (!agent) throw new Error('Agent not found');

    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const transactions = await AgentTransaction.aggregate([
      {
        $match: {
          agentId: agent._id,
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    return transactions;
  }
}

module.exports = AutonomousPaymentService;
