const axios = require('axios');

function normalizeUrl(value) {
  return String(value || '').trim();
}

function parseBool(value) {
  if (typeof value === 'boolean') return value;
  const text = String(value || '').trim().toLowerCase();
  return text === '1' || text === 'true' || text === 'yes' || text === 'on';
}

async function lookupReverseImageSignals({ imageUrls = [], title = '', category = '' } = {}) {
  const providerUrl = normalizeUrl(process.env.REVERSE_IMAGE_PROVIDER_URL);
  const providerToken = normalizeUrl(process.env.REVERSE_IMAGE_PROVIDER_TOKEN);
  const timeoutMs = Math.max(1000, Math.min(Number(process.env.REVERSE_IMAGE_PROVIDER_TIMEOUT_MS || 7000), 30000));

  if (!providerUrl || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return {
      enabled: false,
      provider: providerUrl ? 'configured_no_images' : 'not_configured',
      checked: false,
      matches: [],
      likelyDuplicate: false,
      score: 0,
      message: providerUrl ? 'No images submitted for reverse lookup' : 'Reverse image provider not configured',
    };
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (providerToken) {
      headers.Authorization = `Bearer ${providerToken}`;
    }

    const payload = {
      imageUrls: imageUrls.map(normalizeUrl).filter(Boolean),
      title: String(title || ''),
      category: String(category || ''),
      maxResults: Math.max(1, Math.min(Number(process.env.REVERSE_IMAGE_PROVIDER_MAX_RESULTS || 8), 30)),
    };

    const response = await axios.post(providerUrl, payload, {
      headers,
      timeout: timeoutMs,
    });

    const rows = Array.isArray(response?.data?.matches)
      ? response.data.matches
      : Array.isArray(response?.data)
        ? response.data
        : [];

    const normalized = rows.map((row) => ({
      source: String(row.source || row.provider || row.platform || 'unknown'),
      url: normalizeUrl(row.url || row.pageUrl || row.link),
      imageUrl: normalizeUrl(row.imageUrl || row.thumbnail || ''),
      title: String(row.title || ''),
      similarity: Number(row.similarity || row.score || 0),
      confidence: Number(row.confidence || 0),
      externalId: String(row.externalId || row.id || ''),
      firstSeenAt: row.firstSeenAt || row.discoveredAt || null,
    }));

    const threshold = Math.max(0, Math.min(Number(process.env.REVERSE_IMAGE_DUPLICATE_THRESHOLD || 0.92), 1));
    const exactLike = normalized.filter((row) => Math.max(row.similarity, row.confidence) >= threshold);
    const topScore = normalized.reduce((acc, row) => Math.max(acc, row.similarity, row.confidence), 0);

    return {
      enabled: true,
      provider: 'external',
      checked: true,
      matches: normalized,
      likelyDuplicate: exactLike.length > 0,
      score: topScore,
      threshold,
      message: exactLike.length > 0 ? 'Potential external duplicate(s) detected' : 'No high-confidence external duplicates found',
    };
  } catch (error) {
    return {
      enabled: true,
      provider: 'external',
      checked: false,
      matches: [],
      likelyDuplicate: false,
      score: 0,
      message: error?.message || 'Reverse image lookup failed',
      failed: true,
    };
  }
}

function shouldBlockOnReverseImage(lookupResult) {
  const enforce = parseBool(process.env.PROVENANCE_ENFORCE_REVERSE_IMAGE);
  return enforce && Boolean(lookupResult?.likelyDuplicate);
}

function buildReverseImageSnapshot(lookupResult = {}, maxMatches = 10) {
  const rows = Array.isArray(lookupResult.matches) ? lookupResult.matches : [];
  return {
    enabled: Boolean(lookupResult.enabled),
    checked: Boolean(lookupResult.checked),
    provider: String(lookupResult.provider || ''),
    likelyDuplicate: Boolean(lookupResult.likelyDuplicate),
    score: Number(lookupResult.score || 0),
    threshold: Number(lookupResult.threshold || 0),
    message: String(lookupResult.message || ''),
    checkedAt: new Date(),
    matches: rows.slice(0, maxMatches).map((row) => ({
      source: String(row.source || ''),
      url: String(row.url || ''),
      imageUrl: String(row.imageUrl || ''),
      title: String(row.title || ''),
      similarity: Number(row.similarity || 0),
      confidence: Number(row.confidence || 0),
      externalId: String(row.externalId || ''),
      firstSeenAt: row.firstSeenAt ? new Date(row.firstSeenAt) : undefined,
    })),
  };
}

module.exports = {
  lookupReverseImageSignals,
  shouldBlockOnReverseImage,
  buildReverseImageSnapshot,
};
