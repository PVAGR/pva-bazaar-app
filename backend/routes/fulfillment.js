// backend/routes/fulfillment.js - Global fulfillment and shipping operations
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const fulfillmentService = require('../services/fulfillmentService');
const Order = require('../models/Order');
const ShipmentTracking = require('../models/ShipmentTracking');
const InventoryLocation = require('../models/InventoryLocation');

/**
 * Select best fulfillment center for order
 * POST /api/fulfillment/select-center
 */
router.post('/select-center', authenticateToken, async (req, res) => {
  try {
    const { destinationCountry, destinationCity, sellerId } = req.body;

    if (!destinationCountry) {
      return res.status(400).json({ error: 'destinationCountry required' });
    }

    const center = await fulfillmentService.selectFulfillmentCenter(
      destinationCountry,
      destinationCity,
      sellerId
    );

    if (!center) {
      return res.status(404).json({ error: 'No fulfillment center available for this region' });
    }

    res.json(center);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reserve inventory for an order
 * POST /api/fulfillment/reserve-inventory
 */
router.post('/reserve-inventory', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity, fulfillmentCenterId } = req.body;

    if (!productId || !quantity || !fulfillmentCenterId) {
      return res.status(400).json({ error: 'productId, quantity, fulfillmentCenterId required' });
    }

    const reservation = await fulfillmentService.reserveInventory(
      productId,
      quantity,
      fulfillmentCenterId
    );

    res.json(reservation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Calculate shipping cost for order
 * POST /api/fulfillment/calculate-shipping
 */
router.post('/calculate-shipping', async (req, res) => {
  try {
    const { destinationCountry, weight, shippingMethod = 'standard', insuranceValue = 0 } = req.body;

    if (!destinationCountry || !weight) {
      return res.status(400).json({ error: 'destinationCountry and weight required' });
    }

    const shippingCost = await fulfillmentService.calculateShippingCost(
      destinationCountry,
      weight,
      shippingMethod,
      insuranceValue
    );

    res.json(shippingCost);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create shipment for order
 * POST /api/fulfillment/create-shipment
 */
router.post('/create-shipment', authenticateToken, async (req, res) => {
  try {
    const { orderId, fulfillmentCenterId, shippingDetails } = req.body;

    if (!orderId || !fulfillmentCenterId || !shippingDetails) {
      return res.status(400).json({ error: 'orderId, fulfillmentCenterId, shippingDetails required' });
    }

    const shipment = await fulfillmentService.createShipment(
      orderId,
      fulfillmentCenterId,
      shippingDetails
    );

    res.status(201).json(shipment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get real-time shipment tracking
 * GET /api/fulfillment/track-shipment/:trackingNumber
 */
router.get('/track-shipment/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const shipment = await ShipmentTracking.findOne({ trackingNumber })
      .populate('orderId', 'orderNumber total')
      .populate('fulfillmentCenterId', 'name address');

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    res.json(shipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update shipment status from carrier webhook
 * POST /api/fulfillment/update-shipment-status
 */
router.post('/update-shipment-status', async (req, res) => {
  try {
    const { trackingNumber, newStatus, location, message } = req.body;

    if (!trackingNumber || !newStatus) {
      return res.status(400).json({ error: 'trackingNumber and newStatus required' });
    }

    const updated = await fulfillmentService.updateShipmentStatus(
      trackingNumber,
      newStatus,
      location,
      message
    );

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Initiate return process
 * POST /api/fulfillment/initiate-return
 */
router.post('/initiate-return', authenticateToken, async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    if (!orderId || !reason) {
      return res.status(400).json({ error: 'orderId and reason required' });
    }

    const returnInfo = await fulfillmentService.initiateReturn(orderId, reason);

    res.json(returnInfo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Process received return (inspection, refund decision)
 * POST /api/fulfillment/process-return
 */
router.post('/process-return', authenticateToken, async (req, res) => {
  try {
    const { returnTracking, inspection = {} } = req.body;

    if (!returnTracking) {
      return res.status(400).json({ error: 'returnTracking required' });
    }

    const result = await fulfillmentService.processReturn(returnTracking, inspection);

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get available shipping rates for destination
 * POST /api/fulfillment/shipping-rates
 */
router.post('/shipping-rates', async (req, res) => {
  try {
    const { destinationCountry, weight, insuranceValue = 0 } = req.body;

    if (!destinationCountry || !weight) {
      return res.status(400).json({ error: 'destinationCountry and weight required' });
    }

    const rates = await fulfillmentService.getShippingRates(
      destinationCountry,
      weight,
      insuranceValue
    );

    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get inventory status across fulfillment centers
 * GET /api/fulfillment/inventory-status/:productId
 */
router.get('/inventory-status/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    const inventory = await InventoryLocation.find({ productId })
      .populate('fulfillmentCenterId', 'name code address country');

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
