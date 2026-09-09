// @vitest-environment node
// Phase 3 regression: the production Vercel serverless entry
// (api/[...path].js -> backend/api/index-serverless.js) must mount the
// existing Stripe webhook handler, and the raw-body middleware must run
// BEFORE the general JSON parser so Stripe signature verification receives
// the exact request bytes.
import { describe, expect, it } from 'vitest';
import request from 'supertest';

// Set before requiring the app so the webhook handler runs its signature path.
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_phase3';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

const app = require('../index-serverless');

function layerIndex(name) {
  const stack = app._router ? app._router.stack : app.router.stack;
  return stack.findIndex((layer) => layer.handle && layer.handle.name === name);
}

describe('serverless entry mounts Stripe webhook with raw body (Phase 3)', () => {
  it('raw-body middleware is registered before the general JSON parser', () => {
    const rawIdx = layerIndex('stripeWebhookRawBody');
    // Express >= 4.21 names the json middleware layer 'jsonParser'; older
    // versions name it 'json'.
    const jsonIdx = Math.max(layerIndex('jsonParser'), layerIndex('json'));
    expect(rawIdx).toBeGreaterThanOrEqual(0);
    expect(jsonIdx).toBeGreaterThanOrEqual(0);
    expect(rawIdx).toBeLessThan(jsonIdx);
  });

  it('POST /api/webhooks/stripe reaches the handler with raw bytes (400 signature error, not 404, not payload-type error)', async () => {
    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ id: 'evt_phase3_probe' }));

    // Route must be mounted: unmounted paths fall through to the 404 handler.
    expect(res.status).toBe(400);
    // Signature verification ran on the RAW buffer. If the JSON parser had
    // consumed the body first, Stripe reports a payload-type error instead.
    expect(res.body.error).toMatch(/signature/i);
    expect(res.body.error).not.toMatch(/payload must be/i);
  });

  it('POST /webhooks/stripe (non-/api alias) is mounted too', async () => {
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ id: 'evt_phase3_probe' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/signature/i);
    expect(res.body.error).not.toMatch(/payload must be/i);
  });
});
