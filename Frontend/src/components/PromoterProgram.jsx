import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  signupPromoter,
  promoterQrUrl,
  redeemPromoCode,
  fetchPromoterMine,
  fetchMarketplaceItems,
} from '../lib/api';
import './PromoterProgram.css';

const STORE_KEY = 'pva:promoter-code';

function readStoredCode() {
  try {
    return String(globalThis.localStorage?.getItem(STORE_KEY) || '').trim().toUpperCase();
  } catch {
    return '';
  }
}

export default function PromoterProgram() {
  const [searchParams] = useSearchParams();
  const urlPromoter = String(searchParams.get('promoter') || '').trim().toUpperCase();

  const [form, setForm] = useState({ name: '', email: '', handle: '', platform: 'Instagram' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [promoter, setPromoter] = useState(null);

  const [items, setItems] = useState([]);
  const [copied, setCopied] = useState('');
  const [ledger, setLedger] = useState(null);

  const [redeem, setRedeem] = useState({ code: readStoredCode(), itemId: '', buyerName: '', buyerEmail: '', buyerNote: '' });
  const [redeemResult, setRedeemResult] = useState(null);
  const [redeemError, setRedeemError] = useState('');
  const [redeemBusy, setRedeemBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchMarketplaceItems({ limit: 8 }).then((res) => {
      if (mounted && res?.ok && Array.isArray(res.items)) setItems(res.items);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const code = urlPromoter || readStoredCode();
    if (!code) return;
    setPromoter((prev) => prev || { code });
    fetchPromoterMine(code).then((res) => {
      if (res.ok) {
        setPromoter(res.promoter);
        setLedger(res.redemptions);
        try {
          globalThis.localStorage?.setItem(STORE_KEY, res.promoter.code);
        } catch {}
      }
    }).catch(() => {});
  }, [urlPromoter]);

  const shareUrl = useMemo(() => (promoter?.code ? `${globalThis.location.origin}${globalThis.location.pathname}#/marketplace?ref=${promoter.code}` : ''), [promoter]);

  const submitSignup = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const res = await signupPromoter(form);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Signup failed');
      return;
    }
    setPromoter(res.promoter);
    try {
      globalThis.localStorage?.setItem(STORE_KEY, res.promoter.code);
    } catch {}
    fetchPromoterMine(res.promoter.code).then((r) => {
      if (r.ok) setLedger(r.redemptions);
    }).catch(() => {});
  };

  const copy = async (text, label) => {
    try {
      await globalThis.navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1800);
    } catch {}
  };

  const submitRedeem = async (event) => {
    event.preventDefault();
    setRedeemBusy(true);
    setRedeemError('');
    setRedeemResult(null);
    const res = await redeemPromoCode(redeem);
    setRedeemBusy(false);
    if (!res.ok) {
      setRedeemError(res.error || 'Could not submit');
      return;
    }
    setRedeemResult(res);
    if (redeem.code) {
      fetchPromoterMine(redeem.code).then((r) => {
        if (r.ok) {
          setLedger(r.redemptions);
          setPromoter(r.promoter);
        }
      }).catch(() => {});
    }
  };

  return (
    <section className="promoter-program" id="promoter">
      <header className="pva-section-intro pva-section-intro--tight">
        <span className="pva-section-intro__badge">Consignment deals</span>
        <h2 className="pva-section-intro__title">Sell our pieces. Earn your share.</h2>
        <p className="pva-section-intro__promise">
          Sign up, get your own four-letter token and QR code, share any marketplace item anywhere you post.
          When a buyer orders with your code, you earn a share of the sale - 5% to 50% depending on the
          piece's price. We handle the rest by email.
        </p>
      </header>

      <div className="promoter-grid">
        <div className="promoter-card">
          <h3>{promoter ? 'Your promoter card' : 'Become a promoter'}</h3>
          {!promoter ? (
            <form className="promoter-form" onSubmit={submitSignup}>
              <label>
                Your name
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </label>
              <div className="promoter-form-row">
                <label>
                  Social handle (optional)
                  <input
                    value={form.handle}
                    onChange={(e) => setForm((p) => ({ ...p, handle: e.target.value }))}
                    placeholder="@yourhandle"
                  />
                </label>
                <label>
                  Main platform
                  <select
                    value={form.platform}
                    onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                  >
                    {['Instagram', 'TikTok', 'YouTube', 'X / Twitter', 'WhatsApp', 'In person', 'Other'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </label>
              </div>
              {error ? <p className="promoter-error" role="alert">{error}</p> : null}
              <button type="submit" className="pva-btn pva-btn--primary" disabled={busy}>
                {busy ? 'Creating…' : 'Get my token + QR'}
              </button>
            </form>
          ) : (
            <div className="promoter-card-result">
              <div className="promoter-token" aria-label="Your promoter token">
                {promoter.code}
              </div>
              <p className="promoter-note">
                Share links ending in <code>?ref={promoter.code}</code> - or let people scan your QR.
                When they order with your token, your share is calculated automatically.
              </p>
              <img
                className="promoter-qr"
                src={promoterQrUrl(promoter.code)}
                alt={`QR code for promoter ${promoter.code}`}
              />
              <div className="promoter-actions">
                <button type="button" className="pva-btn pva-btn--ghost" onClick={() => copy(shareUrl, 'link')}>
                  {copied === 'link' ? 'Copied!' : 'Copy share link'}
                </button>
                <a className="pva-btn pva-btn--ghost" href={promoterQrUrl(promoter.code)} download={`pva-promoter-${promoter.code}.png`}>
                  Download QR
                </a>
              </div>
              {ledger ? (
                <p className="promoter-stats">
                  {ledger.length} order{ledger.length === 1 ? '' : 's'} through your code
                  {' · '}earned ${(promoter.earnedCents / 100).toFixed(2)} pending confirmation
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="promoter-card">
          <h3>Share an item</h3>
          {items.length === 0 ? (
            <p className="promoter-note">Marketplace items load here once the shelf has pieces.</p>
          ) : (
            <ul className="promoter-items">
              {items.map((item) => {
                const slug = item.slug || item.id;
                const url = promoter?.code
                  ? `${globalThis.location.origin}${globalThis.location.pathname}#/marketplace/${encodeURIComponent(slug)}?ref=${promoter.code}`
                  : `${globalThis.location.origin}${globalThis.location.pathname}#/marketplace/${encodeURIComponent(slug)}`;
                return (
                  <li key={slug}>
                    <span>{item.name || item.title}</span>
                    <button
                      type="button"
                      className="pva-btn pva-btn--ghost"
                      onClick={() => copy(url, slug)}
                      disabled={!promoter?.code}
                      title={promoter?.code ? url : 'Sign up first to get your code'}
                    >
                      {copied === slug ? 'Copied!' : 'Copy my link'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!promoter?.code ? (
            <p className="promoter-note">Sign up first - your links carry your token automatically.</p>
          ) : null}
        </div>

        <div className="promoter-card">
          <h3>Ordering with a token</h3>
          <p className="promoter-note">
            Buying something a promoter shared? Submit their token with your details - the desk confirms
            your order and their share by email.
          </p>
          <form className="promoter-form" onSubmit={submitRedeem}>
            <div className="promoter-form-row">
              <label>
                Token
                <input
                  value={redeem.code}
                  onChange={(e) => setRedeem((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  maxLength={4}
                  required
                />
              </label>
              <label>
                Item
                <select
                  value={redeem.itemId}
                  onChange={(e) => setRedeem((p) => ({ ...p, itemId: e.target.value }))}
                  required
                >
                  <option value="">Choose an item…</option>
                  {items.map((item) => (
                    <option key={item.slug || item.id} value={item.slug || item.id}>
                      {item.name || item.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Your name
              <input
                value={redeem.buyerName}
                onChange={(e) => setRedeem((p) => ({ ...p, buyerName: e.target.value }))}
                required
              />
            </label>
            <label>
              Your email
              <input
                type="email"
                value={redeem.buyerEmail}
                onChange={(e) => setRedeem((p) => ({ ...p, buyerEmail: e.target.value }))}
                required
              />
            </label>
            <label>
              Note (optional)
              <textarea
                rows={2}
                value={redeem.buyerNote}
                onChange={(e) => setRedeem((p) => ({ ...p, buyerNote: e.target.value }))}
                placeholder="Questions, shipping destination, offer…"
              />
            </label>
            {redeemError ? <p className="promoter-error" role="alert">{redeemError}</p> : null}
            {redeemResult ? (
              <p className="promoter-success" role="status">
                Received - {redeemResult.promoter.name} earns {redeemResult.commissionPercent}% on this
                order. Watch your email for confirmation.
              </p>
            ) : null}
            <button type="submit" className="pva-btn pva-btn--primary" disabled={redeemBusy}>
              {redeemBusy ? 'Sending…' : 'Submit to the desk'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
