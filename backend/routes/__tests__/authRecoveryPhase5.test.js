// @vitest-environment node
// Phase 5 authentication trust: the server (Mongo) is the only authority for
// accounts, sessions, recovery posture, and admin rights. Browser-local state
// cannot fabricate a registered user, a session, or admin authority.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = 'pva-phase5-test-jwt-secret-0123456789abcdef';

let mongoServer;
let app;
let User;
let authenticateToken;
let adminSession;

let seq = 0;
function uniqueEmail(prefix) {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}@example.com`;
}

async function registerUser(email, password = 'correct horse battery staple') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password, onboarding: { roleIntent: 'consumer' } });
  return res;
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.ADMIN_SELF_SIGNUP_ENABLED = 'false';

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  User = require('../../models/User');
  ({ authenticateToken } = require('../../middleware/auth'));
  adminSession = require('../../middleware/adminSession');

  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  app.use('/api/auth', require('../auth'));
  app.use('/api/admin', require('../adminLogin'));

  // Protected sample endpoints that use the real production middleware.
  app.get('/api/protected-user', authenticateToken, (req, res) => {
    res.json({ ok: true, user: { id: req.user.id, role: req.user.role } });
  });
  app.get('/api/protected-admin', adminSession, (req, res) => {
    res.json({ ok: true, admin: req.admin });
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
  delete process.env.JWT_SECRET;
  delete process.env.ADMIN_SELF_SIGNUP_ENABLED;
});

describe('A: registration is server-authoritative and persistent', () => {
  it('creates a Mongo user and returns a real session token + ObjectId', async () => {
    const email = uniqueEmail('reg');
    const res = await registerUser(email);

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.token).toBe('string');
    expect(String(res.body.token)).not.toMatch(/^local\./);
    expect(String(res.body.user.id)).toMatch(/^[a-f\d]{24}$/i);

    const saved = await User.findOne({ email });
    expect(saved).toBeTruthy();
    expect(String(saved._id)).toBe(String(res.body.user.id));
  });
});

describe('B: duplicate registration is rejected', () => {
  it('returns 400 for an already-registered email (case-insensitive)', async () => {
    const email = uniqueEmail('dup');
    await registerUser(email);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Second User', email: email.toUpperCase(), password: 'another strong password' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe('C: passwords are never stored or returned in plaintext', () => {
  it('stores a bcrypt hash and does not echo the password in responses', async () => {
    const email = uniqueEmail('hash');
    const password = 'super-secret-phrase-1';
    const res = await registerUser(email, password);

    expect(res.status).toBe(201);
    expect(JSON.stringify(res.body)).not.toContain(password);
    expect(res.body.user.password).toBeUndefined();

    const saved = await User.findOne({ email });
    expect(String(saved.password)).toMatch(/^\$2[aby]\$/);
    expect(String(saved.password)).not.toBe(password);
  });
});

describe('D: correct credentials log in and /me returns the server identity', () => {
  it('returns a token for valid credentials and resolves current user from Mongo', async () => {
    const email = uniqueEmail('login-ok');
    const password = 'right-password-99';
    await registerUser(email, password);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
    expect(String(me.body.user.id)).toMatch(/^[a-f\d]{24}$/i);
  });
});

describe('E: wrong credentials are rejected', () => {
  it('returns 401 for an incorrect password and for an unknown account', async () => {
    const email = uniqueEmail('login-bad');
    const password = 'right-password-100';
    await registerUser(email, password);

    const wrongPass = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' });
    expect(wrongPass.status).toBe(401);

    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'anything' });
    expect(unknown.status).toBe(401);
  });
});

describe('F: a failed login produces no authenticated state', () => {
  it('returns 401 with no token and raises no session cookie', async () => {
    const email = uniqueEmail('login-fail');
    await registerUser(email, 'right-password-101');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
    const setCookies = res.headers['set-cookie'] || [];
    expect(setCookies.some((c) => /admin_token\s*=/.test(c))).toBe(false);

    const guarded = await request(app).get('/api/protected-user');
    expect(guarded.status).toBe(401);
  });
});

describe('G: expired or invalid JWTs are rejected', () => {
  it('rejects tokens signed with the wrong secret or already expired', async () => {
    const { getJwtSecret } = require('../../lib/jwtSecret');
    const wrongSecret = jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: 'user' }, 'a-different-secret');
    const expired = jwt.sign(
      { id: new mongoose.Types.ObjectId().toString(), role: 'user' },
      getJwtSecret(),
      { algorithm: 'HS256', expiresIn: '-10s' },
    );

    const wrong = await request(app).get('/api/protected-user').set('Authorization', `Bearer ${wrongSecret}`);
    expect(wrong.status).toBe(401);

    const stale = await request(app).get('/api/protected-user').set('Authorization', `Bearer ${expired}`);
    expect(stale.status).toBe(401);
  });
});

describe('H: unauthorized protected routes are rejected', () => {
  it('returns 401 when no token is supplied', async () => {
    const res = await request(app).get('/api/protected-user');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a clear code for a browser-fabricated local token', async () => {
    const forged = `local.${Buffer.from(JSON.stringify({ local: true, id: '1', role: 'admin' })).toString('base64')}`;
    const res = await request(app).get('/api/protected-user').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('LOCAL_TOKEN_REJECTED');
  });
});

describe('I: admin endpoints reject unauthenticated and non-admin callers', () => {
  it('blocks anonymous access to an admin-gated route', async () => {
    const res = await request(app).get('/api/protected-admin');
    expect(res.status).toBe(401);
  });

  it('blocks a normal user from an admin-gated route', async () => {
    const email = uniqueEmail('not-admin');
    const password = 'right-password-102';
    await registerUser(email, password);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    expect(login.status).toBe(200);

    const res = await request(app).get('/api/protected-admin').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(403);
  });
});

describe('J: browser storage can never grant admin authority', () => {
  it('rejects a forged local token even when it claims role admin', async () => {
    const forged = `local.${Buffer.from(JSON.stringify({ local: true, id: '000000000000000000000000', role: 'admin' })).toString('base64')}`;
    const res = await request(app).get('/api/protected-admin').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('LOCAL_TOKEN_REJECTED');
  });

  it('creates a fake admin flag in no backend store (self-signup locked by default)', async () => {
    // Production default: with an existing admin, signup is locked.
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_SELF_SIGNUP_ENABLED;
    try {
      await User.create({ name: 'Existing Admin', email: uniqueEmail('adm'), password: 'long-enough-password', role: 'admin' });
      const res = await request(app)
        .post('/api/admin/signup')
        .send({ name: 'Intruder', email: uniqueEmail('intr'), password: 'long-enough-password' });
      expect(res.status).toBe(403);
    } finally {
      process.env.NODE_ENV = 'test';
      process.env.ADMIN_SELF_SIGNUP_ENABLED = 'false';
    }
  });
});

describe('K: current-user endpoint returns server identity only', () => {
  it('never reports a device-local id as a server account', async () => {
    const email = uniqueEmail('server-id');
    const register = await registerUser(email, 'right-password-103');
    expect(register.status).toBe(201);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${register.body.token}`);
    expect(me.status).toBe(200);
    expect(String(me.body.user.id)).not.toMatch(/^local-/);
    expect(String(me.body.user._id || me.body.user.id)).toMatch(/^[a-f\d]{24}$/i);
  });
});

