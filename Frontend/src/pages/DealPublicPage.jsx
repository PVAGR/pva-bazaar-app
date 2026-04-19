import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPublicDealByPublicId, fetchDealVerificationSummary, verifyDealParticipation, joinDealAuthenticated } from '../lib/api';
import { getToken, setToken } from '../lib/auth';
import { getErrorMessage } from '../lib/errorUtils';

export default function DealPublicPage() {
  const { publicId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deal, setDeal] = useState(null);
  const [verification, setVerification] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [compatMode, setCompatMode] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [token, setTokenState] = useState(() => getToken());
  const [tokenDraft, setTokenDraft] = useState(() => getToken());
  const [copyLabel, setCopyLabel] = useState('Copy link');

  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}#/deal/${encodeURIComponent(publicId || '')}`;
  }, [publicId]);

  const verificationCount = Number(
    verification?.verificationCount || deal?.verification?.verificationCount || 0
  );
  const verifiedParticipants = verification?.verifiedParticipants || deal?.verification?.verifiedParticipants || [];

  useEffect(() => {
    let active = true;

    async function loadDeal() {
      if (!publicId) {
        setLoading(false);
        setError('Missing public deal id.');
        return;
      }

      setLoading(true);
      setError('');
      setCompatMode(false);
      try {
        const response = await fetchPublicDealByPublicId(publicId);
        if (!active) return;
        if (!response?.ok || !response?.item) {
          throw new Error(response?.error || 'Deal not found');
        }
        setDeal(response.item);
        setVerification(response.verification || response.item?.verification || null);
      } catch (err) {
        const sessionToken = getToken();
        if (sessionToken) {
          try {
            const joined = await joinDealAuthenticated(publicId);
            if (!active) return;
            if (joined?.ok && joined?.item) {
              setCompatMode(true);
              setDeal(joined.item);
              setVerification(null);
              setError('');
              return;
            }
          } catch (_inviteErr) {
            // Fall through to normal error handling below.
          }
        }

        if (active) {
          const baseMessage = getErrorMessage(err, 'Failed to load public deal');
          setError(
            `${baseMessage}. If this link is an invite token, paste a JWT above and click Use token to load invite mode.`
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDeal();
    return () => {
      active = false;
    };
  }, [publicId, reloadTick]);

  useEffect(() => {
    setTokenState(getToken());
    setTokenDraft(getToken());
  }, []);

  async function refreshVerificationSummary(nextDealId = deal?._id) {
    if (compatMode) return;
    if (!nextDealId) return;
    try {
      const response = await fetchDealVerificationSummary(nextDealId);
      if (response?.ok) {
        setVerification(response.verification || null);
      }
    } catch (_err) {
      // Keep existing state if the refresh fails.
    }
  }

  async function handleCopyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopyLabel('Copied');
      setTimeout(() => setCopyLabel('Copy link'), 1500);
    } catch (_err) {
      setCopyLabel('Copy failed');
      setTimeout(() => setCopyLabel('Copy link'), 1500);
    }
  }

  async function handleVerify() {
    if (!deal?._id) return;
    const currentToken = token || getToken();
    if (!currentToken) {
      setError('Enter a JWT token to verify this deal.');
      return;
    }

    setActionBusy(true);
    setError('');
    try {
      if (compatMode) {
        const joined = await joinDealAuthenticated(publicId);
        if (!joined?.ok || !joined?.item) {
          throw new Error(joined?.error || 'Failed to refresh invite deal context');
        }
        setDeal(joined.item);
        return;
      }

      const response = await verifyDealParticipation(deal._id, {});
      if (!response?.ok) {
        throw new Error(response?.error || 'Verification failed');
      }
      setDeal(response.item || deal);
      setVerification(response.verification || null);
      await refreshVerificationSummary(response.item?._id || deal._id);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to verify deal'));
    } finally {
      setActionBusy(false);
    }
  }

  function saveToken() {
    const value = tokenDraft.trim();
    setTokenState(value);
    setToken(value);
    if (!value) {
      setError('Paste a valid JWT token to unlock verification.');
    } else {
      setError('');
      setReloadTick((v) => v + 1);
    }
  }

  return (
    <section className="flex w-full flex-col gap-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Public Deal</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100">
          {loading ? 'Loading proposal…' : deal?.title || 'Deal proposal'}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-400">
          Read the proposal publicly, inspect the terms, and verify with a logged-in session when ready.
        </p>
      </header>

      {loading ? <div className="rounded-lg border border-zinc-700/70 bg-zinc-900/60 p-4 text-sm text-zinc-300">Loading deal…</div> : null}
      {error ? <div className="rounded-lg border border-red-700/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</div> : null}

      {deal ? (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-lg border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-zinc-200">Proposal details</h2>
              <p className="text-sm text-zinc-400">{deal.description || 'No description provided.'}</p>
              <div className="grid grid-cols-2 gap-3 text-xs text-zinc-300">
                <div className="rounded-lg border border-zinc-800 bg-black/20 p-3">
                  <div className="text-zinc-500">Funding needed</div>
                  <div className="mt-1 text-sm font-semibold text-zinc-100">
                    {Number(deal.totalAmount || 0).toLocaleString()} {deal.currency || 'USD'}
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black/20 p-3">
                  <div className="text-zinc-500">Status</div>
                  <div className="mt-1 text-sm font-semibold text-zinc-100">{deal.status || 'draft'}</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black/20 p-3">
                  <div className="text-zinc-500">Public ID</div>
                  <div className="mt-1 text-sm font-semibold text-zinc-100 break-all">{deal.publicId || publicId}</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black/20 p-3">
                  <div className="text-zinc-500">Created</div>
                  <div className="mt-1 text-sm font-semibold text-zinc-100">
                    {deal.createdAt ? new Date(deal.createdAt).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-zinc-200">Verification</h2>
              <div className="rounded-lg border border-zinc-800 bg-black/20 p-3 text-sm text-zinc-300">
                <div className="text-zinc-500">{compatMode ? 'Invite mode (legacy backend)' : 'Verified participants'}</div>
                <div className="mt-1 text-2xl font-semibold text-zinc-100">{verificationCount}</div>
              </div>
              <div className="space-y-2 text-xs text-zinc-400">
                {verifiedParticipants.length ? verifiedParticipants.map((entry) => (
                  <div key={`${entry.userId}-${entry.verifiedAt}`} className="rounded-lg border border-zinc-800 bg-black/20 p-3">
                    <div className="text-zinc-300">{entry.userId || 'verified user'}</div>
                    <div className="text-zinc-500">
                      {entry.verifiedAt ? new Date(entry.verifiedAt).toLocaleString() : 'Unknown time'} · {entry.method || 'jwt'}
                    </div>
                  </div>
                )) : <p>No verifications recorded yet.</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-300">JWT token</label>
                <input
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs text-zinc-100"
                  value={tokenDraft}
                  onChange={(event) => setTokenDraft(event.target.value)}
                  placeholder="Paste Bearer token"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-3 py-2 text-xs text-zinc-200"
                    type="button"
                    onClick={saveToken}
                  >
                    Use token
                  </button>
                  <button
                    className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-3 py-2 text-xs text-zinc-200"
                    type="button"
                    onClick={handleCopyLink}
                  >
                    {copyLabel}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {token ? (
                  <button
                    className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-xs text-amber-200 disabled:opacity-60"
                    onClick={handleVerify}
                    disabled={actionBusy}
                    type="button"
                  >
                    {actionBusy ? 'Working…' : compatMode ? 'Refresh invite access' : 'Verify participation'}
                  </button>
                ) : (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-400">
                    Enter a JWT token above to unlock verification.
                  </div>
                )}
                <Link className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-3 py-2 text-xs text-zinc-200" to="/deals">
                  Back to deals
                </Link>
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-200">Terms at a glance</h2>
            <div className="grid gap-3 md:grid-cols-3 text-sm text-zinc-300">
              <div>
                <div className="text-zinc-500 text-xs uppercase tracking-[0.25em]">Counterparty</div>
                <div>{deal.counterparty?.name || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs uppercase tracking-[0.25em]">Country</div>
                <div>{deal.counterparty?.country || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs uppercase tracking-[0.25em]">Verification count</div>
                <div>{verificationCount}</div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
