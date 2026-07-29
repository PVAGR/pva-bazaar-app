import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, createCartSession } from '../lib/api';

const CART_KEY = 'pva:cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setCart(items) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch {}
}

export default function CartPage() {
  const [items, setItems] = useState(() => getCart());
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    const ids = getCart();
    setItems(ids);
    if (ids.length === 0) { setDetails([]); setLoading(false); return; }
    setLoading(true);
    apiGet('/artifacts', { params: { ids: ids.join(',') } })
      .then(data => {
        const list = data?.artifacts || [];
        const map = {};
        list.forEach(a => { const key = a._id || a.slug; if (key) map[key] = a; });
        setDetails(ids.map(id => map[id]).filter(Boolean));
      })
      .catch(() => setDetails([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  function removeItem(id) {
    const next = items.filter(i => i !== id);
    setCart(next);
    setItems(next);
    setDetails(prev => prev.filter(d => d._id !== id && d.slug !== id));
  }

  function clearCart() {
    setCart([]);
    setItems([]);
    setDetails([]);
  }

  async function handleCheckout() {
    if (items.length === 0) return;
    setCheckingOut(true);
    setError('');
    try {
      const res = await createCartSession(items);
      if (res.ok && res.url) {
        clearCart();
        window.location.href = res.url;
      } else {
        setError(res.error || 'Checkout failed');
      }
    } catch (e) {
      setError(e.message || 'Checkout error');
    } finally {
      setCheckingOut(false);
    }
  }

  const total = details.reduce((sum, d) => sum + (d.priceCents || 0), 0);

  return (
    <section className="section-card" style={{ maxWidth: '800px', margin: '2rem auto', padding: '1.5rem' }}>
      <h2>Shopping Cart</h2>
      {error ? <p style={{ color: '#b33737' }}>{error}</p> : null}
      {loading ? <p>Loading cart...</p> : details.length === 0 ? (
        <p>Your cart is empty. Browse the <Link to="/marketplace" className="link">Marketplace</Link> to add items.</p>
      ) : (
        <>
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
              <button onClick={handleCheckout} disabled={checkingOut} className="book-publish__button book-publish__button--primary" style={{ background: '#1a7d3a', color: '#fff', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '8px', cursor: checkingOut ? 'not-allowed' : 'pointer' }}>
                {checkingOut ? 'Redirecting...' : `Checkout (${details.length} item${details.length > 1 ? 's' : ''})`}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
