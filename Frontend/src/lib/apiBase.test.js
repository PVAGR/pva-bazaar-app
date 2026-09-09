import { describe, expect, it } from 'vitest';
import { apiUrl, normalizeApiBaseUrl } from './apiBase.js';

describe('normalizeApiBaseUrl', () => {
  it('appends /api when missing', () => {
    expect(normalizeApiBaseUrl('https://example.com')).toBe('https://example.com/api');
  });

  it('keeps an existing /api suffix (no duplication)', () => {
    expect(normalizeApiBaseUrl('https://example.com/api')).toBe('https://example.com/api');
    expect(normalizeApiBaseUrl('https://example.com/API')).toBe('https://example.com/API');
  });

  it('strips trailing slashes', () => {
    expect(normalizeApiBaseUrl('https://example.com/api///')).toBe('https://example.com/api');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeApiBaseUrl('')).toBe('');
    expect(normalizeApiBaseUrl(null)).toBe('');
  });
});

describe('apiUrl (canonical API URL builder)', () => {
  it('joins the preferred base with a route path', () => {
    const url = apiUrl('/referrals/earnings');
    expect(url).toMatch(/\/api\/referrals\/earnings$/);
  });

  it('never produces /api/api duplication, even with a legacy prefixed path', () => {
    expect(apiUrl('/api/referrals/earnings')).not.toContain('/api/api/');
    expect(apiUrl('/referrals/earnings')).not.toContain('/api/api/');
    expect(apiUrl('/partners/public')).not.toContain('/api/api/');
    expect(apiUrl('/book-publishing/signed-upload')).not.toContain('/api/api/');
  });

  it('tolerates a missing leading slash', () => {
    expect(apiUrl('referrals/earnings')).toMatch(/\/api\/referrals\/earnings$/);
  });

  it('passes absolute and embedded URLs through untouched', () => {
    expect(apiUrl('https://cdn.example.com/file.pdf')).toBe('https://cdn.example.com/file.pdf');
    expect(apiUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(apiUrl('blob:https://example.com/uuid')).toBe('blob:https://example.com/uuid');
  });
});
