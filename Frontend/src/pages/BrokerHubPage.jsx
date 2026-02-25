import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import AdminNav from '../components/AdminNav.jsx';
import { getErrorMessage } from '../lib/errorUtils';
import '../styles/admin-common.css';
import './BrokerHubPage.css';

export default function BrokerHubPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commodities, setCommodities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [deals, setDeals] = useState([]);
  const [vaultNotes, setVaultNotes] = useState([]);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef(null);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [cRes, ctRes, tRes, dRes, vRes] = await Promise.all([
        apiGet('/commodities', { params: { limit: 25 } }),
        apiGet('/contacts', { params: { limit: 25 } }),
        apiGet('/templates', { params: { limit: 25 } }),
        apiGet('/deals', { params: { limit: 25 } }),
        apiGet('/vault-notes', { params: { limit: 25 } }),
      ]);
      if (cRes?.ok && Array.isArray(cRes.items)) setCommodities(cRes.items);
      if (ctRes?.ok && Array.isArray(ctRes.items)) setContacts(ctRes.items);
      if (tRes?.ok && Array.isArray(tRes.items)) setTemplates(tRes.items);
      if (dRes?.ok && Array.isArray(dRes.items)) setDeals(dRes.items);
      if (vRes?.ok && Array.isArray(vRes.items)) setVaultNotes(vRes.items);
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const searchLower = search.toLowerCase().trim();
  const filteredCommodities = searchLower
    ? commodities.filter((c) => (c.name || '').toLowerCase().includes(searchLower) || (c.category || '').toLowerCase().includes(searchLower))
    : commodities;
  const filteredContacts = searchLower
    ? contacts.filter((c) => (c.name || '').toLowerCase().includes(searchLower) || (c.company || '').toLowerCase().includes(searchLower))
    : contacts;
  const filteredTemplates = searchLower
    ? templates.filter((t) => (t.name || '').toLowerCase().includes(searchLower))
    : templates;
  const filteredVaultNotes = searchLower
    ? vaultNotes.filter((v) => (v.title || '').toLowerCase().includes(searchLower) || (v.content || '').toLowerCase().includes(searchLower))
    : vaultNotes;
  const filteredDeals = searchLower
    ? deals.filter((d) => (d.title || '').toLowerCase().includes(searchLower) || (d.counterparty?.name || '').toLowerCase().includes(searchLower))
    : deals;

  return (
    <div className="broker-hub admin-page authenticated">
      <Helmet><title>Broker Hub | PVA Bazaar</title></Helmet>
      <header className="admin-header broker-hub-header">
        <div className="broker-hub-header__row">
          <div>
            <h1>Broker Hub</h1>
            <p className="muted">All-in-one: research commodities, manage contacts, use templates, track deals.</p>
          </div>
          <div className="broker-hub-actions">
            <Link to="/chat" className="btn primary">Chat with Richard AI</Link>
            <Link to="/deals" className="btn ghost">Deals</Link>
            <button className="btn ghost" onClick={loadAll} disabled={loading}>Refresh</button>
          </div>
        </div>
      </header>
      <AdminNav />

      <main className="broker-hub-main">
        {error ? <ErrorBanner message={error} onRetry={loadAll} onDismiss={() => setError('')} /> : null}

        <section className="card">
          <h2>Quick search</h2>
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commodities, contacts, templates, deals, vault notes... (press / to focus)"
            className="search-input"
            aria-label="Search commodities, contacts, templates, deals, vault notes"
          />
        </section>

        {loading ? (
          <LoadingSpinner label="Loading..." />
        ) : (
          <>
            <section className="card">
              <h2>Quick actions</h2>
              <div className="quick-actions">
                <Link to="/commodities" className="btn primary">New commodity</Link>
                <Link to="/contacts" className="btn primary">New contact</Link>
                <Link to="/deals" className="btn primary">New deal</Link>
                <Link to="/templates" className="btn primary">New template</Link>
                <Link to="/vault" className="btn primary">Vault note</Link>
              </div>
            </section>

            <div className="hub-grid">
              <section className="card">
                <h2>
                  <Link to="/commodities">Commodities</Link>
                  {filteredCommodities.length > 0 ? <span className="muted"> ({filteredCommodities.length})</span> : null}
                </h2>
                {filteredCommodities.length === 0 ? <div className="muted">None yet. Run npm run seed:commodities</div> : null}
                <ul className="hub-list">
                  {filteredCommodities.slice(0, 8).map((c) => (
                    <li key={c._id}>
                      <Link to={`/commodities?selected=${c._id}`}>{c.name}</Link>
                      <span className="muted small">{c.category || ''}</span>
                    </li>
                  ))}
                </ul>
                {filteredCommodities.length > 8 ? <Link to="/commodities" className="muted small" style={{ display: 'inline-block', marginTop: 6 }}>View all ({filteredCommodities.length}) →</Link> : null}
              </section>

              <section className="card">
                <h2>
                  <Link to="/contacts">Contacts</Link>
                  {filteredContacts.length > 0 ? <span className="muted"> ({filteredContacts.length})</span> : null}
                </h2>
                {filteredContacts.length === 0 ? <div className="muted">None yet</div> : null}
                <ul className="hub-list">
                  {filteredContacts.slice(0, 8).map((c) => (
                    <li key={c._id}>
                      <Link to={`/contacts?selected=${c._id}`}>{c.name}</Link>
                      <span className="muted small">{c.type || c.company || ''}</span>
                    </li>
                  ))}
                </ul>
                {filteredContacts.length > 8 ? <Link to="/contacts" className="muted small" style={{ display: 'inline-block', marginTop: 6 }}>View all ({filteredContacts.length}) →</Link> : null}
              </section>

              <section className="card">
                <h2>
                  <Link to="/templates">Templates</Link>
                  {filteredTemplates.length > 0 ? <span className="muted"> ({filteredTemplates.length})</span> : null}
                </h2>
                {filteredTemplates.length === 0 ? <div className="muted">None yet. Run npm run seed:templates</div> : null}
                <ul className="hub-list">
                  {filteredTemplates.slice(0, 8).map((t) => (
                    <li key={t._id}>
                      <Link to={`/templates?selected=${t._id}`}>{t.name}</Link>
                      <span className="muted small">{t.type}</span>
                    </li>
                  ))}
                </ul>
                {filteredTemplates.length > 8 ? <Link to="/templates" className="muted small" style={{ display: 'inline-block', marginTop: 6 }}>View all ({filteredTemplates.length}) →</Link> : null}
              </section>

              <section className="card">
                <h2>
                  <Link to="/deals">Deals</Link>
                  {filteredDeals.length > 0 ? <span className="muted"> ({filteredDeals.length})</span> : null}
                </h2>
                {filteredDeals.length === 0 ? <div className="muted">None yet</div> : null}
                <ul className="hub-list">
                  {filteredDeals.slice(0, 8).map((d) => (
                    <li key={d._id}>
                      <Link to={`/deals?selected=${d._id}`}>{d.title}</Link>
                      <span className="muted small">{d.stage || 'procurement'} · {d.currency} {d.totalAmount || 0}</span>
                    </li>
                  ))}
                </ul>
                {filteredDeals.length > 8 ? <Link to="/deals" className="muted small" style={{ display: 'inline-block', marginTop: 6 }}>View all ({filteredDeals.length}) →</Link> : null}
              </section>

              <section className="card">
                <h2>
                  <Link to="/vault">Vault notes</Link>
                  {filteredVaultNotes.length > 0 ? <span className="muted"> ({filteredVaultNotes.length})</span> : null}
                </h2>
                {filteredVaultNotes.length === 0 ? <div className="muted">None yet</div> : null}
                <ul className="hub-list">
                  {filteredVaultNotes.slice(0, 8).map((v) => (
                    <li key={v._id}>
                      <Link to={`/vault?selected=${v._id}`}>{v.title || 'Untitled'}</Link>
                      <span className="muted small">{v.recordType}</span>
                    </li>
                  ))}
                </ul>
                {filteredVaultNotes.length > 8 ? <Link to="/vault" className="muted small" style={{ display: 'inline-block', marginTop: 6 }}>View all ({filteredVaultNotes.length}) →</Link> : null}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
