import React, { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '../lib/api';

export default function ManuscriptVersionPanel({ bookId, onRestore }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(null);
  const [snapshotMsg, setSnapshotMsg] = useState('');
  const [snapshotting, setSnapshotting] = useState(false);

  const load = useCallback(async () => {
    if (!bookId) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiGet(`/book-publishing/${bookId}/versions`);
      setVersions(data?.versions || []);
    } catch (e) {
      setError(e?.message || 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => { load(); }, [load]);

  async function takeSnapshot() {
    setSnapshotting(true);
    setSnapshotMsg('');
    try {
      await apiPost(`/book-publishing/${bookId}/versions`, { changeDescription: `Manual snapshot ${new Date().toLocaleString()}` });
      setSnapshotMsg('Snapshot saved');
      load();
    } catch (e) {
      setSnapshotMsg(e?.message || 'Failed');
    } finally {
      setSnapshotting(false);
      setTimeout(() => setSnapshotMsg(''), 3000);
    }
  }

  async function handleRestore(versionId) {
    if (!confirm('Restore this version? Current manuscript will be auto-saved as a new version first.')) return;
    setRestoring(versionId);
    try {
      await apiPost(`/book-publishing/${bookId}/versions/${versionId}/restore`);
      if (onRestore) onRestore();
      load();
    } catch (e) {
      alert(e?.message || 'Restore failed');
    } finally {
      setRestoring(null);
    }
  }

  if (!bookId) return null;

  return (
    <div className="book-publish__section" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--site-border)', paddingTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>Version History</h3>
        <button type="button" className="book-publish__button" onClick={takeSnapshot} disabled={snapshotting} style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}>
          {snapshotting ? 'Saving...' : 'Snapshot'}
        </button>
        {snapshotMsg ? <span style={{ fontSize: '0.8rem', color: '#1a7d3a' }}>{snapshotMsg}</span> : null}
      </div>

      {error ? <p style={{ color: '#b33737', fontSize: '0.85rem' }}>{error}</p> : null}

      {loading ? <p style={{ fontSize: '0.85rem', color: 'var(--site-text-muted)' }}>Loading versions...</p> : versions.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--site-text-muted)' }}>No versions yet. Click Snapshot to save the current manuscript.</p>
      ) : (
        <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
          {versions.map(v => (
            <div key={v._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', borderBottom: '1px solid var(--site-border)', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600, minWidth: '2rem' }}>v{v.version}</span>
              <span style={{ flex: 1, color: 'var(--site-text-muted)' }}>
                {new Date(v.createdAt).toLocaleDateString()} · {v.wordCount} words · {v.changeDescription}
              </span>
              <button type="button" className="book-publish__button" onClick={() => handleRestore(v._id)} disabled={restoring === v._id} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                {restoring === v._id ? '...' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
