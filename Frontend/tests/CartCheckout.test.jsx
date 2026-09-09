import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { MemoryRouter } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { HelmetProvider } from 'react-helmet-async';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import CartPage from '../src/pages/CartPage.jsx';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import CheckoutSuccessPage from '../src/pages/CheckoutSuccessPage.jsx';

vi.mock('../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchItemsByIds: vi.fn(),
    createCartSession: vi.fn(),
    fetchCheckoutSession: vi.fn(),
    finalizeCheckoutSession: vi.fn(),
  };
});

const api = await import('../src/lib/api.js');

const CART_KEY = 'pva:cart';
const STASH_KEY = 'pva:checkout-session';

function renderWithProviders(ui, route = '/cart') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </HelmetProvider>
  );
}

const ITEM_A = { _id: 'a', id: 'a', slug: 'item-a', name: 'Item A', priceCents: 500, media: [] };
const ITEM_B = { _id: 'b', id: 'b', slug: 'item-b', name: 'Item B', priceCents: 700, media: [] };

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CartPage trust', () => {
  it('J/N: valid cart loads server details; total comes from server prices', async () => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(['a', 'b']));
    api.fetchItemsByIds.mockResolvedValue({ ok: true, items: [ITEM_A, ITEM_B] });
    renderWithProviders(<CartPage />);
    await waitFor(() => expect(screen.getByText('Item A')).toBeTruthy());
    expect(screen.getByText('Item B')).toBeTruthy();
    expect(screen.getByText(/Total: \$12\.00/)).toBeTruthy();
  });

  it('K: corrupted cart fails safely to an empty cart', async () => {
    window.localStorage.setItem(CART_KEY, 'not-json{{{');
    renderWithProviders(<CartPage />);
    await waitFor(() => expect(screen.getByText(/Your cart is empty/i)).toBeTruthy());
  });

  it('L: cart never presents itself as a submitted order', async () => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(['a']));
    api.fetchItemsByIds.mockResolvedValue({ ok: true, items: [ITEM_A] });
    renderWithProviders(<CartPage />);
    await waitFor(() => expect(screen.getByText('Item A')).toBeTruthy());
    expect(screen.queryByText(/order reference/i)).toBeNull();
    expect(screen.queryByText(/payment confirmed/i)).toBeNull();
  });

  it('M: sold/deleted ids are called out as unavailable, not priced', async () => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(['a', 'gone']));
    api.fetchItemsByIds.mockResolvedValue({ ok: true, items: [ITEM_A] });
    renderWithProviders(<CartPage />);
    await waitFor(() => expect(screen.getByText(/no longer available online/i)).toBeTruthy());
    expect(screen.getByText(/Total: \$5\.00/)).toBeTruthy();
  });

  it('cart load failure keeps saved ids and offers retry (not fake-empty)', async () => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(['a']));
    api.fetchItemsByIds.mockResolvedValue({ ok: false, items: [], error: 'Backend down' });
    renderWithProviders(<CartPage />);
    await waitFor(() => expect(screen.getByText('Backend down')).toBeTruthy());
    expect(screen.getByText(/still in your cart/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem(CART_KEY))).toEqual(['a']);
  });

  it('O/P: failed checkout keeps the cart and shows an actionable error', async () => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(['a']));
    api.fetchItemsByIds.mockResolvedValue({ ok: true, items: [ITEM_A] });
    api.createCartSession.mockResolvedValue({ ok: false, error: 'Item sold out' });
    const user = userEvent.setup();
    renderWithProviders(<CartPage />);
    await waitFor(() => expect(screen.getByText('Item A')).toBeTruthy());
    await user.click(screen.getByRole('button', { name: /Checkout \(1 item\)/i }));
    await waitFor(() => expect(screen.getByText(/Item sold out/i)).toBeTruthy());
    expect(JSON.parse(window.localStorage.getItem(CART_KEY))).toEqual(['a']);
    expect(window.sessionStorage.getItem(STASH_KEY)).toBeNull();
  });

  it('Q/R: successful session stashes ids for post-payment clearing (one call)', async () => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(['a']));
    api.fetchItemsByIds.mockResolvedValue({ ok: true, items: [ITEM_A] });
    api.createCartSession.mockResolvedValue({ ok: true, url: 'https://stripe.test/session/x' });
    const hrefSpy = vi.fn();
    Object.defineProperty(window, 'location', { value: {}, writable: true, configurable: true });
    Object.defineProperty(window.location, 'href', { set: hrefSpy, configurable: true });
    try {
      const user = userEvent.setup();
      renderWithProviders(<CartPage />);
      await waitFor(() => expect(screen.getByText('Item A')).toBeTruthy());
      await user.click(screen.getByRole('button', { name: /Checkout \(1 item\)/i }));
      await waitFor(() => expect(hrefSpy).toHaveBeenCalledWith('https://stripe.test/session/x'));
      expect(api.createCartSession).toHaveBeenCalledTimes(1);
      // Cart is NOT cleared pre-payment; the stash drives post-paid clearing.
      expect(JSON.parse(window.localStorage.getItem(CART_KEY))).toEqual(['a']);
      expect(JSON.parse(window.sessionStorage.getItem(STASH_KEY)).ids).toEqual(['a']);
    } finally {
      delete window.location;
    }
  });
});

describe('CheckoutSuccessPage trust', () => {
  const SESSION = { id: 'sess_1', payment_status: 'paid', amount_total: 500, currency: 'usd' };

  it('paid + finalized clears exactly the session items and shows the order ref', async () => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(['a', 'keep']));
    window.sessionStorage.setItem(STASH_KEY, JSON.stringify({ ids: ['a'] }));
    api.fetchCheckoutSession.mockResolvedValue({ ok: true, session: SESSION });
    api.finalizeCheckoutSession.mockResolvedValue({ ok: true, finalized: true, orderId: 'order-1' });
    renderWithProviders(<CheckoutSuccessPage />, '/checkout/success?session_id=sess_1');
    await waitFor(() => expect(screen.getByText(/Payment confirmed/i)).toBeTruthy());
    await waitFor(() => expect(screen.getByText('order-1')).toBeTruthy());
    expect(JSON.parse(window.localStorage.getItem(CART_KEY))).toEqual(['keep']);
    expect(window.sessionStorage.getItem(STASH_KEY)).toBeNull();
  });

  it('unpaid session keeps the cart and says so', async () => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(['a']));
    api.fetchCheckoutSession.mockResolvedValue({
      ok: true,
      session: { ...SESSION, payment_status: 'unpaid' },
    });
    renderWithProviders(<CheckoutSuccessPage />, '/checkout/success?session_id=sess_1');
    await waitFor(() => expect(screen.getByText(/not paid/i)).toBeTruthy());
    expect(api.finalizeCheckoutSession).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem(CART_KEY))).toEqual(['a']);
  });

  it('finalize failure keeps the cart with guidance', async () => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(['a']));
    api.fetchCheckoutSession.mockResolvedValue({ ok: true, session: SESSION });
    api.finalizeCheckoutSession.mockResolvedValue({ ok: false, error: 'Order not found for session' });
    renderWithProviders(<CheckoutSuccessPage />, '/checkout/success?session_id=sess_1');
    await waitFor(() => expect(screen.getByText(/Order not found for session/i)).toBeTruthy());
    expect(JSON.parse(window.localStorage.getItem(CART_KEY))).toEqual(['a']);
  });
});
