import React, { useState } from 'react';
import { apiPost, apiGet } from '../lib/api';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

export default function SolanaRitualPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [amountSol, setAmountSol] = useState('0.05');
  const [artifactId, setArtifactId] = useState('');
  const [artifactTitle, setArtifactTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [recent, setRecent] = useState([]);
  const [walletPubkey, setWalletPubkey] = useState('');

  const getProvider = () => {
    if (typeof window === 'undefined') return null;
    const anyWindow = window;
    return anyWindow.solana && anyWindow.solana.isPhantom ? anyWindow.solana : null;
  };

  const connectWallet = async () => {
    try {
      setError('');
      const provider = getProvider();
      if (!provider) {
        setError('Phantom wallet not detected. Install Phantom or use a Solana-enabled browser.');
        return;
      }
      const resp = await provider.connect();
      const pubkeyStr = resp?.publicKey?.toString() || provider.publicKey?.toString() || '';
      if (!pubkeyStr) {
        setError('Failed to read connected wallet address from Phantom.');
        return;
      }
      setWalletPubkey(pubkeyStr);
    } catch (err) {
      setError(err.message || 'Failed to connect Phantom wallet.');
    }
  };

  const runRitual = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    const trimmedWallet = walletAddress.trim();
    const numeric = Number(amountSol);
    if (!trimmedWallet) {
      setError('Destination Solana wallet address is required.');
      return;
    }
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    const provider = getProvider();
    if (!provider) {
      setError('Phantom wallet not detected. Install Phantom or use a Solana-enabled browser.');
      return;
    }
    if (!walletPubkey) {
      setError('Connect your Phantom wallet before running a ritual.');
      return;
    }

    setLoading(true);
    try {
      // Build and send a real Solana transfer on devnet
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const fromPubkey = new PublicKey(walletPubkey);
      const toPubkey = new PublicKey(trimmedWallet);
      const lamports = Math.round(numeric * LAMPORTS_PER_SOL);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPubkey,
      }).add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      const signature = await provider.signAndSendTransaction
        ? (await provider.signAndSendTransaction(tx)).signature || (await provider.signAndSendTransaction(tx))
        : await provider.sendTransaction(tx, connection);

      await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      // Persist the ritual with the real tx signature
      const response = await apiPost('/solana/ritual', {
        walletAddress: trimmedWallet,
        amountSol: numeric,
        artifactId: artifactId.trim(),
        artifactTitle: artifactTitle.trim(),
        metadata: {
          sourcePage: 'SolanaRitualPage',
        },
        txSignature: signature,
      });

      if (!response?.ok || !response.payout) {
        throw new Error(response?.error || response?.message || 'Ritual failed after transaction');
      }
      setResult(response.payout);
      // Refresh recent payouts (best-effort)
      try {
        const list = await apiGet('/solana/payouts');
        if (list?.ok && Array.isArray(list.payouts)) {
          setRecent(list.payouts.slice(0, 10));
        }
      } catch {
        // ignore list errors
      }
    } catch (err) {
      setError(err.message || 'Ritual failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell" style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1>🕯️ Solana Revenue Ritual (Simulated)</h1>
        <p className="muted">
          Record a payout ritual to a Solana wallet and emit an OpenClaw event. This first version logs the ritual
          in MongoDB and OpenClaw for observability; on-chain transfer wiring can be added safely later.
        </p>
      </header>

      <section className="card" style={{ marginBottom: '2rem' }}>
        <h2>Begin Ritual (Phantom + Solana devnet)</h2>
        <div style={{ marginBottom: '1rem' }}>
          <button type="button" className="btn primary" onClick={connectWallet}>
            {walletPubkey ? `Wallet connected: ${walletPubkey.slice(0, 4)}…${walletPubkey.slice(-4)}` : 'Connect Phantom wallet'}
          </button>
        </div>
        <form onSubmit={runRitual} className="form">
          <label>
            Destination Solana wallet (treasury)
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Your Phantom / Solana address (e.g. 3FZbgi29cp...)"
              required
            />
          </label>
          <label>
            Amount (SOL)
            <input
              type="number"
              step="0.0001"
              min="0"
              value={amountSol}
              onChange={(e) => setAmountSol(e.target.value)}
            />
          </label>
          <label>
            Linked artifact / archive id (optional)
            <input
              type="text"
              value={artifactId}
              onChange={(e) => setArtifactId(e.target.value)}
              placeholder="Artifact or archive entry id/slug"
            />
          </label>
          <label>
            Artifact title (optional)
            <input
              type="text"
              value={artifactTitle}
              onChange={(e) => setArtifactTitle(e.target.value)}
              placeholder="For human-readable logs"
            />
          </label>
          {error && (
            <div className="error-banner" style={{ marginTop: '0.75rem' }}>
              {error}
            </div>
          )}
          <div style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Running ritual…' : 'Run ritual (log payout)'}
            </button>
            <p className="muted small" style={{ marginTop: '0.5rem' }}>
              This currently records a payout in the backend (status <code>simulated</code>) and dispatches an OpenClaw
              system event. When you are ready, we can wire this to an actual Solana devnet/mainnet transfer.
            </p>
          </div>
        </form>
      </section>

      {result && (
        <section className="card" style={{ marginBottom: '2rem' }}>
          <h2>Latest Ritual Result</h2>
          <dl>
            <dt>Payout ID</dt>
            <dd>{result.id}</dd>
            <dt>Status</dt>
            <dd>{result.status}</dd>
            <dt>Network</dt>
            <dd>{result.network}</dd>
            <dt>Wallet</dt>
            <dd>{result.walletAddress}</dd>
            <dt>Amount</dt>
            <dd>{result.amountSol} SOL</dd>
            {result.artifactId && (
              <>
                <dt>Artifact</dt>
                <dd>
                  {result.artifactTitle || '(untitled)'} – {result.artifactId}
                </dd>
              </>
            )}
            <dt>Created</dt>
            <dd>{result.createdAt ? new Date(result.createdAt).toLocaleString() : 'n/a'}</dd>
          </dl>
        </section>
      )}

      <section className="card">
        <h2>Recent Rituals</h2>
        {recent.length === 0 ? (
          <p className="muted">No rituals recorded yet.</p>
        ) : (
          <div className="list">
            {recent.map((p) => (
              <div key={p.id} className="list-item">
                <div>
                  <strong>
                    {p.amountSol} SOL → {p.walletAddress.slice(0, 6)}…{p.walletAddress.slice(-4)}
                  </strong>
                  {p.artifactTitle && (
                    <div className="muted small">
                      {p.artifactTitle} ({p.artifactId})
                    </div>
                  )}
                </div>
                <div className="muted small" style={{ textAlign: 'right' }}>
                  <div>{p.status} • {p.network}</div>
                  <div>{p.createdAt ? new Date(p.createdAt).toLocaleString() : 'n/a'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

