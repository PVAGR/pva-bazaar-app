import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api.js';
import { TREASURY_ABI, getContract, ensureCorrectChain } from '../lib/contracts.js';

export default function TreasuryPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const treasuryApiEnabled = import.meta.env.VITE_ENABLE_TREASURY_REQUESTS_API === 'true';

  useEffect(() => {
    if (!treasuryApiEnabled) {
      setLoading(false);
      setRequests([]);
      return;
    }
    const fetchRequests = async () => {
      try {
        const data = await apiGet('/governance/treasury/requests');
        setRequests(Array.isArray(data?.items) ? data.items : []);
      } catch (error) {
        console.warn('Treasury requests API unavailable, showing empty state.');
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [treasuryApiEnabled]);

  const handleApprove = async (requestId, adminWallet) => {
    const ethereum = globalThis?.ethereum;
    const ethersLib = globalThis?.ethers;

    if (ethereum && ethersLib?.BrowserProvider && import.meta.env.VITE_TREASURY_CONTRACT_ADDRESS) {
      try {
        await ensureCorrectChain(ethereum);
        const provider = new ethersLib.BrowserProvider(ethereum);
        const signer = await provider.getSigner();
        const contract = getContract(
          import.meta.env.VITE_TREASURY_CONTRACT_ADDRESS,
          TREASURY_ABI,
          signer,
        );
        const tx = await contract.approveFunding(requestId);
        await tx.wait();

        setRequests((prev) =>
          prev.map((request) =>
            request.id === requestId ? { ...request, approved: true, txHash: tx.hash } : request,
          ),
        );
      } catch (error) {
        console.error('On-chain approval failed', error);
      }
    }

    if (treasuryApiEnabled) {
      try {
        await apiPost(`/governance/treasury/requests/${requestId}/approve`, { adminWallet });
      } catch (error) {
        console.warn('Backend treasury approval endpoint unavailable.');
      }
    }
  };

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '24px 16px',
        background: 'var(--site-bg-primary)',
      }}
    >
      <header
        style={{
          textAlign: 'center',
          marginBottom: '32px',
          padding: '20px',
          background: 'var(--site-panel)',
          borderRadius: '12px',
          border: '1px solid var(--site-border)',
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '800' }}>Treasury</h1>
        <p style={{ margin: '0 0 4px', fontSize: '16px', color: 'var(--site-text-muted)' }}>
          Fund approved proposals from the community treasury
        </p>
        <p
          style={{
            margin: '12px 0 0',
            fontSize: '14px',
            fontStyle: 'italic',
            color: 'var(--site-accent)',
            fontWeight: '600',
          }}
        >
          Polygon Amoy Testnet -{' '}
          {import.meta.env.VITE_TREASURY_CONTRACT_ADDRESS?.slice(0, 10) || 'N/A'}...
        </p>
      </header>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px' }}>Loading treasury requests...</p>
      ) : requests.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--site-text-muted)',
            background: 'var(--site-panel)',
            borderRadius: '12px',
            border: '1px dashed var(--site-border)',
          }}
        >
          <p>No funding requests yet.</p>
          <p>Approved proposals with budgets will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {requests.map((req) => (
            <article
              key={req.id}
              style={{
                background: 'var(--site-panel)',
                border: '1px solid var(--site-border)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '18px' }}>{req.proposalTitle}</h3>
                  <p style={{ margin: 0, color: 'var(--site-text-muted)', fontSize: '14px' }}>
                    Request ID: {req.id}
                  </p>
                </div>
                <span
                  style={{
                    background: req.approved ? 'var(--site-success-bg)' : 'var(--site-accent-soft)',
                    color: req.approved ? 'var(--site-success-text)' : 'var(--site-accent-strong)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: '1px solid var(--site-border)',
                  }}
                >
                  {req.approved ? 'Approved' : 'Pending'}
                </span>
              </div>

              <p style={{ margin: '0 0 12px' }}>{req.description}</p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <strong>Amount:</strong> {req.amount} {req.token || 'BAZ'}
                  <br />
                  <strong>Recipient:</strong>{' '}
                  <code
                    style={{
                      background: 'var(--site-panel-soft)',
                      color: 'var(--site-text)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--site-border)',
                    }}
                  >
                    {req.recipient?.slice(0, 10)}...{req.recipient?.slice(-8)}
                  </code>
                </div>

                {!req.approved ? (
                  <button
                    type="button"
                    onClick={() => handleApprove(req.id, '0xAdmin...')}
                    style={{
                      background: 'var(--site-accent)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Approve Funding
                  </button>
                ) : null}

                {req.txHash ? (
                  <a
                    href={`https://amoy.polygonscan.com/tx/${req.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--site-accent)',
                      textDecoration: 'none',
                      fontSize: '14px',
                    }}
                  >
                    View on PolygonScan
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
