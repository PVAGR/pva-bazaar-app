import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getLocalDealByInviteToken, getLocalDealByPublicId, verifyLocalDeal } from '../lib/localDealStore';

export default function DealLocalPublicPage() {
  const { publicId } = useParams();
  const location = useLocation();
  const [deal, setDeal] = useState(null);
  const [actor, setActor] = useState('local-user');
  const [error, setError] = useState('');

  const inviteToken = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return params.get('token') || '';
  }, [location.search]);

  useEffect(() => {
    const fromPublicId = publicId ? getLocalDealByPublicId(publicId) : null;
    const fromInvite = !fromPublicId && inviteToken ? getLocalDealByInviteToken(inviteToken) : null;
    const item = fromPublicId || fromInvite;
    setDeal(item || null);
    if (!item) {
      setError('Local deal not found in this browser. Open the link in the same browser profile that created it.');
    } else {
      setError('');
    }
  }, [publicId, inviteToken]);

  function runVerify() {
    if (!deal?.publicId) return;
    try {
      const updated = verifyLocalDeal(deal.publicId, actor);
      setDeal(updated);
      setError('');
    } catch (err) {
      setError(err?.message || 'Verification failed');
    }
  }

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">No Render Mode</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100">Local Public Deal</h1>
        <p className="text-sm text-zinc-400 max-w-3xl">This page runs entirely from local browser storage and does not require backend deployment.</p>
      </header>

      {error ? <div className="rounded-lg border border-red-700/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</div> : null}

      {deal ? (
        <>
          <section className="rounded-lg border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-zinc-200">{deal.title}</h2>
            <p className="text-sm text-zinc-400">{deal.description || 'No description'}</p>
            <div className="grid gap-3 md:grid-cols-3 text-sm text-zinc-300">
              <div>
                <div className="text-zinc-500 text-xs uppercase tracking-[0.25em]">Amount</div>
                <div>{deal.totalAmount} {deal.currency}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs uppercase tracking-[0.25em]">Counterparty</div>
                <div>{deal.counterparty?.name || 'Not set'}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs uppercase tracking-[0.25em]">Verified</div>
                <div>{deal.verification?.verificationCount || 0}</div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-zinc-200">Verify (local)</h2>
            <div className="flex flex-wrap gap-2">
              <input
                className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs text-zinc-100"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="Participant label"
              />
              <button className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-xs text-amber-200" type="button" onClick={runVerify}>
                Verify local participation
              </button>
            </div>
            <div className="space-y-1 text-xs text-zinc-400">
              {(deal.verification?.verifiedParticipants || []).map((entry) => (
                <div key={`${entry.userId}-${entry.verifiedAt}`}>{entry.userId} · {new Date(entry.verifiedAt).toLocaleString()}</div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <div className="flex gap-2">
        <Link className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-3 py-2 text-xs text-zinc-200" to="/deals-local">Open local deals</Link>
        <Link className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-3 py-2 text-xs text-zinc-200" to="/deals">Open API deals</Link>
      </div>
    </section>
  );
}
