/* eslint-disable no-console */

const BASE_URL = process.env.PHASE6_BASE_URL || 'http://localhost:3001';
const CREATOR_ADDRESS = process.env.PHASE6_CREATOR || `0xPhase6Smoke${Date.now()}`;
const SALE_PRICE = Number(process.env.PHASE6_SALE_PRICE || 321.45);
const ROYALTY_RATE = Number(process.env.PHASE6_ROYALTY_RATE || 10);
const EXPECTED_ROYALTY = Number(((SALE_PRICE * ROYALTY_RATE) / 100).toFixed(8));

async function getJson(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`GET ${path} failed with HTTP ${response.status}`);
  }
  return response.json();
}

async function postJson(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(`POST ${path} failed: ${payload.error || `HTTP ${response.status}`}`);
  }

  return payload;
}

async function getCsv(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`GET ${path} failed with HTTP ${response.status}`);
  }
  return response.text();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function nearlyEqual(a, b, epsilon = 0.000001) {
  return Math.abs(Number(a) - Number(b)) <= epsilon;
}

async function run() {
  console.log(`Running Phase 6 smoke test against ${BASE_URL}`);
  console.log(`Using creator address: ${CREATOR_ADDRESS}`);

  const txHash = `phase6-smoke-${Date.now()}`;
  const postResult = await postJson('/api/analytics/record-sale', {
    creatorAddress: CREATOR_ADDRESS,
    saleType: 'SECONDARY',
    platform: 'WEBSITE',
    salePrice: SALE_PRICE,
    royaltyRate: ROYALTY_RATE,
    buyerAddress: 'phase6-smoke-buyer',
    txHash,
    metadata: {
      source: 'phase6-smoke-script',
      timestamp: new Date().toISOString(),
    },
  });

  const event = postResult.event || {};
  assert(nearlyEqual(event.salePrice, SALE_PRICE), `Unexpected salePrice: ${event.salePrice}`);
  assert(nearlyEqual(event.royaltyAmount, EXPECTED_ROYALTY), `Unexpected royaltyAmount: ${event.royaltyAmount}`);

  const dashboardResp = await getJson(`/api/analytics/dashboard/${encodeURIComponent(CREATOR_ADDRESS)}?days=365`);
  assert(dashboardResp.ok === true, 'Dashboard response was not ok');

  const summary = dashboardResp.dashboard?.summary || {};
  assert(Number(summary.total_sales_count) >= 1, 'Dashboard total_sales_count did not increment');
  assert(Number(summary.total_sales_volume) >= SALE_PRICE, 'Dashboard total_sales_volume mismatch');

  const historyResp = await getJson(`/api/analytics/royalty-history/${encodeURIComponent(CREATOR_ADDRESS)}?limit=5&offset=0`);
  assert(historyResp.ok === true, 'History response was not ok');

  const events = Array.isArray(historyResp.history?.events) ? historyResp.history.events : [];
  assert(events.length > 0, 'History did not return events');
  assert(events[0].tx_hash === txHash, 'Latest history event tx hash mismatch');

  const csv = await getCsv(`/api/analytics/export/${encodeURIComponent(CREATOR_ADDRESS)}`);
  const csvLines = csv.split('\n').filter(Boolean);
  assert(csvLines.length >= 2, 'CSV export did not include data rows');
  assert(csvLines[0].includes('event_id,artifact_id,sale_type'), 'CSV header mismatch');

  console.log('Phase 6 smoke test passed');
  console.log(`Event ID: ${event.eventId}`);
  console.log(`Latest sales count: ${summary.total_sales_count}`);
  console.log(`Latest total royalties: ${summary.total_royalties}`);
}

run().catch((error) => {
  console.error(`Phase 6 smoke test failed: ${error.message}`);
  process.exit(1);
});
