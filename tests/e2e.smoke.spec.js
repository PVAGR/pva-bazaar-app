/**
 * Lightweight production checks using Playwright's HTTP client (no local webServer).
 * Full API matrix: `npm run verify:connectivity`
 *
 * Optional browser SPA checks (slow / environment-sensitive):
 *   RUN_LIVE_E2E=1 npm run e2e:smoke:live
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function loadLiveMap() {
  const candidates = [
    path.resolve(process.cwd(), 'Frontend/public/live-map.json'),
    path.resolve(process.cwd(), 'public/live-map.json'),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  return {};
}

const liveMap = loadLiveMap();
const FE = (process.env.E2E_BASE_URL || liveMap?.urls?.frontend || 'https://pvabazaar.org').replace(
  /\/+$/,
  '',
);
const API = (
  process.env.BACKEND_URL ||
  liveMap?.urls?.backend ||
  'https://api.pvabazaar.org'
).replace(/\/+$/, '');

test.describe('production HTTP connectivity', () => {
  test('site index responds', async ({ request }) => {
    const res = await request.get(`${FE}/`);
    expect(res.status(), 'home should be reachable').toBeLessThan(400);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(200);
  });

  test('api-base.json points to live API', async ({ request }) => {
    const res = await request.get(`${FE}/api-base.json`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.apiUrl).toBe('string');
    expect(body.apiUrl).toMatch(/^https:\/\//);
    const ping = await request.get(`${String(body.apiUrl).replace(/\/+$/, '')}/ping`);
    expect(ping.ok()).toBeTruthy();
    const pingJson = await ping.json();
    expect(pingJson.ok).toBeTruthy();
  });

  test('backend archive and items', async ({ request }) => {
    const archive = await request.get(`${API}/api/archive`);
    expect(archive.ok()).toBeTruthy();
    const a = await archive.json();
    expect(a.ok).toBeTruthy();

    const items = await request.get(`${API}/api/items?limit=2`);
    expect(items.ok()).toBeTruthy();
  });

  test('backend governance and openclaw', async ({ request }) => {
    const gov = await request.get(`${API}/api/governance/proposals`);
    expect(gov.ok()).toBeTruthy();

    const oc = await request.get(`${API}/api/openclaw/status`);
    expect(oc.ok()).toBeTruthy();
    const ocj = await oc.json();
    expect(ocj.ok).toBeTruthy();
  });
});
