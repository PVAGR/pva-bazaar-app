import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchArchiveEntriesSafe } from '../lib/archiveFeed';
import './RecoveryPage.css';

const MAX_RECENT = 4;

function readStorage(storage) {
  if (!storage) return {};
  const payload = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    payload[key] = storage.getItem(key);
  }
  return payload;
}

function triggerDownload(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function RecoveryPage() {
  const [archiveEntries, setArchiveEntries] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [archiveError, setArchiveError] = useState('');
  const [backendUrl, setBackendUrl] = useState('');
  const [backendStatus, setBackendStatus] = useState('Loading');
  const [backendDetail, setBackendDetail] = useState('Checking configured API base...');
  const [snapshotMessage, setSnapshotMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadArchive = async () => {
      setArchiveLoading(true);
      setArchiveError('');
      const result = await fetchArchiveEntriesSafe({ limit: MAX_RECENT, sort: 'new' });
      if (cancelled) return;
      if (result.ok) {
        setArchiveEntries(Array.isArray(result.items) ? result.items.slice(0, MAX_RECENT) : []);
      } else {
        setArchiveEntries([]);
        setArchiveError(result.error || 'Unable to load archive entries right now.');
      }
      setArchiveLoading(false);
    };

    loadArchive();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      try {
        const res = await fetch('/api-base.json', { cache: 'no-store' });
        const cfg = await res.json();
        const apiBase = String(cfg.apiUrl || '').replace(/\/+$/, '');
        if (cancelled) return;
        setBackendUrl(apiBase || 'Not configured');

        if (!apiBase) {
          setBackendStatus('No backend configured');
          setBackendDetail('Set api-base.json or the deployment env to point at the live API.');
          return;
        }

        const healthUrl = apiBase.endsWith('/api') ? `${apiBase}/health` : `${apiBase}/api/health`;
        const healthRes = await fetch(healthUrl, { headers: { Accept: 'application/json' } });
        const text = await healthRes.text();
        let body = text;
        try {
          body = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          /* keep raw body */
        }

        if (cancelled) return;
        setBackendStatus(healthRes.ok ? 'OK' : `Unavailable (${healthRes.status})`);
        setBackendDetail(body.slice(0, 500));
      } catch (error) {
        if (cancelled) return;
        setBackendUrl('Unknown');
        setBackendStatus('Error');
        setBackendDetail(String(error).slice(0, 240));
      }
    };

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const recentArchive = useMemo(() => {
    return archiveEntries.map((entry) => ({
      id: entry.id || entry._id || entry.externalId || entry.slug || entry.title,
      title: entry.title || entry.name || 'Untitled archive entry',
      excerpt: entry.excerpt || entry.summary || '',
      note: `${entry.date ? new Date(entry.date).toLocaleDateString() : 'Recent'} · ${entry.category || 'Archive'}`,
    }));
  }, [archiveEntries]);

  const exportContinuitySnapshot = () => {
    if (typeof window === 'undefined') return;
    const snapshot = {
      exportedAt: new Date().toISOString(),
      site: {
        title: document.title,
        href: window.location.href,
        path: window.location.hash || window.location.pathname,
      },
      device: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        standalone: Boolean(window.navigator?.standalone || window.matchMedia?.('(display-mode: standalone)')?.matches),
      },
      storage: {
        localStorage: readStorage(window.localStorage),
        sessionStorage: readStorage(window.sessionStorage),
      },
      currentBackend: backendUrl,
      recentArchive,
    };

    triggerDownload(snapshot, `pvabazaar-continuity-${new Date().toISOString().slice(0, 10)}.json`);
    setSnapshotMessage('Downloaded a continuity snapshot from this device.');
  };

  return (
    <div className="recovery-page">
      <section className="section-card recovery-hero">
        <div className="recovery-hero__copy">
          <p className="pill">Continuity</p>
          <h1>Recovery</h1>
          <p>
            This page keeps the site close when you move devices. It shows the live backend status, recent archive
            items, and a browser snapshot export you can save for continuity.
          </p>
          <div className="recovery-actions">
            <button type="button" className="button" onClick={exportContinuitySnapshot}>
              Download continuity snapshot
            </button>
            <Link className="button ghost" to="/download-app">Open install page</Link>
            <Link className="button secondary" to="/archive">Open archive</Link>
          </div>
          {snapshotMessage ? <p className="recovery-note">{snapshotMessage}</p> : null}
        </div>

        <aside className="recovery-hero__panel">
          <h2>What this page is for</h2>
          <ul>
            <li>Keep your archive and writings easy to reach.</li>
            <li>Export a local continuity bundle before switching devices.</li>
            <li>Confirm the backend is live before you trust the site for work.</li>
          </ul>
        </aside>
      </section>

      <section className="section-card recovery-grid-shell">
        <div className="section-heading">
          <div>
            <div className="pill">Status</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Live site health</h2>
          </div>
          <a className="button ghost" href="/status.html" target="_blank" rel="noreferrer">Open status page</a>
        </div>
        <div className="recovery-status-grid">
          <article className="recovery-status-card">
            <span className="recovery-status-label">Backend URL</span>
            <div className="recovery-status-value">{backendUrl || 'Loading...'}</div>
          </article>
          <article className="recovery-status-card">
            <span className="recovery-status-label">Health</span>
            <div className="recovery-status-value">{backendStatus}</div>
          </article>
        </div>
        <div className="recovery-status-detail">
          <span className="recovery-status-label">Response</span>
          <pre>{backendDetail}</pre>
        </div>
      </section>

      <section className="section-card recovery-grid-shell">
        <div className="section-heading">
          <div>
            <div className="pill">Memory</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Recent archive items</h2>
          </div>
          <Link className="button ghost" to="/archive">View all archive entries</Link>
        </div>
        {archiveLoading ? <p className="recovery-note">Loading recent archive entries...</p> : null}
        {!archiveLoading && archiveError ? <p className="recovery-note">{archiveError}</p> : null}
        {!archiveLoading && !archiveError && recentArchive.length === 0 ? (
          <p className="recovery-note">No archive entries were returned right now.</p>
        ) : null}
        {!archiveLoading && recentArchive.length > 0 ? (
          <div className="recovery-archive-grid">
            {recentArchive.map((entry) => (
              <article key={entry.id} className="recovery-archive-card">
                <h3>{entry.title}</h3>
                <p className="recovery-archive-note">{entry.note}</p>
                <p>{entry.excerpt || 'No excerpt available.'}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="section-card recovery-grid-shell">
        <div className="section-heading">
          <div>
            <div className="pill">Quick Actions</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Move through the suite</h2>
          </div>
        </div>
        <div className="recovery-link-grid">
          <Link className="recovery-link-card" to="/marketplace">
            <h3>Business side</h3>
            <p>Inventory, sourcing, fulfillment, and trade surfaces.</p>
          </Link>
          <Link className="recovery-link-card" to="/heelkawn">
            <h3>HeelKawn</h3>
            <p>Open the game hub and build/download links.</p>
          </Link>
          <Link className="recovery-link-card" to="/conference">
            <h3>Governance</h3>
            <p>Proposal flow, conference context, and public decisions.</p>
          </Link>
          <Link className="recovery-link-card" to="/about">
            <h3>About</h3>
            <p>Site context, personal background, and purpose.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
