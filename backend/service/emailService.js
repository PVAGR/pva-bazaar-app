// backend/service/emailService.js
// Email service for PVABazaar consignment notifications

const nodemailer = require('nodemailer');

// Initialize transporter (will be created lazily on first use)
let transporter = null;

function getTransporter() {
  if (!transporter) {
    // Check if email is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️ Email service not configured: SMTP_USER and SMTP_PASS must be set');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Add timeout for serverless environments
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  return transporter;
}

/**
 * Send consignment confirmation email to user
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {Object} options.itemData - Item/Artifact data
 * @param {string} options.status - Item status (pending_review, approved, rejected)
 * @returns {Promise<void>}
 */
async function sendConsignmentEmail({ to, subject, itemData, status }) {
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn('⚠️ Email service not configured, skipping email send');
    return;
  }

  // Format item data
  const itemName = itemData.title || itemData.name || 'Your Item';
  const itemPrice = itemData.price ? `$${Number(itemData.price).toFixed(2)}` : 'TBD';
  const itemId = itemData._id || itemData.id || 'N/A';
  const itemCategory = itemData.category || 'Uncategorized';

  // Status messages
  const statusMessages = {
    pending_review: 'Your item is pending review by our team. We will notify you once it has been reviewed.',
    approved: 'Congratulations! Your item has been approved and is now live on the marketplace.',
    rejected: 'Unfortunately, your item did not meet our requirements. Please review our guidelines and try again.',
    draft: 'Your item has been saved as a draft. Complete your registration to submit for review.',
  };

  const statusMessage = statusMessages[status] || statusMessages.pending_review;

  // HTML email template
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 28px;">🔮 PVABazaar</h1>
        <p style="color: #fff; margin: 10px 0 0 0; opacity: 0.9;">Consignment Services</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #667eea; margin-top: 0;">${subject}</h2>
        
        <div style="background: #fff; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #667eea;">
          <p style="margin: 0 0 10px 0;"><strong>Item:</strong> ${itemName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Category:</strong> ${itemCategory}</p>
          <p style="margin: 0 0 10px 0;"><strong>Price:</strong> ${itemPrice}</p>
          <p style="margin: 0 0 10px 0;"><strong>Item ID:</strong> ${itemId}</p>
          <p style="margin: 0;"><strong>Status:</strong> <span style="text-transform: capitalize;">${status.replace('_', ' ')}</span></p>
        </div>
        
        <p style="margin: 20px 0;">${statusMessage}</p>
        
        ${status === 'pending_review' ? `
        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>⏳ What's Next?</strong></p>
          <ul style="margin: 10px 0 0 20px; color: #856404;">
            <li>Our team will review your item within 1-2 business days</li>
            <li>You'll receive an email notification when the review is complete</li>
            <li>If approved, your item will go live on the marketplace</li>
          </ul>
        </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated message from <strong>consign@pvabazaar.org</strong><br>
            Please do not reply to this email.
          </p>
          <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">
            <a href="https://pvabazaar.org" style="color: #667eea;">Visit PVABazaar</a> | 
            <a href="https://pvabazaar.org/support" style="color: #667eea;">Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Plain text version
  const text = `
PVABazaar Consignment

${subject}

Item: ${itemName}
Category: ${itemCategory}
Price: ${itemPrice}
Item ID: ${itemId}
Status: ${status.replace('_', ' ')}

${statusMessage}

${status === 'pending_review' ? `
What's Next?
- Our team will review your item within 1-2 business days
- You'll receive an email notification when the review is complete
- If approved, your item will go live on the marketplace
` : ''}

---
This is an automated message from consign@pvabazaar.org
Please do not reply to this email.
Visit https://pvabazaar.org for more information.
  `.trim();

  try {
    const info = await emailTransporter.sendMail({
      from: `"PVABazaar Consignment" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}

/**
 * Send admin notification for new item registration
 * @param {Object} options - Email options
 * @param {string} options.itemData - Item/Artifact data
 * @param {string} options.userEmail - User's email who registered the item
 * @returns {Promise<void>}
 */
async function sendAdminNotification({ itemData, userEmail }) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  const emailTransporter = getTransporter();
  
  if (!adminEmail || !emailTransporter) {
    console.warn('⚠️ ADMIN_EMAIL/SMTP not configured, skipping admin notification');
    return;
  }

  const itemName = itemData.title || itemData.name || 'New Item';
  const itemPrice = itemData.price ? `$${Number(itemData.price).toFixed(2)}` : 'TBD';
  const itemId = itemData._id || itemData.id || 'N/A';

  try {
    await emailTransporter.sendMail({
      from: `"PVABazaar Consignment" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `New Item Registration: ${itemName}`,
      text: [
        'New item is pending review:',
        `Item: ${itemName}`,
        `Price: ${itemPrice}`,
        `Category: ${itemData.category || 'Uncategorized'}`,
        `Registered by: ${userEmail || 'unknown'}`,
        `Item ID: ${itemId}`,
      ].join('\n'),
    });
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    // Don't throw - admin notification failure shouldn't break user flow
  }
}

/**
 * Send post-purchase fulfillment confirmation with download link and Certificate of Authenticity.
 * Resilient: if email fails, we log and do not fail the webhook (order is already paid).
 */
async function sendFulfillmentConfirmationEmail({ to, orderId, downloadToken, itemName, certificateId, publicSiteUrl }) {
  const emailTransporter = getTransporter();
  if (!emailTransporter) {
    console.warn('⚠️ Email not configured, skipping fulfillment confirmation');
    return;
  }
  const downloadUrl = `${publicSiteUrl.replace(/\/$/, '')}/#/checkout/download?order_id=${encodeURIComponent(orderId)}&token=${encodeURIComponent(downloadToken)}`;
  const certUrl = certificateId
    ? `${publicSiteUrl.replace(/\/$/, '')}/api/verification/certificate/${encodeURIComponent(certificateId)}`
    : null;
  const subject = `Your purchase: ${itemName || 'Artifact'} — Download & Certificate`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>${subject}</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #0c0d0f; color: #d4af37; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">PVA Bazaar</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Fulfillment confirmation</p>
      </div>
      <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #0f5132; margin-top: 0;">Thank you for your purchase</h2>
        <p>Your order has been confirmed. Below are your digital access and certificate.</p>
        <div style="background: #fff; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #228b22;">
          <p style="margin: 0 0 8px 0;"><strong>Digital download</strong></p>
          <p style="margin: 0;"><a href="${downloadUrl}" style="color: #0077ff;">Access your download</a></p>
        </div>
        ${certUrl ? `
        <div style="background: #fff; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #d4af37;">
          <p style="margin: 0 0 8px 0;"><strong>Certificate of Authenticity</strong></p>
          <p style="margin: 0;"><a href="${certUrl}" style="color: #0077ff;">View certificate</a></p>
        </div>
        ` : ''}
        <p style="font-size: 14px; color: #666;">If you ordered a physical disc, it will be prepared and shipped separately. You will receive tracking when it ships.</p>
        <p style="font-size: 12px; color: #999;">Order reference: ${orderId}</p>
      </div>
    </body>
    </html>
  `;
  try {
    await emailTransporter.sendMail({
      from: `"PVA Bazaar" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: `Thank you for your purchase. Digital download: ${downloadUrl}. ${certUrl ? `Certificate: ${certUrl}.` : ''} Order: ${orderId}`,
    });
  } catch (error) {
    console.error('❌ Fulfillment confirmation email failed:', error);
    throw error;
  }
}

/**
 * Notify user gracefully when payment fails (no hidden traps).
 */
async function sendPaymentFailedEmail({ to, itemName, publicSiteUrl }) {
  const emailTransporter = getTransporter();
  if (!emailTransporter || !to) return;
  const subject = `Payment did not complete — ${itemName || 'PVA Bazaar'}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>${subject}</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f9f9f9; padding: 24px; border-radius: 8px;">
        <h2 style="color: #333;">Payment did not complete</h2>
        <p>Your payment could not be processed. Your card was not charged.</p>
        <p>You can try again from the <a href="${publicSiteUrl}">marketplace</a> when ready.</p>
        <p style="font-size: 12px; color: #666;">If this was unexpected, please use a different payment method or contact support.</p>
      </div>
    </body>
    </html>
  `;
  try {
    await emailTransporter.sendMail({
      from: `"PVA Bazaar" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: `Payment did not complete. You can try again at ${publicSiteUrl}.`,
    });
  } catch (error) {
    console.error('Payment failed email error:', error);
  }
}

/**
 * Send deal initiation email to counterparty
 * Notifies counterparty of a deal someone wants to engage in
 */
async function sendDealInitiationEmail({ to, sellerName, sellerEmail, dealId, amount, currency, description, joinUrl }) {
  const emailTransporter = getTransporter();
  if (!emailTransporter || !to) {
    console.warn('⚠️ Email not configured, skipping deal initiation email');
    return;
  }

  const subject = `Deal Invitation: ${description || 'Custom Order'} – ${amount} ${currency}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">🔮 Deal Opportunity</h1>
        <p style="color: #e0e7ff; margin: 10px 0 0 0;">PVA Bazaar</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
        <h2 style="color: #1e3a8a; margin-top: 0; font-size: 20px;">Hi there!</h2>
        
        <p style="font-size: 16px; margin: 0 0 20px 0;">
          <strong>${sellerName}</strong> would like to engage in a deal with you.
        </p>
        
        <div style="background: #fff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <p style="margin: 0 0 10px 0;"><strong>Deal Details:</strong></p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Description:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${description || 'Custom order'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Amount:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #16a34a; font-size: 18px; font-weight: bold;">${currency} ${amount}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #1e40af;"><strong>Next Steps:</strong></p>
          <ol style="margin: 10px 0 0 20px; color: #1e40af;">
            <li>Review the deal details</li>
            <li>Accept the deal and provide payment information (crypto wallet, etc.)</li>
            <li>Both parties will confirm via mock payment</li>
            <li>Execute the real transaction on blockchain</li>
          </ol>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${joinUrl}" style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            View Deal
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 24px;">
          Seller contact: <a href="mailto:${sellerEmail}" style="color: #3b82f6;">${sellerEmail}</a>
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated message from PVA Bazaar. Please do not reply to this email.
          </p>
          <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">
            <a href="https://pvabazaar.org" style="color: #3b82f6;">Visit PVA Bazaar</a> | 
            <a href="https://pvabazaar.org/support" style="color: #3b82f6;">Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await emailTransporter.sendMail({
      from: `"PVA Bazaar Deals" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: `Deal Invitation from ${sellerName}: ${description} (${currency} ${amount}). View at: ${joinUrl}`,
    });
  } catch (error) {
    console.error('❌ Deal initiation email failed:', error);
    throw error;
  }
}

/**
 * Send deal acceptance email to seller
 * Notifies seller that counterparty accepted and provided payment info
 */
async function sendDealAcceptanceEmail({ to, sellerName, buyerName, buyerEmail, dealId, amount, currency, walletAddress, paymentMethod, additionalInfo }) {
  const emailTransporter = getTransporter();
  if (!emailTransporter || !to) {
    console.warn('⚠️ Email not configured, skipping acceptance email');
    return;
  }

  const subject = `Deal Accepted: ${currency} ${amount} – Ready for Mock Confirmation`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">✅ Deal Accepted!</h1>
        <p style="color: #dcfce7; margin: 10px 0 0 0;">PVA Bazaar</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
        <h2 style="color: #16a34a; margin-top: 0;">Hi ${sellerName},</h2>
        
        <p style="font-size: 16px;">Good news! <strong>${buyerName}</strong> has accepted your deal and provided payment information.</p>
        
        <div style="background: #fff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #22c55e; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <p style="margin: 0 0 10px 0;"><strong>Buyer Information:</strong></p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Name:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${buyerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Email:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;"><a href="mailto:${buyerEmail}" style="color: #22c55e;">${buyerEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Payment Method:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${paymentMethod}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Wallet/Info:</strong></td>
              <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${walletAddress || 'Provided'}</td>
            </tr>
          </table>
          ${additionalInfo ? `<p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 14px;">Additional info: ${additionalInfo}</p>` : ''}
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;"><strong>Next Step:</strong> Both parties will now confirm the mock payment. Once confirmed, you'll receive order confirmation emails.</p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 24px;">
          Deal Amount: <strong>${currency} ${amount}</strong>
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated message from PVA Bazaar. Please do not reply to this email.
          </p>
          <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">
            <a href="https://pvabazaar.org" style="color: #22c55e;">Visit PVA Bazaar</a> | 
            <a href="https://pvabazaar.org/support" style="color: #22c55e;">Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await emailTransporter.sendMail({
      from: `"PVA Bazaar Deals" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: `Deal Accepted by ${buyerName} (${buyerEmail}). Payment method: ${paymentMethod}. Amount: ${currency} ${amount}. Ready for mock confirmation.`,
    });
  } catch (error) {
    console.error('❌ Deal acceptance email failed:', error);
    throw error;
  }
}

/**
 * Send mock confirmation email to both parties
 * Simulates order completion with confirmation receipt
 */
async function sendMockConfirmationEmail({ to, recipientName, dealId, amount, currency, description, isComplete }) {
  const emailTransporter = getTransporter();
  if (!emailTransporter || !to) {
    console.warn('⚠️ Email not configured, skipping mock confirmation email');
    return;
  }

  const subject = `Order Confirmation: ${currency} ${amount} – ${description}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">🎉 Order Confirmed</h1>
        <p style="color: #ccfbf1; margin: 10px 0 0 0;">Mock Payment Completed</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f766e; margin-top: 0;">Hi ${recipientName},</h2>
        
        <p style="font-size: 16px;">Thank you for completing this deal! Your order has been confirmed with a mock payment.</p>
        
        <div style="background: #fff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #14b8a6; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <p style="margin: 0 0 10px 0;"><strong>Order Receipt:</strong></p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Item:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${description}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Amount:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f766e;">${currency} ${amount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Status:</strong></td>
              <td style="padding: 8px 0; text-align: right;">
                <span style="background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  ${isComplete ? 'CONFIRMED' : 'PENDING'}
                </span>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #166534;"><strong>What happens next:</strong></p>
          <ul style="margin: 10px 0 0 20px; color: #166534;">
            <li>Both parties have confirmed the mock payment</li>
            <li>You will now execute the legitimate blockchain transaction</li>
            <li>Funds will be held in escrow until delivery/receipt</li>
            <li>All transactions are tracked and verified on-chain</li>
          </ul>
        </div>
        
        <p style="font-size: 12px; color: #666; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <strong>Reference ID:</strong> ${dealId}
        </p>
        
        <div style="margin-top: 24px; text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated order confirmation from PVA Bazaar.
          </p>
          <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">
            <a href="https://pvabazaar.org" style="color: #14b8a6;">Visit PVA Bazaar</a> | 
            <a href="https://pvabazaar.org/support" style="color: #14b8a6;">Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await emailTransporter.sendMail({
      from: `"PVA Bazaar Orders" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: `Order Confirmation: ${description} (${currency} ${amount}). Status: ${isComplete ? 'CONFIRMED' : 'PENDING'}. Reference: ${dealId}`,
    });
  } catch (error) {
    console.error('❌ Mock confirmation email failed:', error);
    throw error;
  }
}

module.exports = {
  sendConsignmentEmail,
  sendAdminNotification,
  sendFulfillmentConfirmationEmail,
  sendPaymentFailedEmail,
  sendDealInitiationEmail,
  sendDealAcceptanceEmail,
  sendMockConfirmationEmail,
};
