const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { authenticateToken } = require('../middleware/auth');

// GET /api/sales/metrics - Get seller's sales metrics
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday

    // Get all sales where user is the creator/seller
    const allSales = await Order.find({
      'attribution.creatorId': req.user.id,
      paymentStatus: 'paid' // Only count paid orders
    }).lean();

    // Sales this month
    const thisMonthSales = await Order.find({
      'attribution.creatorId': req.user.id,
      paymentStatus: 'paid',
      createdAt: { $gte: startOfMonth }
    }).lean();

    // Sales thisweek
    const thisWeekSales = await Order.find({
      'attribution.creatorId': req.user.id,
      paymentStatus: 'paid',
      createdAt: { $gte: startOfWeek }
    }).lean();

    // Calculate totals in cents, convert to dollars
    const calculateTotal = (orders) => {
      return orders.reduce((sum, order) => sum + (order.amountTotal || 0), 0) / 100;
    };

    const metrics = {
      totalSales: calculateTotal(allSales),
      thisMonth: calculateTotal(thisMonthSales),
      thisWeek: calculateTotal(thisWeekSales),
      totalOrders: allSales.length,
      thisMonthOrders: thisMonthSales.length,
      thisWeekOrders: thisWeekSales.length,
    };

    return res.json({ ok: true, ...metrics });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
