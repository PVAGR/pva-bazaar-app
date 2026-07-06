/**
 * Autonomous Agent Payment Scheduler
 * Runs as a background worker to execute scheduled vendor payments
 * Can be triggered via cron jobs or API endpoints
 */

const AutonomousAgent = require('../models/AutonomousAgent');
const AutonomousAgentService = require('../services/autonomousAgentService');

class AutonomousAgentScheduler {
  static async start() {
    console.log('🤖 Autonomous Agent Scheduler starting...');

    // Run payment checks every 5 minutes
    setInterval(() => this.checkAndExecutePayments(), 5 * 60 * 1000);

    // Run balance sync every 30 minutes
    setInterval(() => this.syncAllBalances(), 30 * 60 * 1000);

    // Run health check every 10 minutes
    setInterval(() => this.performHealthChecks(), 10 * 60 * 1000);

    // Run low balance alerts every hour
    setInterval(() => this.checkLowBalances(), 60 * 60 * 1000);

    console.log('✅ Autonomous Agent Scheduler active');
    console.log('  • Payment checks: Every 5 minutes');
    console.log('  • Balance sync: Every 30 minutes');
    console.log('  • Health checks: Every 10 minutes');
    console.log('  • Low balance alerts: Every hour');
  }

  /**
   * Check for due payments and execute them
   */
  static async checkAndExecutePayments() {
    try {
      const agents = await AutonomousAgent.find({ operationsEnabled: true, status: 'active' });

      for (const agent of agents) {
        const results = await AutonomousAgentService.executeScheduledPayments(agent);

        if (results.some((r) => r.success)) {
          console.log(
            `✅ [${new Date().toISOString()}] Agent ${agent.name} executed ${results.filter((r) => r.success).length} payment(s)`,
          );
        }

        if (results.some((r) => !r.success)) {
          console.warn(
            `⚠️ [${new Date().toISOString()}] Agent ${agent.name} had ${results.filter((r) => !r.success).length} failed payment(s)`,
          );
        }
      }
    } catch (error) {
      console.error('❌ Payment execution error:', error.message);
    }
  }

  /**
   * Sync all balances across payment methods
   */
  static async syncAllBalances() {
    try {
      const agents = await AutonomousAgent.find({});

      for (const agent of agents) {
        // Sync PayPal balance
        if (agent.paypal?.connected) {
          try {
            // Mock sync - in production would call PayPal API
            agent.paypal.lastSyncedAt = new Date();
            console.log(`📊 Synced PayPal balance for ${agent.name}`);
          } catch (error) {
            console.warn(`⚠️ PayPal sync failed: ${error.message}`);
          }
        }

        // Sync crypto wallets
        if (agent.cryptoWallets?.length > 0) {
          for (const wallet of agent.cryptoWallets) {
            try {
              // Mock sync - in production would call blockchain RPC
              wallet.lastSyncedAt = new Date();
              console.log(`📊 Synced ${wallet.coin} wallet for ${agent.name}`);
            } catch (error) {
              console.warn(`⚠️ Crypto wallet sync failed: ${error.message}`);
            }
          }
        }

        // Sync CashApp balance
        if (agent.cashapp?.connected) {
          try {
            agent.cashapp.lastSyncedAt = new Date();
            console.log(`📊 Synced CashApp balance for ${agent.name}`);
          } catch (error) {
            console.warn(`⚠️ CashApp sync failed: ${error.message}`);
          }
        }

        await agent.save();
      }
    } catch (error) {
      console.error('❌ Balance sync error:', error.message);
    }
  }

  /**
   * Perform health checks on all agents
   */
  static async performHealthChecks() {
    try {
      const agents = await AutonomousAgent.find({});

      for (const agent of agents) {
        const health = await AutonomousAgentService.performHealthCheck(agent);

        const status = `${agent.name} - Balance: $${agent.totalBalanceUSD}, Methods: ${agent.getActivePaymentMethods().join(', ') || 'none'}`;

        if (health.sufficientFundsAvailable && health.allPaymentMethodsConnected) {
          console.log(`✅ ${status}`);
        } else {
          if (!health.sufficientFundsAvailable) {
            console.warn(`⚠️ Low balance: ${status}`);
          }
          if (!health.allPaymentMethodsConnected) {
            console.warn(`⚠️ Missing payment methods: ${status}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Health check error:', error.message);
    }
  }

  /**
   * Check for low balances and send alerts
   */
  static async checkLowBalances() {
    try {
      const agents = await AutonomousAgent.find({
        'notificationSettings.alertOnLowBalance': true,
      });

      for (const agent of agents) {
        const threshold = agent.notificationSettings.lowBalanceThreshold || 100;

        if (agent.totalBalanceUSD < threshold) {
          console.warn(`🚨 LOW BALANCE ALERT: ${agent.name}`);
          console.warn(`   Current: $${agent.totalBalanceUSD}`);
          console.warn(`   Threshold: $${threshold}`);

          await AutonomousAgentService.sendAlertEmail(
            agent,
            'critical',
            `Your autonomous agent balance is critically low: $${agent.totalBalanceUSD}. Please fund immediately to continue operations.`,
          );
        }
      }
    } catch (error) {
      console.error('❌ Low balance check error:', error.message);
    }
  }

  /**
   * Manual trigger for payment execution (via API)
   */
  static async triggerPaymentExecution(agentId) {
    try {
      const agent = await AutonomousAgent.findById(agentId);
      if (!agent) throw new Error('Agent not found');

      const results = await AutonomousAgentService.executeScheduledPayments(agent);
      return results;
    } catch (error) {
      console.error('❌ Manual payment trigger error:', error.message);
      throw error;
    }
  }

  /**
   * Check if scheduler should auto-run
   */
  static shouldAutoRun() {
    // Don't auto-run in test environment or if explicitly disabled
    return process.env.AUTO_AGENT_SCHEDULER !== 'false' && process.env.NODE_ENV !== 'test';
  }
}

// Auto-start scheduler if enabled
if (AutonomousAgentScheduler.shouldAutoRun()) {
  // Delay startup to ensure DB connection is ready
  setTimeout(() => {
    AutonomousAgentScheduler.start().catch((err) => {
      console.error('Failed to start autonomous agent scheduler:', err);
    });
  }, 5000);
}

module.exports = AutonomousAgentScheduler;
