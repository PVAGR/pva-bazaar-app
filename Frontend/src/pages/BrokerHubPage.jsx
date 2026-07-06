import React, { useEffect, useMemo, useState } from 'react';
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
  const [search, setSearch] = useState('');

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [cRes, ctRes, tRes, dRes] = await Promise.all([
        apiGet('/commodities', { params: { limit: 10 } }),
        apiGet('/contacts', { params: { limit: 10 } }),
        apiGet('/templates', { params: { limit: 10 } }),
        apiGet('/deals', { params: { limit: 10 } }),
      ]);
      if (cRes?.ok && Array.isArray(cRes.items)) setCommodities(cRes.items);
      if (ctRes?.ok && Array.isArray(ctRes.items)) setContacts(ctRes.items);
      if (tRes?.ok && Array.isArray(tRes.items)) setTemplates(tRes.items);
      if (dRes?.ok && Array.isArray(dRes.items)) setDeals(dRes.items);
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const searchLower = search.toLowerCase().trim();
  const filteredCommodities = searchLower
    ? commodities.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(searchLower) ||
          (c.category || '').toLowerCase().includes(searchLower),
      )
    : commodities;
  const filteredContacts = searchLower
    ? contacts.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(searchLower) ||
          (c.company || '').toLowerCase().includes(searchLower),
      )
    : contacts;
  const filteredTemplates = searchLower
    ? templates.filter((t) => (t.name || '').toLowerCase().includes(searchLower))
    : templates;
  const summary = useMemo(() => {
    const activeDeals = deals.filter(
      (deal) =>
        !['completed', 'cancelled', 'closed'].includes(String(deal?.status || '').toLowerCase()),
    ).length;
    return [
      { label: 'Tracked commodities', value: commodities.length },
      { label: 'CRM contacts', value: contacts.length },
      { label: 'Active deals', value: activeDeals },
      { label: 'Reusable templates', value: templates.length },
    ];
  }, [commodities.length, contacts.length, deals, templates.length]);

  return (
    <div className="broker-hub admin-page authenticated">
      <header className="admin-header broker-hub-header">
        <div className="broker-hub-header__row">
          <div>
            <h1>Broker Hub</h1>
            <p className="muted">
              All-in-one: research commodities, manage contacts, use templates, track deals, and
              move through the pure-life bazaar.
            </p>
          </div>
          <div className="broker-hub-actions">
            <Link to="/chat" className="btn primary">
              Chat with Richard AI
            </Link>
            <Link to="/deals" className="btn ghost">
              Deals
            </Link>
            <button className="btn ghost" onClick={loadAll} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>
      </header>
      <AdminNav />

      <main className="broker-hub-main">
        {error ? (
          <ErrorBanner message={error} onRetry={loadAll} onDismiss={() => setError('')} />
        ) : null}

        <section className="card broker-atlas">
          <h2>Private atlas</h2>
          <p className="muted">
            Keep the brokerage side connected to the same routes as the rest of the site.
          </p>
          <div className="broker-atlas-links">
            <Link to="/" className="btn ghost">
              Home
            </Link>
            <Link to="/archive" className="btn ghost">
              Archive
            </Link>
            <Link to="/recovery" className="btn ghost">
              Recovery
            </Link>
            <Link to="/marketplace" className="btn ghost">
              Marketplace
            </Link>
            <Link to="/creator" className="btn ghost">
              Creator Portal
            </Link>
            <Link to="/dashboard" className="btn ghost">
              Command Center
            </Link>
          </div>
        </section>

        <section className="card broker-flow-card">
          <div className="broker-flow-card__head">
            <div>
              <h2>Business flow</h2>
              <p className="muted">
                Capture the opportunity, qualify the relationship, then turn it into a structured
                deal.
              </p>
            </div>
            <div className="broker-summary-grid">
              {summary.map((item) => (
                <div key={item.label} className="broker-summary-pill">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="broker-flow-grid">
            <article className="broker-flow-step">
              <h3>1. Capture the lead</h3>
              <p>
                Add the supplier, buyer, producer, or distributor to CRM first so every opportunity
                starts with a real record.
              </p>
              <Link to="/contacts" className="btn primary">
                Open contacts CRM
              </Link>
            </article>
            <article className="broker-flow-step">
              <h3>2. Define the goods</h3>
              <p>
                Track the commodity, category, or sourcing lane so the opportunity stays tied to
                something concrete.
              </p>
              <Link to="/commodities" className="btn ghost">
                Open commodities
              </Link>
            </article>
            <article className="broker-flow-step">
              <h3>3. Draft the deal</h3>
              <p>
                Move the qualified contact into a real deal with parties, milestones, payment
                schedule, and an audit trail.
              </p>
              <Link to="/deals" className="btn ghost">
                Open deals workspace
              </Link>
            </article>
          </div>
        </section>

        <section className="card">
          <h2>Quick search</h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commodities, contacts, templates..."
            className="search-input"
          />
        </section>

        {loading ? (
          <LoadingSpinner label="Loading..." />
        ) : (
          <>
            <section className="card">
              <h2>Quick actions</h2>
              <div className="quick-actions">
                <Link to="/contacts" className="btn primary">
                  Capture contact
                </Link>
                <Link to="/commodities" className="btn primary">
                  Add commodity
                </Link>
                <Link to="/deals" className="btn primary">
                  Draft deal
                </Link>
                <Link to="/templates" className="btn primary">
                  Open templates
                </Link>
              </div>
            </section>

            <div className="hub-grid">
              <section className="card">
                <h2>
                  <Link to="/commodities">Commodities</Link>
                </h2>
                {filteredCommodities.length === 0 ? <div className="muted">None yet</div> : null}
                <ul className="hub-list">
                  {filteredCommodities.slice(0, 8).map((c) => (
                    <li key={c._id}>
                      <Link to="/commodities">{c.name}</Link>
                      <span className="muted small">{c.category || ''}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card">
                <h2>
                  <Link to="/contacts">Contacts</Link>
                </h2>
                {filteredContacts.length === 0 ? <div className="muted">None yet</div> : null}
                <ul className="hub-list">
                  {filteredContacts.slice(0, 8).map((c) => (
                    <li key={c._id}>
                      <Link to="/contacts">{c.name}</Link>
                      <span className="muted small">{c.type || c.company || ''}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card">
                <h2>
                  <Link to="/templates">Templates</Link>
                </h2>
                {filteredTemplates.length === 0 ? (
                  <div className="muted">None yet. Run seed or create one.</div>
                ) : null}
                <ul className="hub-list">
                  {filteredTemplates.slice(0, 8).map((t) => (
                    <li key={t._id}>
                      <Link to="/templates">{t.name}</Link>
                      <span className="muted small">{t.type}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card">
                <h2>
                  <Link to="/deals">Deals</Link>
                </h2>
                {deals.length === 0 ? <div className="muted">None yet</div> : null}
                <ul className="hub-list">
                  {deals.slice(0, 8).map((d) => (
                    <li key={d._id}>
                      <Link to="/deals">{d.title}</Link>
                      <span className="muted small">
                        {d.status} · {d.currency} {d.totalAmount || 0}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
