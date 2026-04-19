const STORAGE_KEY = 'pva.local.deals.v1';

function randomId(prefix = 'ld') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function randomToken() {
  return `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

function loadDeals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

function saveDeals(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listLocalDeals() {
  return loadDeals().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export function createLocalDeal(payload = {}) {
  const now = new Date().toISOString();
  const item = {
    _id: randomId('deal'),
    publicId: randomId('public'),
    inviteToken: randomToken(),
    title: String(payload.title || '').trim() || 'Untitled local deal',
    description: String(payload.description || '').trim(),
    totalAmount: Number(payload.totalAmount || 0),
    currency: String(payload.currency || 'USD').trim() || 'USD',
    status: 'draft',
    counterparty: {
      name: String(payload.counterpartyName || '').trim(),
      country: String(payload.counterpartyCountry || '').trim(),
    },
    verification: {
      verificationCount: 0,
      verifiedParticipants: [],
    },
    createdAt: now,
    updatedAt: now,
    mode: 'local-only',
  };

  const items = loadDeals();
  items.push(item);
  saveDeals(items);
  return item;
}

export function getLocalDealByPublicId(publicId) {
  if (!publicId) return null;
  const value = String(publicId).trim();
  return loadDeals().find((item) => String(item.publicId) === value) || null;
}

export function getLocalDealByInviteToken(inviteToken) {
  if (!inviteToken) return null;
  const value = String(inviteToken).trim();
  return loadDeals().find((item) => String(item.inviteToken) === value) || null;
}

export function verifyLocalDeal(publicId, actor = 'local-user') {
  const value = String(publicId || '').trim();
  if (!value) throw new Error('publicId required');

  const items = loadDeals();
  const index = items.findIndex((item) => String(item.publicId) === value);
  if (index < 0) throw new Error('Deal not found');

  const target = items[index];
  const verifiedParticipants = Array.isArray(target.verification?.verifiedParticipants)
    ? [...target.verification.verifiedParticipants]
    : [];

  const normalizedActor = String(actor || 'local-user').trim() || 'local-user';
  const already = verifiedParticipants.some((entry) => String(entry.userId) === normalizedActor);

  if (!already) {
    verifiedParticipants.push({
      userId: normalizedActor,
      method: 'local-mode',
      verifiedAt: new Date().toISOString(),
    });
  }

  items[index] = {
    ...target,
    verification: {
      verificationCount: verifiedParticipants.length,
      verifiedParticipants,
    },
    updatedAt: new Date().toISOString(),
  };

  saveDeals(items);
  return items[index];
}
