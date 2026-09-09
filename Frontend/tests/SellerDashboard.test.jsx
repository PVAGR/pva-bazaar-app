import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { MemoryRouter } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import UserDashboard from '../src/pages/UserDashboard.jsx';

vi.mock('../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, apiGet: vi.fn(), fetchTransactions: vi.fn() };
});

vi.mock('../src/lib/auth.js', () => ({ getToken: () => 'test-token' }));

const api = await import('../src/lib/api.js');

function renderDashboard() {
  return render(
    <MemoryRouter>
      <UserDashboard />
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('UserDashboard finance/order trust', () => {
  it('Y: failed sales + orders + transactions show unavailable, never fake zero/empty', async () => {
    api.apiGet.mockRejectedValue(new Error('Backend down'));
    api.fetchTransactions.mockResolvedValue(null);
    const user = userEvent.setup();
    renderDashboard();
    await waitFor(() => expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0));
    expect(screen.getByText(/Activity unavailable/i)).toBeTruthy();
    // No silent zero balances anywhere on the finance cards.
    expect(screen.queryByText('$0.00')).toBeNull();
    await user.click(screen.getByRole('button', { name: /My Orders/i }));
    await waitFor(() => expect(screen.getByText(/Order history unavailable/i)).toBeTruthy());
  });

  it('live data still renders exact values on success', async () => {
    api.apiGet.mockImplementation(async (url) => {
      if (String(url).startsWith('/orders/mine')) {
        return { ok: true, items: [{ _id: 'o1', itemName: 'Basket', amountTotal: 2500, paymentStatus: 'paid' }] };
      }
      if (String(url).startsWith('/sales/metrics')) {
        return { ok: true, totalSales: 25, thisMonth: 25, thisWeek: 0 };
      }
      if (String(url).startsWith('/items/mine')) return { ok: true, items: [] };
      return { ok: true, items: [] };
    });
    api.fetchTransactions.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => expect(screen.getAllByText('$25.00').length).toBeGreaterThanOrEqual(2));
  });
});
