import React, { useMemo, useState } from 'react';
import { useGovernanceStore } from '../store/governanceStore';

export default function AdminGovernancePage() {
  const proposals = useGovernanceStore((state) => state.proposals);
  const setProposalStatus = useGovernanceStore((state) => state.setProposalStatus);
  const removeProposal = useGovernanceStore((state) => state.removeProposal);
  const [filter, setFilter] = useState('pending');

  const filteredProposals = useMemo(() => {
    if (filter !== 'pending') return proposals;
    return proposals.filter((proposal) => proposal.stage === 'draft' || proposal.stage === 'panel');
  }, [filter, proposals]);

  return (
    <div
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '24px 16px',
        background: 'var(--site-bg-primary)',
      }}
    >
      <header
        style={{
          textAlign: 'center',
          marginBottom: '24px',
          padding: '20px',
          background: 'var(--site-panel)',
          borderRadius: '12px',
          border: '1px solid var(--site-border)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>Admin Governance Panel</h1>
        <p style={{ margin: '8px 0 0', color: 'var(--site-text-muted)' }}>
          Moderate proposals, manage committees, enforce rules.
        </p>
      </header>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['pending', 'all'].map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setFilter(mode)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--site-border)',
              background: filter === mode ? 'var(--site-accent)' : 'var(--site-panel-soft)',
              color: filter === mode ? '#ffffff' : 'var(--site-text)',
              cursor: 'pointer',
              fontWeight: filter === mode ? '700' : '500',
            }}
          >
            {mode === 'pending' ? 'Pending' : 'All'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredProposals.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: 'var(--site-text-muted)' }}>
            No proposals to moderate.
          </p>
        ) : (
          filteredProposals.map((proposal) => (
            <div
              key={proposal.id}
              style={{
                background: 'var(--site-panel)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--site-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <strong>{proposal.title}</strong>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--site-text-muted)' }}>
                  Stage: {proposal.stage} • Supports: {proposal.endorsements}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setProposalStatus(proposal.id, 'endorsed')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--site-success-text)',
                    color: '#08210f',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Endorse
                </button>
                <button
                  type="button"
                  onClick={() => setProposalStatus(proposal.id, 'rejected')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--site-danger-text)',
                    color: '#2a0808',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => removeProposal(proposal.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--site-border)',
                    background: 'var(--site-panel-soft)',
                    color: 'var(--site-text)',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
