// backend/services/paymentService.js - Payment processing
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');
const crypto = require('crypto');

/**
 * Create payment intent
 */
async function createPaymentIntent(orderId, amount, currency = 'usd', metadata = {}) {
  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        orderId: orderId.toString(),
        ...metadata,
      },
      description: `Order: ${orderId}`,
    });

    return {
      ok: true,
      clientSecret: intent.client_secret,
      intentId: intent.id,
    };
  } catch (err) {
    console.error('❌ Payment intent creation failed:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Confirm payment
 */
async function confirmPayment(paymentIntentId) {
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status === 'succeeded') {
      return { ok: true, status: 'succeeded' };
    } else if (intent.status === 'processing') {
      return { ok: true, status: 'processing' };
    } else if (intent.status === 'requires_payment_method') {
      return { ok: false, error: 'Payment method required' };
    } else {
      return { ok: false, error: `Payment status: ${intent.status}` };
    }
  } catch (err) {
    console.error('❌ Payment confirmation failed:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Refund payment
 */
async function refundPayment(paymentIntentId, amount = null) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    return {
      ok: true,
      refundId: refund.id,
      amount: refund.amount / 100,
    };
  } catch (err) {
    console.error('❌ Refund failed:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Handle Stripe webhook
 */ async function handleWebhook(event) {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const payment = event.data.object;
        console.log(`✅ Payment succeeded: ${payment.id}`);
        return { ok: true, action: 'payment_succeeded', data: payment };

      case 'payment_intent.payment_failed':
        const failed = event.data.object;
        console.log(`❌ Payment failed: ${failed.id}`);
        return { ok: false, action: 'payment_failed', data: failed };

      case 'charge.refunded':
        const refunded = event.data.object;
        console.log(`↩️ Charge refunded: ${refunded.id}`);
        return { ok: true, action: 'charge_refunded', data: refunded };

      default:
        return { ok: true, action: 'unknown', data: event };
    }
  } catch (err) {
    console.error('❌ Webhook handling failed:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Generate idempotency key (prevent duplicate charges)
 */
function generateIdempotencyKey(orderId, userId) {
  return crypto.createHash('sha256').update(`${orderId}-${userId}-${Date.now()}`).digest('hex');
}

/**
 * Create order record
 */
async function createOrder(userId, items, shippingCost, totalAmount) {
  const Order = require('../models/Order');

  const order = new Order({
    buyerId: userId,
    items,
    shippingCost,
    amountSubtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    amountShipping: shippingCost,
    amountTotal: totalAmount,
    paymentStatus: 'pending',
    fulfillmentStatus: 'pending',
  });

  await order.save();
  return order;
}

/**
 * Update payment status
 */
async function updatePaymentStatus(orderId, status, paymentId) {
  const Order = require('../models/Order');

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      paymentStatus: status,
      stripePaymentId: paymentId,
      paidAt: status === 'paid' ? new Date() : null,
    },
    { new: true },
  );

  return order;
}

module.exports = {
  createPaymentIntent,
  confirmPayment,
  refundPayment,
  handleWebhook,
  generateIdempotencyKey,
  createOrder,
  updatePaymentStatus,
};
