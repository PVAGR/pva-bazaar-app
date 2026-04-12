import React, { useMemo, useState } from 'react';
import ProposalForm from '../components/governance/ProposalForm.jsx';
import ProposalCard from '../components/governance/ProposalCard.jsx';
import { useGovernanceStore } from '../store/governanceStore';
import '../styles/governance.css';

export default function PopularConferencePage() {
  const proposals = useGovernanceStore((state) => state.proposals);
  const citizen = useGovernanceStore((state) => state.citizen);
  const conference = useGovernanceStore((state) => state.conference);
  const communityStats = useGovernanceStore((state) => state.communityStats);
  const addProposal = useGovernanceStore((state) => state.addProposal);
  const endorseProposal = useGovernanceStore((state) => state.endorseProposal);
  const castVote = useGovernanceStore((state) => state.castVote);

  const [showForm, setShowForm] = useState(true);

  const liveProposal = useMemo(
    () => proposals.find((proposal) => proposal.stage === 'vote') || proposals[0] || null,
    [proposals]
  );

  const stageCounts = useMemo(() => {
    const counts = proposals.reduce((accumulator, proposal) => {
      accumulator[proposal.stage] = (accumulator[proposal.stage] || 0) + 1;
      return accumulator;
    }, {});

    return {
      draft: counts.draft || 0,
      endorsed: counts.endorsed || 0,
      panel: counts.panel || 0,
      vote: counts.vote || 0,
      passed: counts.passed || 0,
      rejected: counts.rejected || 0,
    };
  }, [proposals]);

  const statCards = [
    { label: 'Stored proposals', value: proposals.length.toLocaleString() },
    { label: 'Citizens', value: communityStats.citizens.toLocaleString() },
    { label: 'Active votes', value: stageCounts.vote.toLocaleString() },
    { label: 'Passport votes', value: citizen.votes.toLocaleString() },
  ];

  return (
    <div className="gov-page">
      <div className="gov-layout">
        <aside className="gov-sidebar">
          <div>
            <div className="gov-section-label">Civic Navigation</div>
            <div className="gov-nav-list">
              <button type="button" className="active">🗳️ Popular Conference</button>
              <button type="button" onClick={() => setShowForm((current) => !current)}>
                {showForm ? 'Hide proposal form' : 'Show proposal form'}
              </button>
            </div>
          </div>

          <div>
            <div className="gov-section-label">Local Storage</div>
            <div className="gov-card">
              <div className="gov-detail-body">
                Proposals are persisted in the browser with the pva-governance-store state key, so refreshes keep submitted items.
              </div>
            </div>
          </div>

          <div>
            <div className="gov-section-label">Community Pulse</div>
            <div className="gov-stats-grid">
              {statCards.map((card) => (
                <div key={card.label} className="gov-stat-card">
                  <div className="gov-stat-num">{card.value}</div>
                  <div className="gov-stat-label">{card.label}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="gov-main">
          <section className="gov-hero">
            <div className="gov-hero-eyebrow">Public governance forum</div>
            <h1 className="gov-hero-title">🗳️ Popular Conference</h1>
            <p className="gov-hero-sub">
              Submit civic proposals, gather upvotes, advance them through status badges, and keep the proposal board in browser storage across refreshes.
            </p>
            <div className="gov-hero-actions">
              <button type="button" className="gov-btn gov-btn-primary" onClick={() => setShowForm((current) => !current)}>
                {showForm ? 'Hide Proposal Form' : 'New Proposal'}
              </button>
              <button
                type="button"
                className="gov-btn gov-btn-ghost"
                onClick={() => {
                  if (liveProposal) endorseProposal(liveProposal.id);
                }}
                disabled={!liveProposal}
              >
                Upvote Featured Proposal
              </button>
            </div>
          </section>

          {showForm ? (
            <ProposalForm
              onCancel={() => setShowForm(false)}
              onSubmit={(payload) => {
                addProposal(payload);
                setShowForm(false);
              }}
            />
          ) : null}

          <div className="gov-section-header">
            <div className="gov-section-title">Proposal Board</div>
            <div className="gov-section-meta">{proposals.length} proposals saved locally</div>
          </div>

          <div className="gov-card" style={{ marginBottom: '1rem' }}>
            <div className="gov-detail-section">
              <div className="gov-detail-title">Conference cycle</div>
              <div className="gov-detail-body">
                Session #{conference.number} · {conference.date} · {conference.location}
              </div>
            </div>
          </div>

          <div className="gov-section-title" style={{ marginBottom: '0.75rem' }}>All proposals</div>
          <div className="gov-card" style={{ display: 'grid', gap: '0.9rem' }}>
            {proposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onUpvote={endorseProposal}
                onVote={castVote}
              />
            ))}
          </div>
        </main>

        <aside className="gov-right-panel">
          <section className="gov-live-widget">
            <div className="gov-live-badge">
              <span className="gov-live-dot" />
              Live proposal
            </div>
            {liveProposal ? (
              <>
                <div className="gov-widget-title">{liveProposal.id}: {liveProposal.title}</div>
                <div className="gov-widget-desc">
                  Status badge: {liveProposal.stage}. Upvotes and votes remain saved in the local browser store.
                </div>
                <div className="gov-vote-tally">{liveProposal.endorsements.toLocaleString()} endorsements</div>
              </>
            ) : (
              <div className="gov-widget-desc">No proposals are currently loaded.</div>
            )}
          </section>

          <section className="gov-card">
            <div className="gov-section-title" style={{ marginBottom: '0.75rem' }}>Status badges</div>
            <div className="gov-card-meta">
              <span className="gov-tag gov-tag-draft">Draft {stageCounts.draft}</span>
              <span className="gov-tag gov-tag-endorsed">Endorsed {stageCounts.endorsed}</span>
              <span className="gov-tag gov-tag-panel">Panel {stageCounts.panel}</span>
              <span className="gov-tag gov-tag-vote">Vote {stageCounts.vote}</span>
              <span className="gov-tag gov-tag-passed">Passed {stageCounts.passed}</span>
              <span className="gov-tag gov-tag-rejected">Rejected {stageCounts.rejected}</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}