const bcrypt = require('bcryptjs');

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
};

global._pvaMockUserStore = store;

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

async function ensureSeedUsers() {
  if (store.seeded) return;
  for (const seed of seedUsers) {
    const existing = store.users.find((user) =>
      (seed.username && user.username === seed.username) || user.email === seed.email,
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

async function findUser(query = {}) {
  await ensureSeedUsers();
  const orClauses = Array.isArray(query.$or) ? query.$or : null;
  const candidates = orClauses && orClauses.length ? orClauses : [query];

  const match = store.users.find((user) => candidates.some((candidate) => {
    const entries = Object.entries(candidate || {});
    if (!entries.length) return false;
    return entries.every(([key, value]) => {
      if (key === 'email') return String(user.email || '').toLowerCase() === String(value || '').toLowerCase();
      if (key === 'username') return String(user.username || '').toLowerCase() === String(value || '').toLowerCase();
      if (key === 'role') return String(user.role || '').toLowerCase() === String(value || '').toLowerCase();
      return String(user[key] || '') === String(value || '');
    });
  }));

  return cloneUser(match);
}

async function saveUser(input) {
  await ensureSeedUsers();
  const now = new Date();
  const doc = typeof input === 'object' ? { ...input } : {};
  const username = String(doc.username || '').trim();
  const email = String(doc.email || '').trim().toLowerCase();

  const existingIndex = store.users.findIndex((user) =>
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

  record.comparePassword = async (candidate) => bcrypt.compare(String(candidate || ''), record.password);

  if (existingIndex >= 0) {
    store.users[existingIndex] = { ...store.users[existingIndex], ...record };
    return cloneUser(store.users[existingIndex]);
  }

  store.users.push(record);
  return cloneUser(record);
}

module.exports = {
  ensureSeedUsers,
  findUser,
  saveUser,
  isMockStoreEnabled: () => store.seeded || true,
};
