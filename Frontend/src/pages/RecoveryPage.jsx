import React, { useEffect, useRef, useState } from 'react';
import {
  createRecoverySnapshot,
  deleteRecoverySnapshotById,
  fetchCurrentUserWithFallback,
  fetchRecoverySnapshotById,
  fetchRecoverySnapshots,
  getApiBase,
} from '../lib/api';
import { fetchArchiveEntriesSafe } from '../lib/archiveFeed';
import {
  applyContinuitySnapshot,
  collectContinuitySnapshot,
  decryptContinuitySnapshot,
  encryptContinuitySnapshot,
  downloadContinuityBundle,
} from '../lib/recoveryVault';
import './RecoveryPage.css';

const STUDIO_BACKUP_KEYS = {
  notes: 'pva-writing-studio-notes',
  noteDraft: 'pva-writing-studio-note-draft',
  blogDraft: 'pva-writing-studio-blog-draft',
  socialProfiles: 'pva-writing-studio-social',
  recentPublications: 'pva-writing-studio-publications',
  commandCenterNote: 'pva-command-center-note',
};

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function slugify(value) {
  return (
    String(value || 'continuity')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'continuity'
  );
}

function normalizeError(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    'Unknown error'
  );
}

function getSnapshotDeviceType() {
  const ua = globalThis.navigator?.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/mac/i.test(ua)) return 'mac';
  if (/win/i.test(ua)) return 'windows';
  if (/linux/i.test(ua)) return 'linux';
  return 'browser';
}

function buildSnapshotDevice(snapshotDevice = {}) {
  return {
    type: getSnapshotDeviceType(),
    platform: snapshotDevice.platform || globalThis.navigator?.platform || '',
    userAgent: snapshotDevice.userAgent || globalThis.navigator?.userAgent || '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  };
}

function applyStudioBackup(parsed) {
  const directMappings = [
    ['notes', STUDIO_BACKUP_KEYS.notes],
    ['noteDraft', STUDIO_BACKUP_KEYS.noteDraft],
    ['blogDraft', STUDIO_BACKUP_KEYS.blogDraft],
    ['socialProfiles', STUDIO_BACKUP_KEYS.socialProfiles],
    ['recentPublications', STUDIO_BACKUP_KEYS.recentPublications],
  ];

  if (typeof window === 'undefined') return;

  for (const [sourceKey, storageKey] of directMappings) {
    if (parsed?.[sourceKey] == null) continue;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(parsed[sourceKey]));
    } catch {
      // Ignore storage quota and security failures.
    }
  }

  if (typeof parsed?.commandCenterNote === 'string') {
    try {
      window.localStorage.setItem(STUDIO_BACKUP_KEYS.commandCenterNote, parsed.commandCenterNote);
    } catch {
      // Ignore storage quota and security failures.
    }
  }
}

