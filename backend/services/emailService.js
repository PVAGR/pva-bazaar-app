// backend/services/emailService.js - Email notifications
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.sendgrid.net';
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER || 'apikey';
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@pvabazaar.org';
const FROM_NAME = 'PVA Bazaar';

// Initialize transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

/**
 * Send welcome email
 */
async function sendWelcomeEmail(user) {
  const html = `
    <h1>Welcome to PVA Bazaar, ${user.name}!</h1>
    <p>Thank you for joining our global marketplace for authentic artifacts and artisan goods.</p>
    <p><a href="https://pvabazaar.org/dashboard">Get Started →</a></p>
  `;

  return send(user.email, 'Welcome to PVA Bazaar', html);
}

/**
 * Send order confirmation
 */
async function sendOrderConfirmation(order, buyer) {
  const html = `
    <h2>Order Confirmed</h2>
    <p>Order ID: ${order._id}</p>
    <p>Total: $${(order.amountTotal / 100).toFixed(2)}</p>
    <p><a href="https://pvabazaar.org/order/${order._id}">View Order →</a></p>
  `;

  return send(buyer.email, `Order #${order._id} Confirmed`, html);
}

/**
 * Send shipment tracking
 */
async function sendShipmentNotification(shipment, recipient) {
  const html = `
    <h2>Your Order is Shipping</h2>
    <p>Tracking: ${shipment.trackingNumber}</p>
    <p>Carrier: ${shipment.carrier}</p>
    <p>Estimated Delivery: ${new Date(shipment.estimatedDelivery).toDateString()}</p>
    <p><a href="https://pvabazaar.org/track/${shipment.trackingNumber}">Track Package →</a></p>
  `;

  return send(recipient.email, 'Your Package is on the Way', html);
}

/**
 * Send provenance submission approved
 */
async function sendProvenanceApproved(submission, creator) {
  const html = `
    <h2>Your Item Approved!</h2>
    <p>Item: ${submission.materialTruth.objectName}</p>
    <p>Authenticity Score: ${submission.completeness.overallScore.toFixed(0)}%</p>
    <p><a href="https://pvabazaar.org/provenance/${submission._id}/mint">Mint NFT →</a></p>
  `;

  return send(creator.email, 'Item Approved - Ready to Mint', html);
}

/**
 * Send seller review alert
 */
async function sendReviewAlert(review, seller) {
  const html = `
    <h2>New Review Received</h2>
    <p>Rating: ${'⭐'.repeat(review.rating)}</p>
    <p>"${review.comment}"</p>
    <p><a href="https://pvabazaar.org/reviews/${review._id}">View Review →</a></p>
  `;

  return send(seller.email, `New ${review.rating}⭐ Review`, html);
}

/**
 * Send message notification
 */
async function sendMessageNotification(message, recipient) {
  const html = `
    <h2>New Message</h2>
    <p>From: ${message.senderName}</p>
    <p>"${message.message.substring(0, 100)}..."</p>
    <p><a href="https://pvabazaar.org/messages/${message.conversationId}">View Message →</a></p>
  `;

  return send(recipient.email, `New Message from ${message.senderName}`, html);
}

/**
 * Seller performance digest
 */
async function sendSellerDigest(seller, analytics) {
  const html = `
    <h2>Your Weekly Performance</h2>
    <ul>
      <li>Sales: ${analytics.completedOrders}</li>
      <li>Revenue: $${(analytics.totalRevenue / 100).toFixed(2)}</li>
      <li>Conversion Rate: ${analytics.conversionRate.toFixed(2)}%</li>
      <li>Rating: ${analytics.avgRating.toFixed(1)}⭐</li>
    </ul>
    <p><a href="https://pvabazaar.org/dashboard">View Full Analytics →</a></p>
  `;

  return send(seller.email, 'Your Weekly Performance Summary', html);
}

/**
 * Generic email sender
 */
async function send(to, subject, html) {
  try {
    if (!SMTP_PASS) {
      console.warn('⚠️ Email sending disabled (SMTP_PASS not set)');
      return { ok: true, messageId: 'test-mode' };
    }

    const info = await transporter.sendMail({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
    });

    console.log(`📧 Email sent to ${to}:`, info.messageId);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Email send failed:', err);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  send,
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendShipmentNotification,
  sendProvenanceApproved,
  sendReviewAlert,
  sendMessageNotification,
  sendSellerDigest,
};
