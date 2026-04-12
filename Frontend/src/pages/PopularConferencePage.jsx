import React, { useMemo, useState } from 'react';
import ProposalForm from '../components/governance/ProposalForm.jsx';
import ProposalCard from '../components/governance/ProposalCard.jsx';
import { useGovernanceStore } from '../store/governanceStore';
import '../styles/governance.css';

function useWallet() {
  const [address, setAddress] = useState('');

  const connect = async () => {
    const eth = globalThis?.ethereum;
    if (!eth) return '';
    const accounts = await eth.request({ method: 'eth_requestAccounts' });
    const first = accounts?.[0] || '';
    if (first) setAddress(first);
    return first;
  };

  return {
    address,
    connect,
    isConnected: Boolean(address),
  };
}

function statusOrder(status) {
  const order = {
    conference_queue: 0,
    threshold_reached: 1,
    public: 2,
    draft: 3,
    needs_revision: 4,
    accepted: 5,
    in_execution: 6,
    completed: 7,
    rejected: 8,
  };
  return order[status] ?? 99;
}

export default function PopularConferencePage() {
  const proposals = useGovernanceStore((state) => state.proposals);
  const citizen = useGovernanceStore((state) => state.citizen);
  const citizenPassport = useGovernanceStore((state) => state.citizenPassport);
  const supportThreshold = useGovernanceStore((state) => state.supportThreshold);
  const conference = useGovernanceStore((state) => state.conference);
  const addProposal = useGovernanceStore((state) => state.addProposal);
  const supportProposal = useGovernanceStore((state) => state.supportProposal);
  const addProposalComment = useGovernanceStore((state) => state.addProposalComment);
  const ensureCitizenMembership = useGovernanceStore((state) => state.ensureCitizenMembership);

  const { address, connect, isConnected } = useWallet();

  const [showForm, setShowForm] = useState(true);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [filter, setFilter] = useState('all');

  const sortedProposals = useMemo(() => {
    return [...proposals]
      .sort((a, b) => {
        const statusDelta = statusOrder(a.status) - statusOrder(b.status);
        if (statusDelta !== 0) return statusDelta;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [proposals]);

  const conferenceQueue = useMemo(
    () => sortedProposals.filter((proposal) => proposal.status === 'conference_queue' || proposal.status === 'threshold_reached'),
    [sortedProposals]
  );

  const visibleProposals = useMemo(() => {
    if (filter === 'all') return sortedProposals;
    return sortedProposals.filter((proposal) => proposal.status === filter);
  }, [filter, sortedProposals]);

  const handleMembershipActivate = async () => {
    if (isConnected && address) {
      ensureCitizenMembership(address);
      return;
    }

    const connected = await connect();
    ensureCitizenMembership(connected || '');
  };

  const handleSubmitProposal = (payload) => {
    addProposal(payload);
    setShowForm(false);
  };

  const handleSupport = (proposalId) => {
    supportProposal(proposalId, {
      citizenId: citizenPassport.citizenId,
      walletAddress: citizenPassport.walletAddress,
    });
  };

  const handleCommentSubmit = (proposalId) => {
    const body = (commentDrafts[proposalId] || '').trim();
    if (!body) return;

    addProposalComment(proposalId, {
      body,
      authorId: citizenPassport.citizenId,
      authorName: citizenPassport.name,
      walletAddress: citizenPassport.walletAddress,
    });

    setCommentDrafts((state) => ({ ...state, [proposalId]: '' }));
  };

  return (
    <div className="gov-page">
      <div className="gov-layout">
        <aside className="gov-sidebar">
          <div className="gov-section-label">Citizen Membership</div>
          <div className="gov-card">
            <p className="gov-detail-body" style={{ marginBottom: '0.5rem' }}>
              <strong>Passport:</strong> {citizenPassport.memberActive ? 'Active' : 'Inactive'}
            </p>
            <p className="gov-detail-body" style={{ marginBottom: '0.5rem' }}>
              <strong>Citizen:</strong> {citizenPassport.name}
            </p>
            <p className="gov-detail-body" style={{ marginBottom: '0.5rem' }}>
              <strong>ID:</strong> {citizenPassport.citizenId}
            </p>
            <p className="gov-detail-body" style={{ marginBottom: '0.75rem' }}>
              <strong>Support threshold:</strong> {supportThreshold} supports
            </p>
            <button type="button" className="gov-btn gov-btn-primary" onClick={handleMembershipActivate}>
              {citizenPassport.memberActive ? 'Refresh Membership' : 'Activate Membership'}
            </button>
            <p className="gov-detail-body" style={{ marginTop: '0.65rem' }}>
              This is a mock membership layer for MVP; designed to be replaced with DID/VC identity.
            </p>
          </div>

          <div className="gov-section-label" style={{ marginTop: '1rem' }}>Conference Queue</div>
          <div className="gov-card">
            {conferenceQueue.length === 0 ? (
              <p className="gov-detail-body">No proposals queued yet. Reach threshold to auto-queue.</p>
            ) : (
              conferenceQueue.map((proposal) => (
                <div key={proposal.id} style={{ marginBottom: '0.65rem' }}>
                  <div className="gov-detail-title">{proposal.id}</div>
                  <div className="gov-detail-body">{proposal.title}</div>
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="gov-main">
          <section className="gov-hero">
            <div className="gov-hero-eyebrow">Popular Conference · Direct Democracy MVP</div>
            <h1 className="gov-hero-title">Public Proposal Engine</h1>
            <p className="gov-hero-sub">
              Citizens submit proposals, community support triggers auto-queue for conference, moderators publish decisions,
              and accepted items move into execution tracking.
            </p>
            <div className="gov-hero-actions">
              <button type="button" className="gov-btn gov-btn-primary" onClick={() => setShowForm((value) => !value)}>
                {showForm ? 'Hide Proposal Form' : 'New Proposal'}
              </button>
              <button type="button" className="gov-btn gov-btn-ghost" onClick={() => setFilter('all')}>All</button>
              <button type="button" className="gov-btn gov-btn-ghost" onClick={() => setFilter('conference_queue')}>Conference Queue</button>
              <button type="button" className="gov-btn gov-btn-ghost" onClick={() => setFilter('in_execution')}>In Execution</button>
            </div>
          </section>

          <section className="gov-card" style={{ marginBottom: '1rem' }}>
            <div className="gov-section-title" style={{ marginBottom: '0.5rem' }}>Conference Agenda</div>
            <div className="gov-detail-body" style={{ marginBottom: '0.5rem' }}>
              Session #{conference.number} · {conference.date} · {conference.location}
            </div>
            <div style={{ display: 'grid', gap: '0.45rem' }}>
              {conference.agenda.map((slot) => (
                <div key={`${slot.time}-${slot.item}`} className="gov-detail-body">
                  <strong>{slot.time}</strong> · {slot.item}
                </div>
              ))}
            </div>
          </section>

          {showForm ? <ProposalForm onSubmit={handleSubmitProposal} onCancel={() => setShowForm(false)} /> : null}

          <section>
            <div className="gov-section-header">
              <div className="gov-section-title">Public Proposals</div>
              <div className="gov-section-meta">{visibleProposals.length} items</div>
            </div>

            <div style={{ display: 'grid', gap: '0.95rem' }}>
              {visibleProposals.map((proposal) => (
                <article key={proposal.id}>
                  <ProposalCard proposal={proposal} onSupport={handleSupport} />

                  <div className="gov-card" style={{ marginTop: '0.65rem' }}>
                    <div className="gov-section-title" style={{ marginBottom: '0.35rem', fontSize: '1rem' }}>
                      Deliberation
                    </div>
                    {proposal.comments?.length ? (
                      <div style={{ display: 'grid', gap: '0.45rem', marginBottom: '0.65rem' }}>
                        {proposal.comments.slice(-3).map((comment) => (
                          <div key={comment.id} className="gov-detail-body">
                            <strong>{comment.authorName}:</strong> {comment.body}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="gov-detail-body" style={{ marginBottom: '0.65rem' }}>No comments yet.</p>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input
                        className="gov-form-input"
                        style={{ flex: '1 1 320px' }}
                        value={commentDrafts[proposal.id] || ''}
                        onChange={(event) => setCommentDrafts((state) => ({ ...state, [proposal.id]: event.target.value }))}
                        placeholder="Add a public comment to this proposal"
                      />
                      <button
                        type="button"
                        className="gov-btn gov-btn-primary"
                        onClick={() => handleCommentSubmit(proposal.id)}
                      >
                        Add Comment
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="gov-right-panel">
          <section className="gov-live-widget">
            <div className="gov-live-badge"><span className="gov-live-dot" /> Citizen Passport</div>
            <div className="gov-widget-title">{citizen.name}</div>
            <div className="gov-widget-desc">Verified: {citizenPassport.memberActive ? 'Yes' : 'No'}</div>
            <div className="gov-widget-desc">Node: {citizenPassport.node}</div>
          </section>

          <section className="gov-card">
            <div className="gov-section-title" style={{ marginBottom: '0.65rem' }}>Execution Snapshot</div>
            {sortedProposals.filter((proposal) => proposal.executionProject).slice(0, 3).map((proposal) => (
              <div key={proposal.id} className="gov-detail-body" style={{ marginBottom: '0.5rem' }}>
                <strong>{proposal.id}</strong> · {proposal.executionProject.progressPercent || 0}%
                <br />
                {proposal.executionProject.latestUpdate || 'Awaiting execution update'}
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
