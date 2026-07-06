const ACCOUNTS_KEY = 'pva:local-auth-accounts-v1';
const CURRENT_KEY = 'pva:local-auth-current-v1';

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function readJson(key, fallback) {
  if (!canUseStorage()) return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback));
  } catch (_err) {
    return fallback;
  }
}

function writeJson(key, value) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

async function sha256(input) {
  if (!globalThis.crypto?.subtle) {
    return String(input || '');
  }
  const encoder = new TextEncoder();
  const hash = await globalThis.crypto.subtle.digest(
    'SHA-256',
    encoder.encode(String(input || '')),
  );
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeIdentifier(identifier) {
  return String(identifier || '')
    .trim()
    .toLowerCase();
}

function loadAccounts() {
  return readJson(ACCOUNTS_KEY, []);
}

function saveAccounts(accounts) {
  writeJson(ACCOUNTS_KEY, accounts);
}

function loadCurrent() {
  return readJson(CURRENT_KEY, null);
}

function saveCurrent(current) {
  writeJson(CURRENT_KEY, current);
}

function clearCurrent() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(CURRENT_KEY);
}

function buildLocalToken(user) {
  const payload = {
    local: true,
    id: String(user.id),
    email: user.email,
    username: user.username || '',
    ts: Date.now(),
  };
  return `local.${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`;
}

export async function registerLocalAccount({ name, email, password, onboarding = {} }) {
  const accounts = loadAccounts();
  const normalizedEmail = normalizeIdentifier(email);
  if (!name || !normalizedEmail || !password) {
    throw new Error('Name, email, and password are required');
  }

  const normalizedUsername = normalizeIdentifier(onboarding.username || '');
  const existing = accounts.find(
    (account) =>
      normalizeIdentifier(account.email) === normalizedEmail ||
      (normalizedUsername && normalizeIdentifier(account.username || '') === normalizedUsername),
  );
  if (existing) {
    throw new Error('User already exists');
  }

  const id = `local-${accounts.length + 1}-${Date.now()}`;
  const passwordHash = await sha256(password);
  const user = {
    id,
    name: String(name).trim(),
    email: normalizedEmail,
    username: normalizedUsername || undefined,
    role: 'user',
    onboardingProfile: {
      roleIntent: String(onboarding?.roleIntent || 'consumer'),
      roleOther: String(onboarding?.roleOther || ''),
      appRole: String(onboarding?.appRole || 'consumer'),
      compliance: onboarding?.compliance || undefined,
      emailPreferences: onboarding?.emailPreferences || undefined,
    },
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  accounts.push(user);
  saveAccounts(accounts);
  const token = buildLocalToken(user);
  saveCurrent({ token, user });
  return { ok: true, token, user };
}

export async function loginLocalAccount({ usernameOrEmail, password }) {
  const accounts = loadAccounts();
  const identifier = normalizeIdentifier(usernameOrEmail);
  const passwordHash = await sha256(password);
  const user = accounts.find((account) => {
    const emailMatch = normalizeIdentifier(account.email) === identifier;
    const usernameMatch = normalizeIdentifier(account.username || '') === identifier;
    return (emailMatch || usernameMatch) && account.passwordHash === passwordHash;
  });

  if (!user) {
    throw new Error('Invalid username or password');
  }

  const token = buildLocalToken(user);
  saveCurrent({ token, user });
  return { ok: true, token, user };
}

export async function loginOrProvisionLocalAccount({ usernameOrEmail, password }) {
  try {
    return await loginLocalAccount({ usernameOrEmail, password });
  } catch (err) {
    const identifier = String(usernameOrEmail || '').trim();
    const normalized = normalizeIdentifier(identifier);
    if (!identifier || !password) {
      throw err;
    }

    const derivedEmail = normalized.includes('@')
      ? normalized
      : `${normalized.replace(/[^a-z0-9._-]/g, '') || 'local-user'}@local.pvabazaar`;

    const name = identifier.replace(/\s+/g, ' ').trim() || 'Local User';
    const username = normalized.includes('@')
      ? normalized.split('@')[0]
      : normalized.replace(/[^a-z0-9._-]/g, '');

    try {
      return await registerLocalAccount({
        name,
        email: derivedEmail,
        password,
        onboarding: {
          username,
          appRole: 'consumer',
          roleIntent: 'consumer',
        },
      });
    } catch (_provisionErr) {
      throw err;
    }
  }
}

export function getLocalCurrentUser() {
  const current = loadCurrent();
  return current?.user || null;
}

export function getLocalToken() {
  const current = loadCurrent();
  return current?.token || '';
}

export function isLocalToken(token = '') {
  return String(token || '').startsWith('local.');
}

export { clearCurrent, loadAccounts, saveCurrent };

export default {
  clearCurrent,
  getLocalCurrentUser,
  getLocalToken,
  isLocalToken,
  loadAccounts,
  loginLocalAccount,
  loginOrProvisionLocalAccount,
  registerLocalAccount,
  saveCurrent,
};
