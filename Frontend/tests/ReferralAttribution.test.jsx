import { beforeEach, describe, expect, it } from 'vitest';
import { getStoredReferralCode } from '../src/lib/api.js';

beforeEach(() => {
  window.localStorage.clear();
});

// S: the stored referral pointer that checkout payloads carry.
describe('getStoredReferralCode (checkout attribution pointer)', () => {
  it('returns the normalized stored code', () => {
    window.localStorage.setItem('pva:referral-code', 'abc123');
    expect(getStoredReferralCode()).toBe('ABC123');
  });

  it('falls back to the inbound key', () => {
    window.localStorage.setItem('pva:inbound-ref', 'xyz789');
    expect(getStoredReferralCode()).toBe('XYZ789');
  });

  it('rejects short/invalid codes so they can never attribute', () => {
    window.localStorage.setItem('pva:referral-code', 'AB12');
    expect(getStoredReferralCode()).toBe('');
    window.localStorage.setItem('pva:referral-code', '!!!');
    expect(getStoredReferralCode()).toBe('');
  });

  it('returns empty when nothing is stored', () => {
    expect(getStoredReferralCode()).toBe('');
  });
});
