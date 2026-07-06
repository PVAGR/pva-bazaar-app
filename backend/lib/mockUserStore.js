const bcrypt = require('bcryptjs');
const fs = require('fs/promises');
const path = require('path');

const STORE_PATH =
  process.env.AUTH_STORE_PATH || path.resolve(__dirname, '../data/auth-store.json');

const seedUsers = [
  {
    name: 'PVA Admin',
    username: 'admin',
    email: 'admin@pvabazaar.org',
    password: 'admin123',
    role: 'admin',
  },
  {
    name: 'Richy Rich',
    username: 'richyrichaii',
    email: 'richyrichaii@local',
    password: 'pva123zxc!',
    role: 'admin',
  },
];

const store = global._pvaMockUserStore || {
  users: [],
  seeded: false,
  nextId: 1,
  loaded: false,
};

global._pvaMockUserStore = store;

let writeQueue = Promise.resolve();

function cloneUser(user) {
  if (!user) return null;
  return {
    ...user,
    _id: user._id,
    id: user._id,
    save: undefined,
    comparePassword: user.comparePassword,
  };
}

async function hashPassword(password) {
  return bcrypt.hash(String(password || ''), 10);
}

function stripRuntimeFields(user) {
  if (!user) return null;
  const { comparePassword, ...rest } = user;
  return rest;
}

function hydrateUser(user) {
  if (!user) return null;
  const hydrated = {
    ...user,
    _id: String(user._id || ''),
    id: String(user._id || ''),
  };
  hydrated.comparePassword = async (candidate) =>
    bcrypt.compare(String(candidate || ''), String(hydrated.password || ''));
  return hydrated;
}

async function readStoreFromDisk() {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.users)) {
      store.users = parsed.users.map(hydrateUser).filter(Boolean);
      store.seeded = Boolean(parsed.seeded) || store.users.length > 0;
      const nextId = Number(parsed.nextId);
      if (Number.isFinite(nextId) && nextId > 0) {
        store.nextId = nextId;
      } else {
        const maxId = store.users.reduce((max, user) => {
          const n = Number(user._id);
          return Number.isFinite(n) && n > max ? n : max;
        }, 0);
        store.nextId = maxId + 1;
      }
      return true;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('⚠️ auth store read failed:', err.message || err);
    }
  }
  return false;
}

async function persistStoreToDisk() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  const payload = {
    users: store.users.map(stripRuntimeFields),
    seeded: store.seeded,
    nextId: store.nextId,
    updatedAt: new Date().toISOString(),
  };
  const tmpPath = `${STORE_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
  await fs.rename(tmpPath, STORE_PATH);
}

function queuePersist() {
  writeQueue = writeQueue
    .then(() => persistStoreToDisk())
    .catch((err) => {
      console.warn('⚠️ auth store persist failed:', err?.message || err);
    });
  return writeQueue;
}

async function ensureStoreLoaded() {
  if (store.loaded) return;
  await readStoreFromDisk();
  store.loaded = true;
  if (!store.users.length) {
    await seedDefaultUsers();
    await queuePersist();
  }
}

async function seedDefaultUsers() {
  if (store.seeded) return;
  for (const seed of seedUsers) {
    const existing = store.users.find(
      (user) => (seed.username && user.username === seed.username) || user.email === seed.email,
    );
    if (existing) continue;
    const hashed = await hashPassword(seed.password);
    store.users.push({
      _id: String(store.nextId++),
      name: seed.name,
      username: seed.username,
      email: seed.email,
      password: hashed,
      role: seed.role || 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      comparePassword: async (candidate) => bcrypt.compare(String(candidate || ''), hashed),
    });
  }
  store.seeded = true;
}

async function ensureSeedUsers() {
  await ensureStoreLoaded();
  if (store.users.length && store.seeded) return;
  await seedDefaultUsers();
  await queuePersist();
}

async function findUser(query = {}) {
  await ensureSeedUsers();
  const orClauses = Array.isArray(query.$or) ? query.$or : null;
  const candidates = orClauses && orClauses.length ? orClauses : [query];

  const match = store.users.find((user) =>
    candidates.some((candidate) => {
      const entries = Object.entries(candidate || {});
      if (!entries.length) return false;
      return entries.every(([key, value]) => {
        if (key === 'email')
          return String(user.email || '').toLowerCase() === String(value || '').toLowerCase();
        if (key === 'username')
          return String(user.username || '').toLowerCase() === String(value || '').toLowerCase();
        if (key === 'role')
          return String(user.role || '').toLowerCase() === String(value || '').toLowerCase();
        return String(user[key] || '') === String(value || '');
      });
    }),
  );

  return cloneUser(match);
}

async function saveUser(input) {
  await ensureSeedUsers();
  const now = new Date();
  const doc = typeof input === 'object' ? { ...input } : {};
  const username = String(doc.username || '').trim();
  const email = String(doc.email || '')
    .trim()
    .toLowerCase();

  const existingIndex = store.users.findIndex(
    (user) =>
      (username && String(user.username || '').toLowerCase() === username.toLowerCase()) ||
      (email && String(user.email || '').toLowerCase() === email),
  );

  const password = String(doc.password || '');
  const hashedPassword = password.startsWith('$2') ? password : await hashPassword(password);

  const record = {
    _id: doc._id ? String(doc._id) : String(store.nextId++),
    name: String(doc.name || 'PVA User'),
    username: username || undefined,
    email: email || String(doc.email || '').trim(),
    password: hashedPassword,
    role: String(doc.role || 'user'),
    onboardingProfile: doc.onboardingProfile || undefined,
    preferences: doc.preferences || undefined,
    gameProfile: doc.gameProfile || undefined,
    votingProfile: doc.votingProfile || undefined,
    createdAt: doc.createdAt || now,
    updatedAt: now,
  };

  record.comparePassword = async (candidate) =>
    bcrypt.compare(String(candidate || ''), record.password);

  if (existingIndex >= 0) {
    store.users[existingIndex] = { ...store.users[existingIndex], ...record };
    await queuePersist();
    return cloneUser(store.users[existingIndex]);
  }

  store.users.push(record);
  await queuePersist();
  return cloneUser(record);
}

async function getAuthStoreState() {
  await ensureSeedUsers();
  return {
    mode: 'file',
    connected: true,
    readyState: 1,
    path: STORE_PATH,
    users: store.users.length,
    seeded: store.seeded,
    loaded: store.loaded,
  };
}

module.exports = {
  ensureSeedUsers,
  findUser,
  getAuthStoreState,
  saveUser,
  isMockStoreEnabled: () => true,
};
