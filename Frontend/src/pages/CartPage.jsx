import { useEffect, useState, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { Link } from 'react-router-dom';
import { fetchItemsByIds, createCartSession } from '../lib/api';

const CART_KEY = 'pva:cart';
const CHECKOUT_SESSION_KEY = 'pva:checkout-session';

/**
 * Cart trust model (canonical architecture):
 * - The cart is TEMPORARY client state: an array of item id strings in
 *   localStorage. It never implies an order, a price, or availability.
 * - Titles/images/prices shown here are DISPLAY cache from the last server
 *   revalidation, not authoritative checkout values. The backend re-resolves
 *   every price server-side when the checkout session is created.
 * - The cart is cleared only after a confirmed paid order (see
 *   CheckoutSuccessPage), never before the server confirms.
 */
function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // Fail safely on corrupt or legacy shapes: only string ids survive.
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((id) => String(id || '').trim()).filter(Boolean))].slice(0, 50);
  } catch { return []; }
}

function setCart(items) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* storage unavailable — ignore */ }
}

export function getCheckoutSessionStash() {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.ids)) return parsed;
  } catch { /* storage unavailable — ignore */ }
  return null;
}

export function stashCheckoutSession(ids) {
  try {
    sessionStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify({ ids, at: new Date().toISOString() }));
  } catch { /* storage unavailable — ignore */ }
}

export function clearCheckoutSessionStash() {
  try {
    sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
  } catch { /* storage unavailable — ignore */ }
}

export default function CartPage() {
  const [items, setItems] = useState(() => getCart());
  const [details, setDetails] = useState([]);
  const [unavailableIds, setUnavailableIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    const ids = getCart();
    setItems(ids);
    setUnavailableIds([]);
    setLoadError('');
    if (ids.length === 0) { setDetails([]); setLoading(false); return; }
    setLoading(true);
    // Revalidate every id against the server. Only published records come
    // back; sold/draft/deleted ids are reported as unavailable, never priced.
    fetchItemsByIds(ids)
      .then((res) => {
        if (!res.ok) {
          setDetails([]);
          setLoadError(res.error || 'Cart details could not be loaded from the online marketplace.');
          return;
        }
        const byId = new Map();
        for (const item of res.items) {
          const key = String(item?._id || item?.id || item?.slug || '');
          if (key) byId.set(key, item);
        }
        const found = [];
        const missing = [];
        for (const id of ids) {
          if (byId.has(id)) found.push(byId.get(id));
          else missing.push(id);
        }
        setDetails(found);
        setUnavailableIds(missing);
        setLoadError('');
      })
      .catch((e) => {
        setDetails([]);
        setLoadError(e?.message || 'Cart details could not be loaded from the online marketplace.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  function removeItem(id) {
    const next = items.filter(i => i !== id);
    setCart(next);
    setItems(next);
    setDetails(prev => prev.filter(d => d._id !== id && d.slug !== id && d.id !== id));
    setUnavailableIds(prev => prev.filter(u => u !== id));
  }

  function clearCart() {
    setCart([]);
    setItems([]);
    setDetails([]);
    setUnavailableIds([]);
  }

  async function handleCheckout() {
    if (items.length === 0) return;
    setCheckingOut(true);
    setError('');
    try {
      const res = await createCartSession(items);
      if (res.ok && res.url) {
        // Do NOT clear the cart here: payment has not happened yet. Stash the
        // session's item ids so the success page can clear exactly the paid
        // items after the server confirms payment.
        stashCheckoutSession(items);
        window.location.href = res.url;
      } else {
        setError(res.error || 'Checkout failed â€” your cart was kept for retry.');
      }
    } catch (e) {
      // Failed submission keeps the cart intact for retry. Never redirect.
      setError(`${e.message || 'Checkout error'} â€” your cart was kept for retry.`);
    } finally {
      setCheckingOut(false);
    }
  }

  const total = details.reduce((sum, d) => sum + (d.priceCents || 0), 0);

  return (
    <section className="section-card" style={{ maxWidth: '800px', margin: '2rem auto', padding: '1.5rem' }}>
      <h2>Shopping Cart</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--site-text-muted)' }}>
        Temporary list on this device â€” prices and availability are rechecked online at checkout.
      </p>
      {error ? <p style={{ color: '#b33737' }}>{error}</p> : null}
      {loading ? <p>Loading cart...</p> : loadError ? (
        <div>
          <p style={{ color: '#b33737' }} role="alert">{loadError}</p>
          <p>Your {items.length} saved item{items.length === 1 ? ' is' : 's are'} still in your cart below. <button onClick={refresh} className="book-publish__button">Retry</button></p>
        </div>
      ) : details.length === 0 && unavailableIds.length === 0 ? (
        <p>Your cart is empty. Browse the <Link to="/marketplace" className="link">Marketplace</Link> to add items.</p>
      ) : (
        <>
          {unavailableIds.length > 0 ? (
            <p style={{ color: '#8a5a00' }} role="status">
              {unavailableIds.length} saved item{unavailableIds.length === 1 ? ' is' : 's are'} no longer available online (sold, unpublished, or removed) and {unavailableIds.length === 1 ? 'was' : 'were'} excluded from checkout:{' '}
              {unavailableIds.join(', ')}
            </p>
          ) : null}
          <div style={{ borderBottom: '1px solid var(--site-border)', marginBottom: '1rem' }}>
            {details.map(d => (
              <div key={d._id || d.slug} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderTop: '1px solid var(--site-border)' }}>
                {d.media?.[0] ? <img src={d.media[0]} alt="" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }} /> : <div style={{ width: '60px', height: '60px', background: 'var(--site-bg-secondary)', borderRadius: '6px' }} />}
                <div style={{ flex: 1 }}>
                  <Link to={`/marketplace/${d.slug || d._id}`} style={{ fontWeight: 600, textDecoration: 'none' }}>{d.name || 'Item'}</Link>
                  <div style={{ fontSize: '0.85rem', color: 'var(--site-text-muted)' }}>${((d.priceCents || 0) / 100).toFixed(2)}</div>
                </div>
                <button onClick={() => removeItem(d._id || d.slug)} style={{ background: 'none', border: 'none', color: '#b33737', cursor: 'pointer', fontSize: '1.25rem' }} title="Remove">&times;</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '1.15rem' }}>Total: ${(total / 100).toFixed(2)}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={clearCart} className="book-publish__button" style={{ borderColor: '#b33737', color: '#b33737' }}>Clear</button>
              <button onClick={handleCheckout} disabled={checkingOut || details.length === 0} className="book-publish__button book-publish__button--primary" style={{ background: '#1a7d3a', color: '#fff', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '8px', cursor: checkingOut ? 'not-allowed' : 'pointer' }}>
                {checkingOut ? 'Redirecting...' : `Checkout (${details.length} item${details.length > 1 ? 's' : ''})`}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
