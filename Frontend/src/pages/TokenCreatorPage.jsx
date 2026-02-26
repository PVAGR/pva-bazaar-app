import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { apiGet, apiPost } from '../lib/api';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import AdminNav from '../components/AdminNav.jsx';
import HelpTip from '../components/HelpTip.jsx';
import { getErrorMessage } from '../lib/errorUtils';
import { getToken } from '../lib/auth';
import '../styles/admin-common.css';
import './TokenCreatorPage.css';

const CHAIN_IDS = { 8453: 'Base', 1: 'Ethereum', 11155111: 'Sepolia' };

export default function TokenCreatorPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [profile, setProfile] = useState(null);
  const [deploying, setDeploying] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [deployForm, setDeployForm] = useState({
    name: '',
    symbol: '',
    totalSupply: '1000000',
    decimals: '18',
    ownerAddress: '',
  });
  const [registerForm, setRegisterForm] = useState({
    contractAddress: '',
    name: '',
    symbol: '',
    decimals: '18',
    totalSupply: '',
    ownerAddress: '',
  });
  const tokenPresent = !!getToken();

  async function loadTokens() {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet('/tokens');
      if (res?.ok && Array.isArray(res.items)) setItems(res.items);
      else setItems([]);
    } catch (e) {
      setItems([]);
      setError(getErrorMessage(e, 'Failed to load tokens'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!tokenPresent) return;
    loadTokens();
  }, [tokenPresent]);

  useEffect(() => {
    if (!tokenPresent) return;
    apiGet('/users/profile')
      .then((res) => {
        if (res?.ok && res.user) {
          setProfile(res.user);
          const def = res.user?.preferences?.defaultWalletAddress || '';
          setDeployForm((p) => ({ ...p, ownerAddress: p.ownerAddress || def }));
          setRegisterForm((p) => ({ ...p, ownerAddress: p.ownerAddress || def }));
        }
      })
      .catch(() => {});
  }, [tokenPresent]);


  async function handleDeploy(e) {
    e.preventDefault();
    setDeploying(true);
    setError('');
    try {
      const res = await apiPost('/tokens/deploy', {
        name: deployForm.name.trim(),
        symbol: deployForm.symbol.trim().toUpperCase(),
        totalSupply: deployForm.totalSupply.trim() || '1000000',
        decimals: deployForm.decimals.trim() || '18',
        ownerAddress: deployForm.ownerAddress.trim() || undefined,
      });
      if (!res?.ok) throw new Error(res?.error || 'Deploy failed');
      setDeployForm({ name: '', symbol: '', totalSupply: '1000000', decimals: '18', ownerAddress: profile?.preferences?.defaultWalletAddress || '' });
      await loadTokens();
    } catch (e) {
      setError(getErrorMessage(e, 'Deployment failed'));
    } finally {
      setDeploying(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setRegistering(true);
    setError('');
    try {
      const res = await apiPost('/tokens/register', {
        contractAddress: registerForm.contractAddress.trim(),
        name: registerForm.name.trim(),
        symbol: registerForm.symbol.trim().toUpperCase(),
        decimals: registerForm.decimals.trim() || '18',
        totalSupply: registerForm.totalSupply.trim() || undefined,
        ownerAddress: registerForm.ownerAddress.trim() || undefined,
      });
      if (!res?.ok) throw new Error(res?.error || 'Register failed');
      setRegisterForm({ contractAddress: '', name: '', symbol: '', decimals: '18', totalSupply: '', ownerAddress: profile?.preferences?.defaultWalletAddress || '' });
      await loadTokens();
    } catch (e) {
      setError(getErrorMessage(e, 'Registration failed'));
    } finally {
      setRegistering(false);
    }
  }

  async function handleVerify(address) {
    setVerifying(address);
    setError('');
    try {
      const res = await apiGet(`/tokens/verify/${address}`);
      if (res?.ok && res.verified) {
        await loadTokens();
      }
    } catch (e) {
      setError(getErrorMessage(e, 'Verification failed'));
    } finally {
      setVerifying(null);
    }
  }

  function copyAddress(addr) {
    navigator.clipboard?.writeText(addr);
  }

  if (!tokenPresent) {
    return (
      <div className="token-creator-shell admin-page">
        <Helmet><title>Token Creator | PVA Bazaar</title></Helmet>
        <div className="notice">
          <b>Sign in required.</b> <Link to="/login">Log in</Link> to create and manage your ERC-20 tokens.
        </div>
      </div>
    );
  }

  return (
    <div className="token-creator-shell admin-page">
      <Helmet>
        <title>Token Creator | PVA Bazaar</title>
        <meta name="description" content="Create and manage verifiable ERC-20 tokens. Deploy or register tokens, connect to smart contracts." />
      </Helmet>
      <header className="token-creator-header">
        <div>
          <h1>🪙 Token Creator</h1>
          <p className="muted">
            Create verifiable ERC-20 tokens. You are the owner. Connect to smart contracts, deals, or external systems.
          </p>
        </div>
        <Link to="/admin" className="btn ghost">← Admin</Link>
      </header>

      <AdminNav />

      <main className="token-creator-main">
        {profile && !profile.preferences?.defaultWalletAddress && (
          <div className="notice">
            Add your <b>wallet address</b> in <Link to="/account">Account</Link> to prefill the owner field.
          </div>
        )}

        {error ? <ErrorBanner message={error} onDismiss={() => setError('')} onRetry={loadTokens} /> : null}

        <section className="card">
          <h2>Deploy new token</h2>
          <p className="muted small">
            Backend deploys when TOKEN_DEPLOYER_PRIVATE_KEY and ERC20_DEPLOY_BYTECODE are set. Otherwise deploy via Remix and use Register.
          </p>
          <form className="form" onSubmit={handleDeploy}>
            <label>
              Name <HelpTip title="Token name" body="Full name, e.g. PVA Bazaar Coin" />
              <input
                value={deployForm.name}
                onChange={(e) => setDeployForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="My Token"
                required
              />
            </label>
            <label>
              Symbol <HelpTip title="Token symbol" body="Short ticker, e.g. PVA" />
              <input
                value={deployForm.symbol}
                onChange={(e) => setDeployForm((p) => ({ ...p, symbol: e.target.value.toUpperCase() }))}
                placeholder="MTK"
                required
              />
            </label>
            <label>
              Total supply
              <input
                type="text"
                value={deployForm.totalSupply}
                onChange={(e) => setDeployForm((p) => ({ ...p, totalSupply: e.target.value }))}
                placeholder="1000000"
              />
            </label>
            <label>
              Decimals
              <input
                type="text"
                value={deployForm.decimals}
                onChange={(e) => setDeployForm((p) => ({ ...p, decimals: e.target.value }))}
                placeholder="18"
              />
            </label>
            <label>
              Owner address (you) <HelpTip title="Owner" body="Wallet that will own and control the token" />
              <input
                value={deployForm.ownerAddress}
                onChange={(e) => setDeployForm((p) => ({ ...p, ownerAddress: e.target.value }))}
                placeholder="0x..."
              />
            </label>
            <div className="row">
              <button type="submit" className="btn primary" disabled={deploying}>
                {deploying ? 'Deploying…' : 'Deploy'}
              </button>
              <a className="btn ghost" href="https://remix.ethereum.org" target="_blank" rel="noopener noreferrer">
                Deploy via Remix
              </a>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Register existing token</h2>
          <p className="muted small">Already deployed? Paste the contract address to track it here.</p>
          <form className="form" onSubmit={handleRegister}>
            <label>
              Contract address *
              <input
                value={registerForm.contractAddress}
                onChange={(e) => setRegisterForm((p) => ({ ...p, contractAddress: e.target.value }))}
                placeholder="0x..."
                required
              />
            </label>
            <label>
              Name
              <input
                value={registerForm.name}
                onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="My Token"
              />
            </label>
            <label>
              Symbol
              <input
                value={registerForm.symbol}
                onChange={(e) => setRegisterForm((p) => ({ ...p, symbol: e.target.value.toUpperCase() }))}
                placeholder="MTK"
              />
            </label>
            <label>
              Owner address
              <input
                value={registerForm.ownerAddress}
                onChange={(e) => setRegisterForm((p) => ({ ...p, ownerAddress: e.target.value }))}
                placeholder="0x..."
              />
            </label>
            <div className="row">
              <button type="submit" className="btn primary" disabled={registering}>
                {registering ? 'Registering…' : 'Register'}
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Your tokens</h2>
          {loading ? <LoadingSpinner label="Loading tokens…" /> : null}
          {!loading && items.length === 0 ? <div className="muted">No tokens yet. Deploy or register one above.</div> : null}
          <div className="token-list">
            {items.map((t) => (
              <div key={t._id} className="token-card">
                <div className="token-info">
                  <strong>{t.name}</strong> ({t.symbol})
                  <div className="muted small">
                    {t.contractAddress.slice(0, 10)}…{t.contractAddress.slice(-8)} · {CHAIN_IDS[t.chainId] || `Chain ${t.chainId}`}
                  </div>
                  <div className="muted small">Owner: {t.ownerAddress?.slice(0, 10)}…{t.ownerAddress?.slice(-6)}</div>
                </div>
                <div className="token-actions">
                  <button type="button" className="btn ghost small" onClick={() => copyAddress(t.contractAddress)}>
                    Copy
                  </button>
                  <a className="btn ghost small" href={`https://basescan.org/address/${t.contractAddress}`} target="_blank" rel="noopener noreferrer">
                    BaseScan
                  </a>
                  <button type="button" className="btn ghost small" onClick={() => handleVerify(t.contractAddress)} disabled={verifying === t.contractAddress}>
                    {verifying === t.contractAddress ? '…' : 'Verify'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
