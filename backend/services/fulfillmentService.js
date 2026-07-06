// backend/services/fulfillmentService.js - Order fulfillment and shipping orchestration
const FulfillmentCenter = require('../models/FulfillmentCenter');
const InventoryLocation = require('../models/InventoryLocation');
const ShipmentTracking = require('../models/ShipmentTracking');
const ShippingRate = require('../models/ShippingRate');
const Order = require('../models/Order');

/**
 * Find best fulfillment center for order (closest to destination)
 */
async function selectFulfillmentCenter(destinationCountry, destinationCity, sellerId) {
  // Priority: 1) Same country, 2) Nearby, 3) Default
  const centers = await FulfillmentCenter.find({
    active: true,
    'address.country': destinationCountry,
  }).sort({ 'metrics.orderAccuracy': -1 });

  if (centers.length > 0) {
    return centers[0];
  }

  // Fallback to any active center with inventory
  const anywhere = await FulfillmentCenter.findOne({ active: true }).sort({
    'metrics.orderAccuracy': -1,
  });

  return anywhere;
}

/**
 * Reserve inventory for an order
 */
async function reserveInventory(productId, quantity, fulfillmentCenterId) {
  const inventory = await InventoryLocation.findOne({
    productId,
    fulfillmentCenterId,
    active: true,
  });

  if (!inventory || inventory.availableQty < quantity) {
    throw new Error('Insufficient inventory at selected location');
  }

  inventory.qtyReserved += quantity;
  await inventory.save();

  return { reservedQty: quantity, location: inventory.binLocation };
}

/**
 * Calculate shipping cost
 */
async function calculateShippingCost(
  destinationCountry,
  weight,
  shippingMethod = 'standard',
  insuranceValue = 0,
) {
  const rate = await ShippingRate.findOne({
    destinationCountry,
    shippingMethod,
    weightMin: { $lte: weight },
    weightMax: { $gte: weight },
    available: true,
  });

  if (!rate) {
    throw new Error('Shipping not available for this route');
  }

  let cost = rate.baseCost + weight * (rate.perKgCost || 0) + (rate.handlingFee || 0);

  // Add insurance
  if (insuranceValue > 0) {
    cost += (insuranceValue / 10000) * (rate.insuranceCost || 50);
  }

  // Apply surcharges
  if (rate.surcharges) {
    rate.surcharges.forEach((surcharge) => {
      cost *= 1 + surcharge.percentage / 100;
    });
  }

  return {
    cost: Math.round(cost),
    carrier: rate.carrier,
    estimatedDelivery: rate.estimatedDaysMin,
    insuranceIncluded: insuranceValue > 0,
  };
}

/**
 * Create shipment for order
 */
async function createShipment(orderId, fulfillmentCenterId, shippingDetails) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  const shipment = new ShipmentTracking({
    orderId,
    fulfillmentCenterId,
    sellerId: order.sellerId,
    buyerId: order.buyerId,
    carrier: shippingDetails.carrier || 'dhl',
    shippingAddress: shippingDetails.address,
    shippingMethod: shippingDetails.method || 'standard',
    shippingCost: shippingDetails.cost,
    estimatedDelivery: shippingDetails.estimatedDelivery,
    status: 'label_created',
  });

  await shipment.save();

  // Update order
  await Order.findByIdAndUpdate(orderId, {
    shipmentId: shipment._id,
    fulfillmentStatus: 'pending_shipment',
  });

  return shipment;
}

/**
 * Update shipment status from carrier
 */
async function updateShipmentStatus(trackingNumber, newStatus, location, message = null) {
  const shipment = await ShipmentTracking.findOne({ trackingNumber });
  if (!shipment) throw new Error('Shipment not found');

  shipment.status = newStatus;
  shipment.events.push({
    timestamp: new Date(),
    status: newStatus,
    location,
    message,
  });

  if (newStatus === 'delivered') {
    shipment.actualDelivery = new Date();
  }

  await shipment.save();

  // Update order status
  if (newStatus === 'delivered') {
    await Order.findByIdAndUpdate(shipment.orderId, {
      fulfillmentStatus: 'delivered',
      deliveredAt: new Date(),
    });
  }

  return shipment;
}

/**
 * Initiate return process
 */
async function initiateReturn(orderId, reason) {
  const shipment = await ShipmentTracking.findOne({ orderId });
  if (!shipment) throw new Error('Shipment not found');

  // Generate return label
  const returnLabel = `RMA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  shipment.returnReason = reason;
  shipment.returnTracking = returnLabel;
  shipment.returnStatus = 'initiated';

  await shipment.save();

  // Update order
  await Order.findByIdAndUpdate(orderId, {
    returnStatus: 'initiated',
    returnReason: reason,
  });

  return {
    returnLabel,
    returnTracking: returnLabel,
    instructions: 'Print this label and drop off at carrier location',
  };
}

/**
 * Process received return
 */
async function processReturn(returnTracking, inspection = {}) {
  const shipment = await ShipmentTracking.findOne({ returnTracking });
  if (!shipment) throw new Error('Return not found');

  shipment.returnStatus = 'received';
  shipment.returnedAt = new Date();

  // Log inspection results
  if (inspection.damageFound) {
    shipment.events.push({
      timestamp: new Date(),
      status: 'return_inspected',
      message: `Damage found: ${inspection.damageDescription}`,
    });
  } else {
    shipment.events.push({
      timestamp: new Date(),
      status: 'return_inspected',
      message: 'Return inspected - acceptable condition',
    });
  }

  await shipment.save();

  // Update order
  const order = await Order.findById(shipment.orderId);
  if (inspection.damageFound) {
    order.returnStatus = 'rejected';
    order.returnRejectionReason = inspection.damageDescription;
  } else {
    order.returnStatus = 'approved';
  }
  await order.save();

  return shipment;
}

/**
 * Get shipping rates for a destination
 */
async function getShippingRates(destinationCountry, weight, insuranceValue = 0) {
  const rates = await ShippingRate.find({
    destinationCountry,
    available: true,
    weightMin: { $lte: weight },
    weightMax: { $gte: weight },
  }).sort({ totalCost: 1 });

  const options = rates.map((r) => ({
    carrier: r.carrier,
    method: r.shippingMethod,
    cost: r.baseCost + weight * (r.perKgCost || 0) + (r.handlingFee || 0),
    estimatedDays: `${r.estimatedDaysMin}-${r.estimatedDaysMax}`,
  }));

  return options;
}

module.exports = {
  selectFulfillmentCenter,
  reserveInventory,
  calculateShippingCost,
  createShipment,
  updateShipmentStatus,
  initiateReturn,
  processReturn,
  getShippingRates,
};
