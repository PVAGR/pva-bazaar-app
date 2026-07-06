import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_FRONTEND = 'https://pvabazaar.org';
const DEFAULT_API_BASE = 'https://api.pvabazaar.org/api';
const LIVE_MAP_PATHS = [
  resolve(process.cwd(), 'Frontend/public/live-map.json'),
  resolve(process.cwd(), 'public/live-map.json'),
];

export function normalizeBase(url) {
  return String(url || '')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');
}

export function normalizeApiBase(url) {
  return String(url || '').replace(/\/+$/, '');
}

export function loadLiveMap() {
  for (const filePath of LIVE_MAP_PATHS) {
    if (!existsSync(filePath)) continue;

    try {
      return JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (error) {
      throw new Error(`Unable to parse live map at ${filePath}: ${error.message}`);
    }
  }

  return {};
}

export function getLiveTargets(env = process.env) {
  const map = loadLiveMap();
  const frontend = normalizeBase(env.FRONTEND_URL || map?.urls?.frontend || DEFAULT_FRONTEND);
  const apiBase = normalizeApiBase(env.API_BASE_URL || map?.urls?.apiBase || DEFAULT_API_BASE);
  const backend = normalizeBase(env.BACKEND_URL || map?.urls?.backend || apiBase);

  return { map, frontend, backend, apiBase };
}

export function getRuntimeApiCandidates(frontend) {
  const clean = normalizeBase(frontend);
  return [`${clean}/api-base.json`, `${clean}/public/api-base.json`];
}

export function getRequiredHeaders(map) {
  return Array.isArray(map?.edge?.requiredHeaders) ? map.edge.requiredHeaders : [];
}

export function getLatencyThresholds(map) {
  const targets = map?.targets || {};
  return {
    frontend: Number(targets.frontendLatencyMs || 2500),
    ping: Number(targets.pingLatencyMs || 1000),
    health: Number(targets.healthLatencyMs || 2500),
    asset: Number(targets.assetLatencyMs || 4000),
  };
}
