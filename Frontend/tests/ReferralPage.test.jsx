import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { MemoryRouter } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { HelmetProvider } from 'react-helmet-async';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import ReferralPage from '../src/pages/ReferralPage.jsx';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import Layout from '../src/components/Layout.jsx';
import { apiUrl } from '../src/lib/apiBase.js';

const STORAGE_KEY = 'pva:referral-data';

function renderReferral() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <ReferralPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

const SAVED_RECORD = {
  code: 'ABC123',
  name: 'Amina',
  email: 'amina@example.com',
  createdAt: new Date().toISOString(),
  sales: 1,
  clicks: 4,
  totalCommissionsCents: 250,
  pendingCents: 100,
};

const LIVE_DATA = {
  code: 'ABC123',
  name: 'Amina',
  sales: 3,
  clicks: 10,
  totalCommissionsCents: 900,
  pendingCents: 200,
  payouts: [],
  recent: [],
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ReferralPage trust', () => {
  it('I: registration succeeds only after server confirmation', async () => {
    global.fetch = vi.fn(async (url, opts) => {
      if (String(url).includes('/referrals/register') && opts?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            data: { code: 'NEWCD1', name: 'Zawadi', email: 'zawadi@example.com', joinedAt: new Date().toISOString() },
            emailDelivered: false,
          }),
        };
      }
      if (String(url).includes('/referrals/earnings')) {
        return { ok: true, json: async () => ({ ok: true, data: LIVE_DATA }) };
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    const user = userEvent.setup();
    renderReferral();
    await user.type(screen.getByPlaceholderText(/Richard Torres/i), 'Zawadi');
    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'zawadi@example.com');
    await user.click(screen.getByRole('button', { name: /Generate my referral code/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'NEWCD1' })).toBeTruthy());
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(saved.code).toBe('NEWCD1');
  });

  it('J: registration failure never yields a local success', async () => {
    global.fetch = vi.fn(async () => { throw new Error('offline'); });
    const user = userEvent.setup();
    renderReferral();
    await user.type(screen.getByPlaceholderText(/Richard Torres/i), 'Juma');
    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'juma@example.com');
    await user.click(screen.getByRole('button', { name: /Generate my referral code/i }));
    await waitFor(() => expect(screen.getByText(/no code was registered/i)).toBeTruthy());
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    // Creation form stays; no dashboard code is shown.
    expect(screen.getByRole('button', { name: /Generate my referral code/i })).toBeTruthy();
  });

  it('K: earnings success shows the live state', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SAVED_RECORD));
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, data: LIVE_DATA }),
    }));
    renderReferral();
    await waitFor(() => expect(screen.getByText('Live')).toBeTruthy());
    expect(screen.getByText('$9.00')).toBeTruthy();
  });

  it('L: earnings failure with cache shows a visibly stale state', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SAVED_RECORD));
    global.fetch = vi.fn(async () => { throw new Error('offline'); });
    renderReferral();
    await waitFor(() => expect(screen.getByText(/Saved data — not live/i)).toBeTruthy());
    // Saved values still shown, but labeled stale — and retry is offered.
    expect(screen.getByText('$2.50')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Retry live stats/i })).toBeTruthy();
  });

  it('M/P: earnings failure without usable data is unavailable, not a fake zero', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: 'ABC123', email: '' }));
    global.fetch = vi.fn(async () => { throw new Error('offline'); });
    renderReferral();
    await waitFor(() => expect(screen.getByText('Stats unavailable')).toBeTruthy());
    expect(screen.getByText('Unknown')).toBeTruthy();
    expect(screen.queryByText('$0.00')).toBeNull();
    expect(screen.getByText(/currently unavailable/i)).toBeTruthy();
  });

  it('O: canonical referral API URLs never create /api/api', () => {
    for (const path of ['/referrals/earnings', '/referrals/register', '/referrals/ABC123/click']) {
      expect(apiUrl(path)).not.toContain('/api/api/');
      expect(apiUrl(`/api${path}`)).not.toContain('/api/api/');
    }
  });
});

describe('Layout referral click tracking', () => {
  it('N: click ping failure does not break navigation', async () => {
    window.location.hash = '#/?ref=TEST99';
    const fetchMock = vi.fn(async () => { throw new Error('offline'); });
    global.fetch = fetchMock;
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/']}>
          <Layout>
            <div>page child</div>
          </Layout>
        </MemoryRouter>
      </HelmetProvider>
    );
    await waitFor(() => expect(screen.getByText('page child')).toBeTruthy());
    // Attribution keys are still stored for checkout even when the ping fails.
    expect(window.localStorage.getItem('pva:inbound-ref')).toBe('TEST99');
    window.location.hash = '';
  });

  it('N: click ping is deduplicated per code per session (no storms)', async () => {
    window.location.hash = '#/?ref=DEDUP1';
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
    global.fetch = fetchMock;
    const { unmount } = render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/']}>
          <Layout>
            <div>first mount</div>
          </Layout>
        </MemoryRouter>
      </HelmetProvider>
    );
    unmount();
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/']}>
          <Layout>
            <div>second mount</div>
          </Layout>
        </MemoryRouter>
      </HelmetProvider>
    );
    await waitFor(() => expect(screen.getByText('second mount')).toBeTruthy());
    const clickCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/click'));
    expect(clickCalls.length).toBe(1);
    window.location.hash = '';
  });
});