describe('L: clearing browser storage cannot destroy a server account', () => {
  it('the account survives a brand-new session with no stored token', async () => {
    const email = uniqueEmail('survivor');
    const password = 'right-password-104';
    await registerUser(email, password);

    // A fresh "browser" arrives with no token and signs in again — the server
    // account is authoritative and untouched by any local clear.
    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);

    const saved = await User.findOne({ email });
    expect(saved).toBeTruthy();
  });
});

describe('M: password recovery posture (no online reset without email infra)', () => {
  it('exposes no forgot/reset endpoints that do not exist', async () => {
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: 'x@example.com' });
    expect(forgot.status).toBe(404);

    const reset = await request(app).post('/api/auth/reset-password').send({ token: 'x', password: 'newpass' });
    expect(reset.status).toBe(404);
  });

  it('documented env-admin recovery still works with correct credentials and rejects bad ones', async () => {
    process.env.ADMIN_USERNAME = 'rootowner';
    process.env.ADMIN_PASSWORD = 'owner-long-env-password';
    process.env.ADMIN_EMAIL = uniqueEmail('owner');
    try {
      const ok = await request(app)
        .post('/api/auth/login')
        .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
      expect(ok.status).toBe(200);
      expect(ok.body.user.role).toBe('admin');

      const bad = await request(app)
        .post('/api/auth/login')
        .send({ email: process.env.ADMIN_EMAIL, password: 'wrong-owner-password' });
      expect(bad.status).toBe(401);
    } finally {
      delete process.env.ADMIN_USERNAME;
      delete process.env.ADMIN_PASSWORD;
      delete process.env.ADMIN_EMAIL;
    }
  });
});

describe('N: missing auth secret fails closed in production', () => {
  it('refuses to serve auth (503) when JWT_SECRET is absent in production', async () => {
    const email = uniqueEmail('closed');
    await registerUser(email, 'right-password-105');

    const originalNodeEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    try {
      const res = await request(app).post('/api/auth/login').send({ email, password: 'right-password-105' });
      expect(res.status).toBe(503);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalSecret) process.env.JWT_SECRET = originalSecret;
    }
  });
});

describe('O: public endpoints leak no auth secrets', () => {
  it('diagnostic, bootstrap-status, and OAuth status expose only booleans/names', async () => {
    const responses = [];
    responses.push(await request(app).get('/api/auth/diagnostic'));
    responses.push(await request(app).get('/api/admin/bootstrap-status'));
    responses.push(await request(app).get('/api/admin/oauth/github/status'));

    for (const res of responses) {
      expect(res.status).toBe(200);
      const raw = JSON.stringify(res.body);
      expect(raw).not.toContain(TEST_JWT_SECRET);
      expect(raw).not.toContain('pva-bazaar-fallback-secret-v1');
      expect(raw).not.toContain('dev-secret-key');
      expect(raw).not.toContain('admin123');
      expect(raw).not.toContain('pva123zxc!');
    }
  });
});