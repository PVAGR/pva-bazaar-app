import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { MemoryRouter } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { HelmetProvider } from 'react-helmet-async';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import PartnersPage from '../src/pages/PartnersPage.jsx';

const DRAFT_KEY = 'pva:partner-application-draft';
const RECEIPT_KEY = 'pva:partner-application-receipt';
const LEGACY_KEY = 'pva:partners-directory';

function mockFetch(handler) {
  global.fetch = vi.fn(handler);
}

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <PartnersPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

const ONLINE_PARTNER = {
  businessName: 'Nairobi Grain Co-op',
  slug: 'nairobi-grain-co-op',
  headline: 'Staple foods, honestly traded',
  summary: 'A farmer co-operative selling maize and beans.',
  businessType: 'Agriculture',
  website: 'https://example.com',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PartnersPage trust', () => {
  it('A/H: shows online approved records from the API (no localStorage needed)', async () => {
    mockFetch(async (url) => {
      if (String(url).includes('/partners/public')) {
        return { ok: true, json: async () => ({ ok: true, partners: [ONLINE_PARTNER] }) };
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('Nairobi Grain Co-op')).toBeTruthy());
    expect(screen.getByText(/online directory/i)).toBeTruthy();
    expect(screen.getByText(/approved partner/i)).toBeTruthy();
  });

  it('B: API failure shows an error and never renders browser records as approved', async () => {
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify([
      { id: 'local-1', name: 'Fake Local Biz', approved: true, description: 'x', categories: [] },
    ]));
    mockFetch(async () => { throw new Error('network down'); });
    renderPage();
    await waitFor(() => expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy());
    expect(screen.queryByRole('heading', { name: 'Fake Local Biz' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Nairobi Grain Co-op' })).toBeNull();
  });

  it('C/D/E: failed submission shows no success, keeps a device-only draft', async () => {
    mockFetch(async (url) => {
      if (String(url).includes('/partners/public')) {
        return { ok: true, json: async () => ({ ok: true, partners: [] }) };
      }
      if (String(url).includes('/partners/apply')) throw new Error('offline');
      throw new Error(`unexpected fetch ${url}`);
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply for listing' })).toBeTruthy());
    await user.click(screen.getByRole('button', { name: 'Apply for listing' }));
    await user.type(screen.getByPlaceholderText(/company or trading name/i), 'Test Biz');
    await user.type(screen.getByPlaceholderText(/what you trade/i), 'We sell things.');
    await user.type(screen.getByPlaceholderText(/contact@yourbusiness/i), 'owner@example.com');
    await user.click(screen.getByRole('button', { name: /Submit application/i }));

    await waitFor(() => expect(screen.getByText(/Application NOT submitted/i)).toBeTruthy());
    expect(screen.queryByText(/Application received online/i)).toBeNull();
    const draft = JSON.parse(window.localStorage.getItem(DRAFT_KEY));
    expect(draft.name).toBe('Test Biz');
  });

  it('E (retry path): failed draft is labeled device-only and offered for retry', async () => {
    mockFetch(async (url) => {
      if (String(url).includes('/partners/public')) {
        return { ok: true, json: async () => ({ ok: true, partners: [] }) };
      }
      throw new Error('offline');
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply for listing' })).toBeTruthy());
    await user.click(screen.getByRole('button', { name: 'Apply for listing' }));
    await user.type(screen.getByPlaceholderText(/company or trading name/i), 'Retry Biz');
    await user.type(screen.getByPlaceholderText(/what you trade/i), 'Retry goods.');
    await user.type(screen.getByPlaceholderText(/contact@yourbusiness/i), 'retry@example.com');
    await user.click(screen.getByRole('button', { name: /Submit application/i }));
    await waitFor(() => expect(screen.getByText(/saved on this device only, not submitted/i)).toBeTruthy());
  });

  it('F/G: successful submission requires the server response and never enters the public list', async () => {
    mockFetch(async (url, opts) => {
      if (String(url).includes('/partners/public')) {
        return { ok: true, json: async () => ({ ok: true, partners: [] }) };
      }
      if (String(url).includes('/partners/apply') && opts?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            data: { id: 'sub-123', name: 'Fresh Biz', email: 'fresh@example.com', status: 'new' },
          }),
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply for listing' })).toBeTruthy());
    await user.click(screen.getByRole('button', { name: 'Apply for listing' }));
    await user.type(screen.getByPlaceholderText(/company or trading name/i), 'Fresh Biz');
    await user.type(screen.getByPlaceholderText(/what you trade/i), 'Fresh goods.');
    await user.type(screen.getByPlaceholderText(/contact@yourbusiness/i), 'fresh@example.com');
    await user.click(screen.getByRole('button', { name: /Submit application/i }));

    await waitFor(() => expect(screen.getByText(/Application received online/i)).toBeTruthy());
    expect(screen.getByText(/sub-123/)).toBeTruthy();
    // The unapproved applicant must not appear in the public directory
    // (directory cards render names as headings; the receipt banner is text).
    expect(screen.queryByRole('heading', { name: 'Fresh Biz' })).toBeNull();
    const receipt = JSON.parse(window.localStorage.getItem(RECEIPT_KEY));
    expect(receipt.id).toBe('sub-123');
  });
});
