import React, { useState } from 'react';
import { apiFetch, getApiBase, setApiBase } from '../lib/api.js';
import { fetchAdminStatus, requestDevToken } from '../lib/archiveApi.js';
import { PromptModal } from '../components/ui/DialogModals.jsx';

export default function AdminDashboard() {
  const [apiBase, setBase] = useState(getApiBase());
  const [status, setStatus] = useState('');
  const [health, setHealth] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingPromise, setPendingPromise] = useState(null);

  const saveBase = () => {
    setApiBase(apiBase);
    setStatus('API base saved');
  };

  const clearBase = () => {
    setBase('');
    setApiBase('');
    setStatus('API base cleared');
  };

  const ensureToken = async () => {
    let token = localStorage.getItem('admin:token') || '';
    if (token) return token;
    
    return new Promise((resolve, reject) => {
      setPendingPromise({ resolve, reject });
      setShowPrompt(true);
    });
  };

  const handleSecretSubmit = async (secret) => {
    try {
      const token = await requestDevToken(secret);
      localStorage.setItem('admin:token', token);
      if (pendingPromise) {
        pendingPromise.resolve(token);
        setPendingPromise(null);
      }
    } catch (err) {
      setStatus(`Auth failed: ${err.message}`);
      if (pendingPromise) {
        pendingPromise.reject(err);
        setPendingPromise(null);
      }
    }
  };

  const checkStatus = async () => {
    try {
      setBusy(true);
      const token = localStorage.getItem('admin:token') || (await ensureToken());
      const res = await fetchAdminStatus(token);
      setStatus(res?.status || 'OK');
    } catch (err) {
      console.error(err);
      setStatus(err.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const checkHealth = async () => {
    try {
      setBusy(true);
      const res = await apiFetch('/api/health');
      const json = await res.json().catch(() => ({}));
      setHealth({ ok: res.ok, status: res.status, json });
    } catch (err) {
      console.error(err);
      setHealth({ ok: false, status: 0, json: { message: err.message } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <div className="pill">Admin</div>
          <h2>Dashboard</h2>
        </div>
        <span className="pill">{status || 'Ready'}</span>
      </div>

      <div className="form" style={{ marginBottom: '1rem' }}>
        <label>
          API base URL
          <input value={apiBase} onChange={(e) => setBase(e.target.value)} placeholder="https://api.example.com" />
        </label>
        <div className="form__actions">
          <button className="button" type="button" onClick={saveBase}>Save</button>
          <button className="button ghost" type="button" onClick={clearBase}>Clear</button>
        </div>
      </div>

      <div className="form__actions" style={{ marginBottom: '1rem' }}>
        <button className="button" type="button" onClick={checkStatus} disabled={busy}>Check admin status</button>
        <button className="button ghost" type="button" onClick={checkHealth} disabled={busy}>Check API health</button>
        <a className="button ghost" href="#/admin/new-journal">New entry</a>
      </div>

      {health && (
        <div className="section-card" style={{ background: 'var(--site-panel-soft)' }}>
          <strong>API Health:</strong> HTTP {health.status} · {health.ok ? 'OK' : 'Error'}
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(health.json, null, 2)}</pre>
        </div>
      )}
      <PromptModal
        isOpen={showPrompt}
        onClose={() => {
          setShowPrompt(false);
          if (pendingPromise) {
            pendingPromise.reject(new Error('Cancelled'));
            setPendingPromise(null);
          }
        }}
        onSubmit={handleSecretSubmit}
        title="Admin Authentication"
        message="Enter your dev admin secret:"
        placeholder="Admin secret"
        inputType="password"
      />
    </section>
  );
}
