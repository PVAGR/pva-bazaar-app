import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getToken, setToken, clearToken, isLocalToken } from '../auth.js';
import * as localAuthVault from '../localAuthVault.js';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('token helpers treat server tokens and device-local tokens differently', () => {
  it('setToken migrates to the canonical key and clearToken wipes all token keys', () => {
    expect(getToken()).toBe('');
    setToken('srv.payload.sig');
    expect(localStorage.getItem('token')).toBe('srv.payload.sig');
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('jwt')).toBeNull();

    clearToken();
    expect(getToken()).toBe('');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('isLocalToken flags unsigned device-local tokens', () => {
    expect(isLocalToken('srv.payload.sig')).toBe(false);
    expect(isLocalToken('local.abc')).toBe(true);
  });

  it('clearing storage does not by itself remove a server account (server keyed later)', () => {
    setToken('srv.payload.sig');
    expect(getToken()).toBe('srv.payload.sig');
    clearToken();
    // The browser is simply signed out; nothing about the server account is touched.
    expect(getToken()).toBe('');
  });
});

describe('localAuthVault no longer fabricates registrations or admin authority', () => {
  it('removed the auto-provision helper that minted accounts on failed logins', () => {
    expect(localAuthVault.loginOrProvisionLocalAccount).toBeUndefined();
  });

  it('explicit offline registration only ever creates a role:"user" device profile', async () => {
    const result = await localAuthVault.registerLocalAccount({
      name: 'Offline Person',
      email: 'offline@local',
      password: 'local-secret',
      onboarding: { appRole: 'consumer', roleIntent: 'consumer' },
    });
    expect(result.ok).toBe(true);
    expect(String(result.token)).toMatch(/^local\./);
    expect(result.user.role).toBe('user');
    expect(result.user.role).not.toBe('admin');
  });

  it('a device-local profile can never pretend to be a server session', () => {
    expect(localAuthVault.isLocalToken('local.something')).toBe(true);
    expect(localAuthVault.isLocalToken('srv.payload.sig')).toBe(false);
  });
});