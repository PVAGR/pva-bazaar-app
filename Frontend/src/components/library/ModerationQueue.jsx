import { useEffect, useMemo, useState } from 'react';
import {
  approveLibraryArticle,
  fetchPendingLibraryArticles,
  rejectLibraryArticle,
} from '../../lib/api';
import './LibraryModule.css';

function formatDiffPreview(preview) {
  if (!preview) return 'No line-level changes preview available.';
  return preview;
}

export default function ModerationQueue() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [moderationNote, setModerationNote] = useState('');

  const selectedItem = useMemo(
    () => items.find((item) => String(item._id) === String(selectedId)) || null,
    [items, selectedId],
  );

  async function loadPending() {
    setLoading(true);
    setError('');
    try {
      const response = await fetchPendingLibraryArticles();
      if (!response?.ok) throw new Error(response?.error || 'Failed to load queue');
      setItems(Array.isArray(response.items) ? response.items : []);
      if (!selectedId && response.items?.length) {
        setSelectedId(String(response.items[0]._id));
      }
    } catch (err) {
      setError(err.message || 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPending();
  }, []);

  async function handleApprove() {
    if (!selectedItem) return;
    setActionLoading(true);
    setError('');
    try {
      const response = await approveLibraryArticle(selectedItem._id, { note: moderationNote });
      if (!response?.ok) throw new Error(response?.error || 'Approve failed');
      setModerationNote('');
      await loadPending();
    } catch (err) {
      setError(err.message || 'Approve failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!selectedItem) return;
    setActionLoading(true);
    setError('');
    try {
      const response = await rejectLibraryArticle(selectedItem._id, { reason: moderationNote || 'Needs revision' });
      if (!response?.ok) throw new Error(response?.error || 'Reject failed');
      setModerationNote('');
      await loadPending();
    } catch (err) {
      setError(err.message || 'Reject failed');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section className="library-module" aria-label="Moderation queue">
      <header className="library-module-header">
        <h2>Moderation Queue</h2>
        <p>Review pending submissions, inspect diffs, then approve or reject.</p>
      </header>

      {loading ? <p className="library-alert">Loading pending submissions...</p> : null}
      {error ? <p className="library-alert library-alert-error">{error}</p> : null}

      <div className="library-editor-grid">
        <aside className="library-panel">
          <h3>Pending Articles</h3>
          <div className="library-list">
            {items.length === 0 ? <p className="library-muted">No pending articles.</p> : null}
            {items.map((item) => (
              <button
                key={item._id}
                type="button"
                className={`library-list-item ${String(selectedId) === String(item._id) ? 'is-active' : ''}`}
                onClick={() => setSelectedId(String(item._id))}
              >
                <strong>{item.title}</strong>
                <span>v{item.version} • {item.slug}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="library-panel">
          <h3>Side-by-Side Diff</h3>
          {!selectedItem ? <p className="library-muted">Select a pending article.</p> : null}

          {selectedItem ? (
            <>
              <div className="library-diff-meta">
                <span>+{selectedItem.diffSummary?.addedLines || 0} added</span>
                <span>-{selectedItem.diffSummary?.removedLines || 0} removed</span>
                <span>{selectedItem.diffSummary?.changedLines || 0} changed</span>
              </div>

              <div className="library-side-by-side">
                <div>
                  <h4>Proposed Markdown</h4>
                  <pre className="library-code-block">{selectedItem.markdown || ''}</pre>
                </div>
                <div>
                  <h4>Diff Preview</h4>
                  <pre className="library-code-block">{formatDiffPreview(selectedItem.diffSummary?.preview)}</pre>
                </div>
              </div>

              <label className="library-label" htmlFor="moderation-note">Moderator Note</label>
              <input
                id="moderation-note"
                className="library-input"
                value={moderationNote}
                onChange={(event) => setModerationNote(event.target.value)}
                maxLength={300}
                placeholder="Reason for decision"
              />

              <div className="library-actions">
                <button
                  type="button"
                  className="library-btn"
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : 'Approve & Publish'}
                </button>
                <button
                  type="button"
                  className="library-btn library-btn-secondary"
                  onClick={handleReject}
                  disabled={actionLoading}
                >
                  Reject
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
