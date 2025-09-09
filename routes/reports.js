const express = require('express');
const router = express.Router();
const Analytics = require('../backend/models/Analytics');
const Artifact = require('../backend/models/Artifact');
const User = require('../backend/models/user');

// GET /api/reports/daily - Generate comprehensive daily report
router.get('/daily', async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    // Website Analytics
    const visitors = await Analytics.find({
      type: 'visitor',
      timestamp: { $gte: startOfDay, $lt: endOfDay }
    });
    
    const events = await Analytics.find({
      type: 'event',
      timestamp: { $gte: startOfDay, $lt: endOfDay }
    });
    
    const apiCalls = await Analytics.find({
      type: 'api_call',
      timestamp: { $gte: startOfDay, $lt: endOfDay }
    });
    
    // User Activity
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    });
    
    const newArtifacts = await Artifact.countDocuments({
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    });
    
    // Blockchain Activity
    const blockchainEvents = await Analytics.find({
      type: 'blockchain_interaction',
      timestamp: { $gte: startOfDay, $lt: endOfDay }
    });
    
    // Calculate metrics
    const uniqueVisitors = new Set(visitors.map(v => v.data.ip || v.ip)).size;
    const totalPageViews = visitors.length;
    
    const eventCounts = events.reduce((acc, event) => {
      const eventName = event.data.event;
      acc[eventName] = (acc[eventName] || 0) + 1;
      return acc;
    }, {});
    
    const topPages = visitors.reduce((acc, visitor) => {
      const page = visitor.data.page || '/';
      acc[page] = (acc[page] || 0) + 1;
      return acc;
    }, {});
    
    const report = {
      reportDate: startOfDay.toISOString().split('T')[0],
      websiteMetrics: {
        uniqueVisitors,
        totalPageViews,
        totalEvents: events.length,
        totalApiCalls: apiCalls.length,
        topEvents: Object.entries(eventCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        topPages: Object.entries(topPages)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
      },
      userActivity: {
        newUsers,
        totalUsers: await User.countDocuments()
      },
      artifactActivity: {
        newArtifacts,
        totalArtifacts: await Artifact.countDocuments(),
        totalValue: await Artifact.aggregate([
          { $group: { _id: null, total: { $sum: '$price' } } }
        ]).then(result => result[0]?.total || 0)
      },
      blockchainActivity: {
        totalInteractions: blockchainEvents.length,
        nftsMinted: await Artifact.countDocuments({
          'blockchainDetails.contractAddress': { $exists: true, $ne: null },
          createdAt: { $gte: startOfDay, $lt: endOfDay }
        })
      },
      systemHealth: {
        status: 'operational',
        uptime: Math.floor(process.uptime() / 3600),
        memoryUsage: process.memoryUsage(),
        lastUpdated: new Date()
      },
      generatedAt: new Date()
    };
    
    res.json({ ok: true, report });
  } catch (error) {
    console.error('Daily report error:', error);
    res.status(500).json({ ok: false, message: 'Failed to generate daily report' });
  }
});

// GET /api/reports/weekly - Generate weekly summary
router.get('/weekly', async (req, res) => {
  try {
    const endDate = req.query.date ? new Date(req.query.date) : new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyStats = {
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      visitors: {
        total: await Analytics.countDocuments({
          type: 'visitor',
          timestamp: { $gte: startDate, $lt: endDate }
        }),
        unique: await Analytics.distinct('data.ip', {
          type: 'visitor',
          timestamp: { $gte: startDate, $lt: endDate }
        }).then(ips => ips.length)
      },
      newUsers: await User.countDocuments({
        createdAt: { $gte: startDate, $lt: endDate }
      }),
      newArtifacts: await Artifact.countDocuments({
        createdAt: { $gte: startDate, $lt: endDate }
      }),
      topEvents: await Analytics.aggregate([
        { 
          $match: { 
            type: 'event',
            timestamp: { $gte: startDate, $lt: endDate }
          }
        },
        { 
          $group: {
            _id: '$data.event',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      generatedAt: new Date()
    };
    
    res.json({ ok: true, report: weeklyStats });
  } catch (error) {
    console.error('Weekly report error:', error);
    res.status(500).json({ ok: false, message: 'Failed to generate weekly report' });
  }
});

// POST /api/reports/send-daily - Send daily report (placeholder for email/webhook)
router.post('/send-daily', async (req, res) => {
  try {
    // Get today's report
    const reportResponse = await fetch(`${req.protocol}://${req.get('host')}/api/reports/daily`);
    const reportData = await reportResponse.json();
    
    if (!reportData.ok) {
      throw new Error('Failed to generate report');
    }
    
    const report = reportData.report;
    
    // Format report for sending (email, webhook, etc.)
    const formattedReport = `
PVA Bazaar Daily Report - ${report.reportDate}
===============================================

📊 WEBSITE METRICS
• Unique Visitors: ${report.websiteMetrics.uniqueVisitors}
• Total Page Views: ${report.websiteMetrics.totalPageViews}
• Total Events: ${report.websiteMetrics.totalEvents}
• API Calls: ${report.websiteMetrics.totalApiCalls}

👥 USER ACTIVITY
• New Users: ${report.userActivity.newUsers}
• Total Users: ${report.userActivity.totalUsers}

🎨 ARTIFACT ACTIVITY
• New Artifacts: ${report.artifactActivity.newArtifacts}
• Total Artifacts: ${report.artifactActivity.totalArtifacts}
• Total Portfolio Value: $${report.artifactActivity.totalValue}

⛓️ BLOCKCHAIN ACTIVITY
• Blockchain Interactions: ${report.blockchainActivity.totalInteractions}
• NFTs Minted Today: ${report.blockchainActivity.nftsMinted}

🔧 SYSTEM HEALTH
• Status: ${report.systemHealth.status}
• Uptime: ${report.systemHealth.uptime} hours

📈 TOP PAGES
${report.websiteMetrics.topPages.map(([page, count]) => `• ${page}: ${count} views`).join('\n')}

🎯 TOP EVENTS
${report.websiteMetrics.topEvents.map(([event, count]) => `• ${event}: ${count} times`).join('\n')}

Generated at: ${new Date().toISOString()}
    `;
    
    // Here you would integrate with email service (SendGrid, etc.) or webhook
    console.log('Daily Report Generated:');
    console.log(formattedReport);
    
    // Log the report generation
    const analytics = new Analytics({
      type: 'api_call',
      data: {
        endpoint: '/api/reports/send-daily',
        reportDate: report.reportDate,
        metrics: {
          uniqueVisitors: report.websiteMetrics.uniqueVisitors,
          newUsers: report.userActivity.newUsers,
          newArtifacts: report.artifactActivity.newArtifacts
        }
      }
    });
    await analytics.save();
    
    res.json({ 
      ok: true, 
      message: 'Daily report sent successfully',
      preview: formattedReport.substring(0, 500) + '...'
    });
  } catch (error) {
    console.error('Send daily report error:', error);
    res.status(500).json({ ok: false, message: 'Failed to send daily report' });
  }
});

module.exports = router;