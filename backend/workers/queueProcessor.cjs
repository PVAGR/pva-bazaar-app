/**
 * OpenClaw Queue Processor - Vercel Cron Job
 *
 * Runs every 10 minutes on Vercel serverless to:
 * - Update worker heartbeat in MongoDB
 * - Process pending outbound messages
 * - Forward to webhook if configured
 *
 * Replaces local watchdog process for cloud deployment
 */

module.exports = async (req, res) => {
  try {
    // Verify request is from Vercel Cron (internal only)
    const cronsSecret = process.env.CRON_SECRET;
    if (cronsSecret && req.headers.authorization !== `Bearer ${cronsSecret}`) {
      return res.status(401).json({ ok: false, message: 'Unauthorized cron request' });
    }

    // Connect to database
    const dbConnect = require('../lib/dbConnect');
    await dbConnect();

    const OpenClawWorkerLease = require('../models/OpenClawWorkerLease');
    const OpenClawMessage = require('../models/OpenClawMessage');
    const axios = require('axios');

    // Update heartbeat: mark Vercel worker as active
    const workerName = 'vercel-queue-processor';
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + 12 * 60 * 1000); // 12 min lease

    await OpenClawWorkerLease.updateOne(
      { name: workerName },
      {
        $set: {
          heartbeatAt: now,
          active: true,
          leaseUntil,
          holderId: process.env.VERCEL_DEPLOYMENT_ID || 'vercel-cron',
        },
      },
      { upsert: true },
    );

    // Fetch pending outbound messages to process
    const pending = await OpenClawMessage.find({
      direction: 'outbound',
      processed: false,
    })
      .sort({ createdAt: 1 })
      .limit(10)
      .lean();

    let forwarded = 0;
    let failed = 0;
    const errors = [];

    // Forward to webhook if configured
    if (process.env.OPENCLAW_WEBHOOK_URL && pending.length > 0) {
      for (const msg of pending) {
        try {
          const webhookPayload = {
            direction: msg.direction,
            content: msg.content,
            event: msg.event,
            metadata: msg.metadata,
            _id: msg._id.toString(),
            timestamp: now.toISOString(),
          };

          const headers = {
            'Content-Type': 'application/json',
            'X-Cron-Processor': 'vercel',
          };

          if (process.env.OPENCLAW_API_KEY) {
            headers.Authorization = `Bearer ${process.env.OPENCLAW_API_KEY}`;
          }

          await axios.post(process.env.OPENCLAW_WEBHOOK_URL, webhookPayload, {
            headers,
            timeout: 10000,
          });

          // Mark as processed after successful forward
          await OpenClawMessage.updateOne(
            { _id: msg._id },
            {
              $set: {
                processed: true,
                'metadata.forwardedAt': now.toISOString(),
                'metadata.forwardedBy': 'vercel-cron',
              },
            },
          );

          forwarded += 1;
        } catch (err) {
          failed += 1;
          const errorMsg = err?.response?.data?.message || err.message || 'Unknown error';
          errors.push({
            messageId: msg._id.toString(),
            error: errorMsg,
          });

          // Increment retry count
          await OpenClawMessage.updateOne(
            { _id: msg._id },
            {
              $inc: { 'metadata.retryCount': 1 },
              $set: {
                'metadata.lastRetryAt': now.toISOString(),
                'metadata.lastError': errorMsg.slice(0, 300),
              },
            },
          );
        }
      }
    }

    // Return status
    res.json({
      ok: true,
      worker: workerName,
      timestamp: now.toISOString(),
      processing: {
        pending: pending.length,
        forwarded,
        failed,
        errors: errors.slice(0, 5), // Limit errors in response
      },
      lease: {
        name: workerName,
        active: true,
        until: leaseUntil.toISOString(),
      },
      message:
        pending.length === 0
          ? 'No messages to process'
          : `Processed ${pending.length}: forwarded ${forwarded}, failed ${failed}`,
    });
  } catch (err) {
    console.error('[Queue Processor Error]', err);
    res.status(500).json({
      ok: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
};