export default function RecoveryPage() {
  const importInputRef = useRef(null);
  const [account, setAccount] = useState(null);
  const [accountError, setAccountError] = useState('');
  const [archiveEntries, setArchiveEntries] = useState([]);
  const [archiveError, setArchiveError] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [snapshotsError, setSnapshotsError] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [selectedSnapshotError, setSelectedSnapshotError] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [label, setLabel] = useState(
    `Continuity snapshot ${new Date().toISOString().slice(0, 10)}`,
  );
  const [includeSessionStorage, setIncludeSessionStorage] = useState(true);
  const [saveRemote, setSaveRemote] = useState(true);
  const [pinToIpfs, setPinToIpfs] = useState(false);
  const [replaceMatchingKeys, setReplaceMatchingKeys] = useState(true);
  const [status, setStatus] = useState({
    kind: 'idle',
    message: 'Ready to create a continuity snapshot.',
  });
  const [busyAction, setBusyAction] = useState('');
  const [latestBundleInfo, setLatestBundleInfo] = useState(null);

  const loadArchive = async () => {
    setArchiveLoading(true);
    setArchiveError('');
    try {
      const result = await fetchArchiveEntriesSafe({ limit: 8, sort: 'new' });
      setArchiveEntries(Array.isArray(result.items) ? result.items : []);
      if (!result.ok && result.error) {
        setArchiveError(result.error);
      }
    } catch (error) {
      setArchiveError(normalizeError(error));
      setArchiveEntries([]);
    } finally {
      setArchiveLoading(false);
    }
  };

  const loadAccount = async () => {
    try {
      const result = await fetchCurrentUserWithFallback();
      setAccount(result?.user || null);
      setAccountError('');
    } catch (error) {
      setAccount(null);
      setAccountError(normalizeError(error));
    }
  };

  const loadSnapshots = async () => {
    setSnapshotsLoading(true);
    setSnapshotsError('');
    try {
      const result = await fetchRecoverySnapshots();
      setSnapshots(Array.isArray(result?.items) ? result.items : []);
    } catch (error) {
      setSnapshots([]);
      setSnapshotsError(normalizeError(error));
    } finally {
      setSnapshotsLoading(false);
    }
  };

  useEffect(() => {
    void loadArchive();
    void loadAccount();
    void loadSnapshots();
  }, []);

  const createSnapshot = async () => {
    if (!passphrase.trim()) {
      setStatus({ kind: 'error', message: 'Add a passphrase before creating a snapshot.' });
      return;
    }

    setBusyAction('create');
    setStatus({ kind: 'working', message: 'Collecting local continuity state...' });

    try {
      const snapshot = collectContinuitySnapshot({
        label,
        backendUrl: getApiBase(),
        archiveEntries,
        includeSessionStorage,
      });
      // Encrypt in a separate step so the bundle stays portable and backend-ready.
      const payload = await encryptContinuitySnapshot(snapshot, passphrase);
      const bundle = {
        bundleType: 'pva-recovery-bundle-v1',
        exportedAt: snapshot.exportedAt,
        label: snapshot.label,
        site: snapshot.site,
        device: snapshot.device,
        manifest: snapshot.manifest,
        archive: snapshot.archive,
        encryptedPayload: payload,
      };

      downloadContinuityBundle(
        bundle,
        `pva-recovery-${slugify(snapshot.label)}-${snapshot.exportedAt.slice(0, 10)}.json`,
      );
      setLatestBundleInfo({
        label: snapshot.label,
        exportedAt: snapshot.exportedAt,
        localKeys: snapshot.manifest.localStorageCount,
        sessionKeys: snapshot.manifest.sessionStorageCount,
        archiveCount: snapshot.manifest.recentArchiveCount,
      });

      if (saveRemote) {
        const created = await createRecoverySnapshot({
          label: snapshot.label,
          payload,
          manifest: snapshot.manifest,
          device: buildSnapshotDevice(snapshot.device),
          pinToIpfs,
        });
        setStatus({
          kind: 'success',
          message: `Snapshot saved to your account${created?.item?.ipfs?.cid ? ` and pinned (${created.item.ipfs.cid})` : ''}. Local bundle downloaded too.`,
        });
        await loadSnapshots();
      } else {
        setStatus({
          kind: 'success',
          message: 'Snapshot downloaded locally. Remote save was skipped.',
        });
      }
    } catch (error) {
      setStatus({ kind: 'error', message: normalizeError(error) });
    } finally {
      setBusyAction('');
    }
  };

  const inspectSnapshot = async (snapshotId) => {
    setBusyAction(`inspect:${snapshotId}`);
    setSelectedSnapshotError('');
    try {
      const result = await fetchRecoverySnapshotById(snapshotId);
      setSelectedSnapshot(result?.item || null);
      setStatus({
        kind: 'success',
        message: `Loaded snapshot "${result?.item?.label || snapshotId}".`,
      });
    } catch (error) {
      setSelectedSnapshot(null);
      setSelectedSnapshotError(normalizeError(error));
      setStatus({ kind: 'error', message: normalizeError(error) });
    } finally {
      setBusyAction('');
    }
  };

  const restoreSnapshot = async (payload) => {
    if (!passphrase.trim()) {
      setStatus({ kind: 'error', message: 'Enter the passphrase first.' });
      return;
    }

    setBusyAction('restore');
    setStatus({ kind: 'working', message: 'Decrypting snapshot and restoring browser state...' });

    try {
      const bundlePayload = payload?.payload || payload?.encryptedPayload || payload;
      const snapshot = await decryptContinuitySnapshot(bundlePayload, passphrase);
      const restoreResult = applyContinuitySnapshot(snapshot, { replaceMatchingKeys });
      setStatus({
        kind: 'success',
        message: `Restored ${restoreResult.localStorageRestored} localStorage keys and ${restoreResult.sessionStorageRestored} sessionStorage keys. Reload the page to refresh all surfaces.`,
      });
    } catch (error) {
      setStatus({ kind: 'error', message: normalizeError(error) });
    } finally {
      setBusyAction('');
    }
  };

  const restoreSelectedSnapshot = async () => {
    if (!selectedSnapshot) {
      setStatus({ kind: 'error', message: 'Inspect a saved snapshot first.' });
      return;
    }
    await restoreSnapshot(selectedSnapshot);
  };

  const deleteSnapshot = async (snapshotId) => {
    if (!snapshotId) return;
    const confirmed = globalThis.confirm?.('Delete this recovery snapshot permanently?');
    if (!confirmed) return;

    setBusyAction(`delete:${snapshotId}`);
    setStatus({ kind: 'working', message: 'Deleting recovery snapshot...' });

    try {
      await deleteRecoverySnapshotById(snapshotId);
      setStatus({ kind: 'success', message: 'Recovery snapshot deleted.' });
      await loadSnapshots();
      if (selectedSnapshot?._id === snapshotId || selectedSnapshot?.id === snapshotId) {
        setSelectedSnapshot(null);
      }
    } catch (error) {
      setStatus({ kind: 'error', message: normalizeError(error) });
    } finally {
      setBusyAction('');
    }
  };

  const downloadSelectedSnapshot = () => {
    if (!selectedSnapshot) return;
    downloadContinuityBundle(
      {
        bundleType: 'pva-recovery-bundle-v1',
        exportedAt: selectedSnapshot.createdAt || new Date().toISOString(),
        label: selectedSnapshot.label,
        manifest: selectedSnapshot.manifest,
        device: selectedSnapshot.device,
        encryptedPayload: selectedSnapshot.payload,
      },
      `pva-recovery-${slugify(selectedSnapshot.label)}-${String(selectedSnapshot.createdAt || new Date().toISOString()).slice(0, 10)}.json`,
    );
  };

  const importBackupFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = safeJsonParse(text);
      if (!parsed) {
        throw new Error('The file is not valid JSON.');
      }

      if (parsed?.bundleType === 'pva-recovery-bundle-v1' || parsed?.encryptedPayload) {
        const payload = parsed.encryptedPayload || parsed.payload || parsed;
        await restoreSnapshot(payload);
        setLatestBundleInfo({
          label: parsed?.label || parsed?.encryptedPayload?.label || file.name,
          exportedAt: parsed?.exportedAt || new Date().toISOString(),
          localKeys: parsed?.manifest?.localStorageCount ?? null,
          sessionKeys: parsed?.manifest?.sessionStorageCount ?? null,
          archiveCount: parsed?.manifest?.recentArchiveCount ?? null,
        });
        return;
      }

      if (
        parsed?.version === 'pva-writing-studio-backup-v1' ||
        parsed?.notes ||
        parsed?.blogDraft
      ) {
        applyStudioBackup(parsed);
        setStatus({
          kind: 'success',
          message:
            'Writing studio backup restored into this browser. Open the studio page to see the notes again.',
        });
        return;
      }

      if (parsed?.storage && typeof parsed.storage === 'object') {
        applyContinuitySnapshot(parsed, { replaceMatchingKeys });
        setStatus({ kind: 'success', message: 'Continuity snapshot restored into this browser.' });
        return;
      }

      throw new Error('Unsupported backup file format.');
    } catch (error) {
      setStatus({ kind: 'error', message: normalizeError(error) });
    } finally {
      event.target.value = '';
    }
  };

  const archivePreview = archiveEntries.slice(0, 4);
  const recentSnapshots = snapshots.slice(0, 6);

  return (
    <div className="recovery-page">
      <section className="section-card recovery-hero">
        <div className="recovery-hero__copy">
          <p className="pill">Continuity and recovery</p>
          <h1>Keep your site, notes, and work portable across devices.</h1>
          <p>
            This page saves an encrypted continuity bundle to your account and downloads the same
            bundle locally so you can restore your browser state, writings, and key settings on
            another phone, laptop, or desktop.
          </p>
          <p className="recovery-note">
            Secrets and auth tokens are excluded by default. What moves is your working context:
            notes, drafts, configuration, and the live archive context the browser already knows.
          </p>
          <div className="recovery-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={createSnapshot}
              disabled={busyAction === 'create'}
            >
              {busyAction === 'create' ? 'Creating snapshot...' : 'Create snapshot'}
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => importInputRef.current?.click()}
              disabled={busyAction === 'create'}
            >
              Import backup file
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={loadSnapshots}
              disabled={snapshotsLoading}
            >
              Refresh saved snapshots
            </button>
          </div>
        </div>

        <aside className="recovery-hero__panel" aria-label="Recovery promise">
          <h2>What this page keeps alive</h2>
          <ul>
            <li>Your notes and drafts from the writing studio.</li>
            <li>Browser continuity keys and layout settings that are safe to keep.</li>
            <li>Archive context so the site feels continuous instead of empty.</li>
            <li>Remote snapshots that you can restore after changing devices.</li>
          </ul>
        </aside>
      </section>

      <section className="section-card recovery-toolbar" aria-label="Snapshot controls">
        <div className="recovery-toolbar__grid">
          <label className="recovery-field">
            <span>Snapshot label</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Laptop before Kenya trip"
            />
          </label>
          <label className="recovery-field">
            <span>Passphrase</span>
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder="Set a passphrase to encrypt the bundle"
            />
          </label>
        </div>

        <div className="recovery-switches">
          <label>
            <input
              type="checkbox"
              checked={includeSessionStorage}
              onChange={(event) => setIncludeSessionStorage(event.target.checked)}
            />
            Include session storage
          </label>
          <label>
            <input
              type="checkbox"
              checked={saveRemote}
              onChange={(event) => setSaveRemote(event.target.checked)}
            />
            Save to my account too
          </label>
          <label>
            <input
              type="checkbox"
              checked={pinToIpfs}
              onChange={(event) => setPinToIpfs(event.target.checked)}
            />
            Pin to IPFS when available
          </label>
          <label>
            <input
              type="checkbox"
              checked={replaceMatchingKeys}
              onChange={(event) => setReplaceMatchingKeys(event.target.checked)}
            />
            Replace matching keys on restore
          </label>
        </div>

        <div className={`recovery-status-banner recovery-status-banner--${status.kind}`}>
          {status.message}
        </div>
      </section>

      <section className="recovery-grid-shell">
        <div className="recovery-status-grid">
          <article className="recovery-status-card">
            <span className="recovery-status-label">Backend</span>
            <div className="recovery-status-value">{getApiBase() || 'Relative API base'}</div>
          </article>
          <article className="recovery-status-card">
            <span className="recovery-status-label">Account</span>
            <div className="recovery-status-value">
              {account
                ? account.email || account.username || account.name || account.id
                : 'Not signed in'}
            </div>
          </article>
          <article className="recovery-status-card">
            <span className="recovery-status-label">Saved snapshots</span>
            <div className="recovery-status-value">
              {snapshotsLoading
                ? 'Loading...'
                : `${snapshots.length} stored snapshot${snapshots.length === 1 ? '' : 's'}`}
            </div>
          </article>
          <article className="recovery-status-card">
            <span className="recovery-status-label">Current browser</span>
            <div className="recovery-status-value">
              {globalThis.navigator?.platform ||
                globalThis.navigator?.userAgent ||
                'Unknown browser'}
            </div>
          </article>
        </div>

        {accountError ? (
          <div className="recovery-inline-note">Account status: {accountError}</div>
        ) : null}
        {archiveError ? (
          <div className="recovery-inline-note">Archive status: {archiveError}</div>
        ) : null}
        {snapshotsError ? (
          <div className="recovery-inline-note">Snapshot status: {snapshotsError}</div>
        ) : null}
        {selectedSnapshotError ? (
          <div className="recovery-inline-note">Selected snapshot: {selectedSnapshotError}</div>
        ) : null}

        <div className="recovery-dual-grid">
          <article className="recovery-panel-card">
            <div className="recovery-panel-head">
              <div>
                <p className="pill">Remote continuity</p>
                <h2>Saved snapshots</h2>
              </div>
              <p className="recovery-muted">
                Inspect, restore, download, or delete encrypted account snapshots.
              </p>
            </div>
            <div className="recovery-list">
              {snapshotsLoading ? (
                <div className="recovery-empty">Loading saved snapshots...</div>
              ) : null}
              {!snapshotsLoading && recentSnapshots.length === 0 ? (
                <div className="recovery-empty">No saved snapshots yet.</div>
              ) : null}
              {recentSnapshots.map((snapshot) => {
                const snapshotId = snapshot.id || snapshot._id;
                const isSelected =
                  selectedSnapshot?._id === snapshotId || selectedSnapshot?.id === snapshotId;
                return (
                  <article
                    key={snapshotId}
                    className={`recovery-listItem ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div>
                      <strong>{snapshot.label || 'Untitled snapshot'}</strong>
                      <span>{formatDate(snapshot.createdAt)}</span>
                      <p>
                        {formatBytes(snapshot.payloadSizeBytes)} ·{' '}
                        {snapshot.encryption?.algorithm || 'AES-GCM'} ·{' '}
                        {snapshot.device?.platform || 'unknown device'}
                      </p>
                    </div>
                    <div className="recovery-listActions">
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => inspectSnapshot(snapshotId)}
                        disabled={busyAction === `inspect:${snapshotId}` || busyAction === 'create'}
                      >
                        {busyAction === `inspect:${snapshotId}` ? 'Loading...' : 'Inspect'}
                      </button>
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={restoreSelectedSnapshot}
                        disabled={!isSelected || busyAction === 'restore'}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => deleteSnapshot(snapshotId)}
                        disabled={busyAction === `delete:${snapshotId}`}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>

          <article className="recovery-panel-card">
            <div className="recovery-panel-head">
              <div>
                <p className="pill">Selected snapshot</p>
                <h2>Decrypt and restore</h2>
              </div>
              <p className="recovery-muted">
                Load one saved snapshot, inspect its manifest, then restore the encrypted browser
                state with your passphrase.
              </p>
            </div>

            {!selectedSnapshot ? (
              <div className="recovery-empty">Inspect a snapshot to see its details here.</div>
            ) : null}
            {selectedSnapshot ? (
              <div className="recovery-selected">
                <div className="recovery-status-grid recovery-status-grid--compact">
                  <article className="recovery-status-card">
                    <span className="recovery-status-label">Label</span>
                    <div className="recovery-status-value">{selectedSnapshot.label}</div>
                  </article>
                  <article className="recovery-status-card">
                    <span className="recovery-status-label">Created</span>
                    <div className="recovery-status-value">
                      {formatDate(selectedSnapshot.createdAt)}
                    </div>
                  </article>
                  <article className="recovery-status-card">
                    <span className="recovery-status-label">Payload size</span>
                    <div className="recovery-status-value">
                      {formatBytes(selectedSnapshot.payloadSizeBytes)}
                    </div>
                  </article>
                  <article className="recovery-status-card">
                    <span className="recovery-status-label">IPFS</span>
                    <div className="recovery-status-value">
                      {selectedSnapshot.ipfs?.cid ? selectedSnapshot.ipfs.cid : 'Not pinned'}
                    </div>
                  </article>
                </div>

                <div className="recovery-status-detail">
                  <span className="recovery-status-label">Manifest</span>
                  <pre>{JSON.stringify(selectedSnapshot.manifest || {}, null, 2)}</pre>
                </div>

                <div className="recovery-status-detail">
                  <span className="recovery-status-label">Device</span>
                  <pre>{JSON.stringify(selectedSnapshot.device || {}, null, 2)}</pre>
                </div>

                <div className="recovery-actions">
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={restoreSelectedSnapshot}
                    disabled={busyAction === 'restore'}
                  >
                    {busyAction === 'restore' ? 'Restoring...' : 'Restore selected snapshot'}
                  </button>
                  <button type="button" className="ghost-btn" onClick={downloadSelectedSnapshot}>
                    Download selected snapshot
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        </div>

        <div className="recovery-dual-grid">
          <article className="recovery-panel-card">
            <div className="recovery-panel-head">
              <div>
                <p className="pill">Local continuity</p>
                <h2>Archive and browser context</h2>
              </div>
              <p className="recovery-muted">
                This is what the snapshot collects from the live browser session.
              </p>
            </div>

            <div className="recovery-status-grid recovery-status-grid--compact">
              <article className="recovery-status-card">
                <span className="recovery-status-label">Session storage</span>
                <div className="recovery-status-value">
                  {includeSessionStorage ? 'Included' : 'Excluded'}
                </div>
              </article>
              <article className="recovery-status-card">
                <span className="recovery-status-label">Archive items</span>
                <div className="recovery-status-value">{archiveEntries.length}</div>
              </article>
              <article className="recovery-status-card">
                <span className="recovery-status-label">Download mode</span>
                <div className="recovery-status-value">Encrypted JSON bundle</div>
              </article>
              <article className="recovery-status-card">
                <span className="recovery-status-label">Remote save</span>
                <div className="recovery-status-value">{saveRemote ? 'Enabled' : 'Disabled'}</div>
              </article>
            </div>

            <div className="recovery-status-detail">
              <span className="recovery-status-label">Local app storage keys that matter</span>
              <pre>{JSON.stringify(Object.values(STUDIO_BACKUP_KEYS), null, 2)}</pre>
            </div>
          </article>

          <article className="recovery-panel-card">
            <div className="recovery-panel-head">
              <div>
                <p className="pill">Archive pulse</p>
                <h2>Recent archive entries</h2>
              </div>
              <p className="recovery-muted">
                The snapshot includes this live archive context so the site is less empty on a new
                device.
              </p>
            </div>
            {archiveLoading ? (
              <div className="recovery-empty">Loading archive entries...</div>
            ) : null}
            {!archiveLoading && archiveEntries.length === 0 ? (
              <div className="recovery-empty">No archive entries loaded right now.</div>
            ) : null}
            <div className="recovery-archive-grid">
              {archivePreview.map((entry) => (
                <article
                  key={entry.id || entry.slug || entry.title}
                  className="recovery-archive-card"
                >
                  <h3>{entry.title || 'Untitled entry'}</h3>
                  <p>{entry.excerpt || 'No excerpt available.'}</p>
                  <span className="recovery-archive-note">
                    {entry.date ? formatDate(entry.date) : 'Recent'} · {entry.category || 'Archive'}
                  </span>
                </article>
              ))}
            </div>
          </article>
        </div>

        <article className="recovery-panel-card">
          <div className="recovery-panel-head">
            <div>
              <p className="pill">Import and rescue</p>
              <h2>Bring backups back into this browser</h2>
            </div>
            <p className="recovery-muted">
              You can import an encrypted continuity bundle from this page, or an older
              writing-studio backup if that is the file you still have.
            </p>
          </div>

          <div className="recovery-actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => importInputRef.current?.click()}
            >
              Choose backup file
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => globalThis.location?.reload?.()}
            >
              Reload page after restore
            </button>
          </div>

          {latestBundleInfo ? (
            <div className="recovery-status-detail">
              <span className="recovery-status-label">Latest local bundle</span>
              <pre>{JSON.stringify(latestBundleInfo, null, 2)}</pre>
            </div>
          ) : null}
        </article>
      </section>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={importBackupFile}
      />
    </div>
  );
}
