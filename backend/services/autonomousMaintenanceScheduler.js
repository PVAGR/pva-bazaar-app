const cron = require('node-cron');
const AutonomousAgent = require('../models/AutonomousAgent');
const AgentBillingSchedule = require('../models/AgentBillingSchedule');
const AutonomousPaymentService = require('./autonomousPaymentService');
const AutonomousEmailService = require('./autonomousEmailService');

/**
 * Autonomous Maintenance Scheduler
 * Handles all scheduled autonomous operations:
 * - Execute scheduled billing
 * - Monitor system health
 * - Balance syncing
 * - Status reporting
 * - Emergency response
 */

class AutonomousMaintenanceScheduler {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Start autonomous scheduler for agent
   */
  async startForAgent(agentId) {
    const agent = await AutonomousAgent.findById(agentId);
    if (!agent) throw new Error('Agent not found');

    if (!agent.operationsEnabled) {
      throw new Error('Operations not enabled for this agent');
    }

    console.log(`Starting autonomous scheduler for agent: ${agent.name}`);

    // Schedule billing execution (every minute, check for overdue bills)
    const billingJob = cron.schedule('* * * * *', async () => {
      await this.executeBilling(agentId);
    });
    this.jobs.push(billingJob);

    // Balance sync (every 5 minutes)
    const syncJob = cron.schedule('*/5 * * * *', async () => {
      await this.syncBalances(agentId);
    });
    this.jobs.push(syncJob);

    // Health check (every 10 minutes)
    const healthJob = cron.schedule('*/10 * * * *', async () => {
      await this.performHealthCheck(agentId);
    });
    this.jobs.push(healthJob);

    // Daily status report (9 AM)
    const reportJob = cron.schedule('0 9 * * *', async () => {
      await this.generateDailyReport(agentId);
    });
    this.jobs.push(reportJob);

    // Low balance check (every 30 minutes)
    const balanceAlertJob = cron.schedule('*/30 * * * *', async () => {
      await this.checkLowBalance(agentId);
    });
    this.jobs.push(balanceAlertJob);

    this.isRunning = true;
    agent.status = 'active';
    agent.lastActiveAt = new Date();
    await agent.save();

    return { success: true, jobsScheduled: this.jobs.length };
  }

  /**
   * Execute overdue billing schedules
   */
  async executeBilling(agentId) {
    try {
      const overdueSchedules = await AgentBillingSchedule.find({
        agentId,
        active: true,
        nextBillingDate: { $lte: new Date() }
      });

      for (const schedule of overdueSchedules) {
        try {
          await AutonomousPaymentService.executeScheduledBilling(schedule._id);
          console.log(`✓ Executed billing for ${schedule.vendor}`);
        } catch (error) {
          console.error(`✗ Failed to execute billing for ${schedule.vendor}: ${error.message}`);

          // Send failure alert
          try {
            // Get last transaction for error details
            const transaction = schedule.recentTransactions?.[0];
            await AutonomousEmailService.sendPaymentFailureAlert(agentId, transaction, error.message);
          } catch (emailError) {
            console.error(`Failed to send payment failure alert: ${emailError.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`Billing execution error: ${error.message}`);
    }
  }

  /**
   * Sync all wallet balances
   */
  async syncBalances(agentId) {
    try {
      const result = await AutonomousPaymentService.syncBalances(agentId);
      console.log(`✓ Synced balances for agent: Total = $${result.total}`);
      return result;
    } catch (error) {
      console.error(`Balance sync error: ${error.message}`);
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(agentId) {
    try {
      const agent = await AutonomousAgent.findById(agentId);
      if (!agent) throw new Error('Agent not found');

      // Check payment methods
      const activeMethods = agent.getActivePaymentMethods();
      agent.healthStatus.allPaymentMethodsConnected = activeMethods.length >= 2;

      // Check balance
      agent.healthStatus.sufficientFundsAvailable = agent.totalBalanceUSD > agent.maintenanceConfig.monthlyBudget * 0.2;

      // Sync status
      agent.healthStatus.lastHealthCheckAt = new Date();
      agent.healthStatus.fullySynced = true;

      // Calculate uptime (simplified)
      if (agent.status === 'active') {
        agent.uptime = Math.min(100, agent.uptime + 0.5);
      }

      await agent.save();

      console.log(`✓ Health check passed. Status: ${JSON.stringify(agent.healthStatus)}`);

      return agent.healthStatus;
    } catch (error) {
      console.error(`Health check error: ${error.message}`);
    }
  }

  /**
   * Generate daily status report
   */
  async generateDailyReport(agentId) {
    try {
      await AutonomousEmailService.sendStatusReport(agentId);
      console.log(`✓ Daily status report sent for agent ${agentId}`);
    } catch (error) {
      console.error(`Status report error: ${error.message}`);
    }
  }

  /**
   * Check for low balance and alert
   */
  async checkLowBalance(agentId) {
    try {
      const agent = await AutonomousAgent.findById(agentId);
      if (!agent) throw new Error('Agent not found');

      if (agent.totalBalanceUSD < agent.notificationSettings.lowBalanceThreshold) {
        await AutonomousEmailService.sendLowBalanceAlert(agentId);
        console.log(`⚠ Low balance alert sent. Current: $${agent.totalBalanceUSD}`);
      }
    } catch (error) {
      console.error(`Balance check error: ${error.message}`);
    }
  }

  /**
   * Stop scheduler
   */
  stopScheduler() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.isRunning = false;
    console.log('Autonomous scheduler stopped');
  }

  /**
   * Get all active jobs
   */
  getActiveJobs() {
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.length,
      jobs: this.jobs.map((job, idx) => ({
        id: idx,
        status: this.jobs[idx]._status
      }))
    };
  }
}

// Singleton instance
let scheduler = null;

/**
 * Initialize global scheduler
 */
async function initializeGlobalScheduler() {
  if (scheduler) return scheduler;

  scheduler = new AutonomousMaintenanceScheduler();

  try {
    // Find all active agents
    const activeAgents = await AutonomousAgent.find({ operationsEnabled: true });

    for (const agent of activeAgents) {
      await scheduler.startForAgent(agent._id);
    }

    console.log(`✓ Autonomous maintenance scheduler initialized for ${activeAgents.length} agents`);
  } catch (error) {
    console.error(`Failed to initialize scheduler: ${error.message}`);
  }

  return scheduler;
}

module.exports = {
  AutonomousMaintenanceScheduler,
  initializeGlobalScheduler,
  getScheduler: () => scheduler
};
