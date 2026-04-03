import React, { useEffect, useState } from 'react';
import { fetchTransactions } from '../lib/api';
import { createLogger } from '../lib/logger';

const logger = createLogger('TransactionsTab');

function formatTime(value) {
  if (!value) return 'n/a';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export default function TransactionsTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadTransactions = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchTransactions(12);
        if (cancelled) return;

        if (Array.isArray(data)) {
          setTransactions(data);
        } else if (data?.ok && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        } else {
          setTransactions([]);
          setError(data?.message || 'No transactions found');
        }
      } catch (err) {
        if (cancelled) return;
        logger.error('Failed to load transactions', err);
        setError(err?.message || 'Failed to load transactions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="section-card" role="tabpanel" id="transactions-panel">
      <div className="section-heading">
        <div>
          <div className="pill">Business Activity</div>
          <h2>Recent Transactions</h2>
        </div>
        <span className="pill">{transactions.length} recent</span>
      </div>

      <p style={{ marginTop: 0, color: 'var(--site-text-muted)' }}>
        Live transaction activity across the site, including marketplace and share-related movement.
      </p>

      {loading && <p>Loading transactions…</p>}
      {error && !loading && <p style={{ color: 'var(--site-danger-text)' }}>{error}</p>}

      {!loading && !error && transactions.length === 0 && (
        <p style={{ color: 'var(--site-text-muted)' }}>No transaction activity recorded yet.</p>
      )}

      {!loading && transactions.length > 0 && (
        <div className="entry-list">
          {transactions.map((tx, index) => (
            <article className="entry-card" key={`${tx.title || tx.user || 'tx'}-${index}`}>
              <div className="entry-meta" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                <span className="pill">{tx.type || 'transaction'}</span>
                <span>{formatTime(tx.time)}</span>
              </div>
              <h3 style={{ marginTop: '0.5rem' }}>{tx.title || 'Unnamed transaction'}</h3>
              <p className="entry-excerpt" style={{ marginBottom: '0.5rem' }}>
                {tx.user ? `User: ${tx.user}` : 'User unavailable'}
              </p>
              <div className="entry-tags">
                {tx.amount && <span className="pill">{tx.amount}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}