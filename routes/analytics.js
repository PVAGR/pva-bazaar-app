const express = require('express');
const router = express.Router();
const Analytics = require('../backend/models/Analytics');

// POST /api/analytics/track - Track visitor data
router.post('/track', async (req, res) => {
  try {
    const visitorData = {
      ...req.body,
      ip: req.ip || req.connection.remoteAddress,
      headers: {
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        acceptLanguage: req.get('Accept-Language')
      }
    };
    
    const analytics = new Analytics({
      type: 'visitor',
      data: visitorData,
      timestamp: new Date()
    });
    
    await analytics.save();
    
    res.json({ ok: true, message: 'Visitor tracked successfully' });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({ ok: false, message: 'Failed to track visitor' });
  }
});

// POST /api/analytics/event - Track events (clicks, interactions)
router.post('/event', async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      ip: req.ip || req.connection.remoteAddress
    };
    
    const analytics = new Analytics({
      type: 'event',
      data: eventData,
      timestamp: new Date()
    });
    
    await analytics.save();
    
    res.json({ ok: true, message: 'Event tracked successfully' });
  } catch (error) {
    console.error('Event tracking error:', error);
    res.status(500).json({ ok: false, message: 'Failed to track event' });
  }
});

// GET /api/analytics/dashboard - Get analytics dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get visitors today
    const visitorsToday = await Analytics.countDocuments({
      type: 'visitor',
      timestamp: { $gte: yesterday }
    });
    
    // Get visitors this week
    const visitorsWeek = await Analytics.countDocuments({
      type: 'visitor',
      timestamp: { $gte: lastWeek }
    });
    
    // Get top events today
    const topEvents = await Analytics.aggregate([
      { 
        $match: { 
          type: 'event',
          timestamp: { $gte: yesterday }
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
    ]);
    
    // Get page views
    const pageViews = await Analytics.aggregate([
      { 
        $match: { 
          type: 'visitor',
          timestamp: { $gte: yesterday }
        }
      },
      { 
        $group: {
          _id: '$data.page',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      ok: true,
      data: {
        visitorsToday,
        visitorsWeek,
        topEvents,
        pageViews,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ ok: false, message: 'Failed to get analytics data' });
  }
});

// GET /api/analytics/daily-report - Generate daily report
router.get('/daily-report', async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    // Get all analytics for the day
    const visitors = await Analytics.find({
      type: 'visitor',
      timestamp: { $gte: startOfDay, $lt: endOfDay }
    });
    
    const events = await Analytics.find({
      type: 'event',
      timestamp: { $gte: startOfDay, $lt: endOfDay }
    });
    
    // Calculate metrics
    const uniqueVisitors = new Set(visitors.map(v => v.data.ip)).size;
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
      date: startOfDay.toISOString().split('T')[0],
      metrics: {
        uniqueVisitors,
        totalPageViews,
        totalEvents: events.length
      },
      eventBreakdown: eventCounts,
      topPages: Object.entries(topPages)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10),
      generatedAt: new Date()
    };
    
    res.json({ ok: true, report });
  } catch (error) {
    console.error('Daily report error:', error);
    res.status(500).json({ ok: false, message: 'Failed to generate daily report' });
  }
});

module.exports = router;