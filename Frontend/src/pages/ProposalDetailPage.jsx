import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  endorseProposal,
  fetchCurrentUser,
  fetchGovernanceExecutionTimeline,
  fetchMyPassport,
  fetchProposalById,
  unendorseProposal,
} from '../lib/api';
import { getToken } from '../lib/auth';
import './ProposalEngine.css';

const STAGES = ['draft', 'open', 'endorsed', 'in_deliberation', 'voting', 'decision'];

function stageState(status) {
  if (status === 'accepted' || status === 'rejected' || status === 'needs_revision' || status === 'archived') return 'decision';
  return status;
}

export default function ProposalDetailPage() {
  const { proposalId } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [timelineData, setTimelineData] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [verifiedCitizen, setVerifiedCitizen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      setLoading(true);
      setMessage('');
      try {
        const response = await fetchProposalById(proposalId);
        if (!active) return;
        if (!response?.ok || !response.item) {
          setMessage(response?.message || 'Proposal not found.');
          setItem(null);
          return;
        }
        setItem(response.item);
      } catch (error) {
        if (!active) return;
        setMessage(error?.message || 'Failed to load proposal.');
      } finally {
        if (active) setLoading(false);
      }
    }

    async function loadViewer() {
      if (!getToken()) return;
      try {
        const [passportResponse, userResponse] = await Promise.all([fetchMyPassport(), fetchCurrentUser()]);
        if (!active) return;
        const eligible = passportResponse?.item?.passportStatus === 'verified' && passportResponse?.item?.governanceToken === true;
        setVerifiedCitizen(Boolean(eligible));
        setUserId(String(userResponse?.user?.id || userResponse?.user?._id || ''));
      } catch (_error) {
        if (!active) return;
        setVerifiedCitizen(false);
      }
    }

    async function loadExecutionTimeline() {
      setTimelineLoading(true);
      try {
        const response = await fetchGovernanceExecutionTimeline(proposalId);
        if (!active) return;
        if (response?.ok) {
          setTimelineData(response.execution || null);
        } else {
          setTimelineData(null);
        }
      } catch (_error) {
        if (!active) return;
        setTimelineData(null);
      } finally {
        if (active) setTimelineLoading(false);
      }
    }

    loadDetail();
    loadViewer();
    loadExecutionTimeline();

    return () => {
      active = false;
    };
  }, [proposalId]);

  const endorsedByMe = useMemo(() => {
    if (!item || !userId) return false;
    const endorsements = Array.isArray(item.endorsements) ? item.endorsements : [];
    return endorsements.some((entry) => String(entry?.citizen?._id || entry?.citizen || '') === userId);
  }, [item, userId]);

  const canEndorse = useMemo(() => {
    if (!item || !verifiedCitizen || !userId) return false;
    return String(item?.submittedBy?._id || item?.submittedBy || '') !== userId;
  }, [item, verifiedCitizen, userId]);

  const currentStage = stageState(String(item?.status || 'draft'));

  const handleEndorse = async () => {
    if (!item?.proposalId) return;
    setMessage('');
    try {
      const response = await endorseProposal(item.proposalId);
      if (response?.ok && response.item) {
        setItem(response.item);
      } else {
        setMessage(response?.message || 'Unable to endorse proposal.');
      }
    } catch (error) {
      setMessage(error?.message || 'Unable to endorse proposal.');
    }
  };

  const handleUnendorse = async () => {
    if (!item?.proposalId) return;
    setMessage('');
    try {
      const response = await unendorseProposal(item.proposalId);
      if (response?.ok && response.item) {
        setItem(response.item);
      } else {
        setMessage(response?.message || 'Unable to remove endorsement.');
      }
    } catch (error) {
      setMessage(error?.message || 'Unable to remove endorsement.');
    }
  };

  if (loading) {
    return <section className="section-card"><p>Loading proposal...</p></section>;
  }

  if (!item) {
    return <section className="section-card"><p>{message || 'Proposal not found.'}</p></section>;
  }

  const progress = Math.min(100, Math.round((Number(item.endorsementCount || 0) / Number(item.endorsementThreshold || 10)) * 100));

  return (
    <div className="proposal-page">
      <section className="section-card proposal-header">
        <div className="proposal-card-head">
          <span className="proposal-badge">{item.category}</span>
          <span className={`proposal-badge status-${item.status}`}>{item.status}</span>
        </div>
        <h1>{item.title}</h1>
        <p>
          Submitted by {item?.submittedBy?.name || 'Unknown citizen'} · {item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown date'}
        </p>
      </section>

      <section className="section-card proposal-detail-grid">
        <article><h3>Problem</h3><p>{item.problem}</p></article>
        <article><h3>Solution</h3><p>{item.solution}</p></article>
        <article><h3>Expected outcome</h3><p>{item.expectedOutcome}</p></article>
        <article><h3>Estimated cost</h3><p>{item.estimatedCost || 'Not specified'}</p></article>
        <article><h3>Timeline</h3><p>{item.timeline || 'Not specified'}</p></article>
        <article><h3>Proposal ID</h3><p>{item.proposalId}</p></article>
      </section>

      <section className="section-card">
        <h2>Endorsements</h2>
        <p>{Number(item.endorsementCount || 0)}/{Number(item.endorsementThreshold || 10)} endorsements</p>
        <div className="proposal-progress-track">
          <div className="proposal-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        {canEndorse ? (
          <div className="home-hero__actions" style={{ marginTop: '0.8rem' }}>
            {!endorsedByMe ? (
              <button type="button" className="button" onClick={handleEndorse}>Endorse Proposal</button>
            ) : (
              <button type="button" className="button ghost" onClick={handleUnendorse}>Remove Endorsement</button>
            )}
          </div>
        ) : null}
        {message ? <p>{message}</p> : null}
      </section>

      <section className="section-card">
        <h2>Stage Timeline</h2>
        <div className="proposal-timeline">
          {STAGES.map((stage) => (
            <div key={stage} className={`proposal-stage ${stage === currentStage ? 'active' : ''}`}>
              {stage === 'in_deliberation' ? 'Deliberation' : stage === 'decision' ? 'Decision' : stage}
            </div>
          ))}
        </div>
      </section>

      {item.officialResponse?.decision ? (
        <section className="section-card">
          <h2>Official Response</h2>
          <p><strong>Decision:</strong> {item.officialResponse.decision}</p>
          <p>{item.officialResponse.explanation || 'No explanation provided.'}</p>
          <p className="proposal-meta">Responded at {item.officialResponse.respondedAt ? new Date(item.officialResponse.respondedAt).toLocaleString() : 'Unknown'} by {item?.officialResponse?.respondedBy?.name || 'Secretariat'}</p>
        </section>
      ) : null}

      {item.executionProject?.owner || (item.executionProject?.milestones || []).length ? (
        <section className="section-card">
          <h2>Execution Tracker</h2>
          <p><strong>Owner:</strong> {item.executionProject.owner || 'Unassigned'}</p>
          <p><strong>Budget:</strong> {item.executionProject.budget || 'Not set'}</p>
          <p><strong>Status:</strong> {item.executionProject.status || 'not_started'}</p>
          <ul>
            {(item.executionProject.milestones || []).map((milestone, index) => <li key={`${milestone}-${index}`}>{milestone}</li>)}
          </ul>
        </section>
      ) : null}

      {!timelineLoading && timelineData?.executionBlock ? (
        <section className="section-card">
          <h2>Public Execution Timeline</h2>
          <p><strong>Decision:</strong> {timelineData.decision || 'public'}</p>
          <p><strong>Progress:</strong> {Number(timelineData.executionBlock.progressPercent || 0)}%</p>
          <p><strong>Latest update:</strong> {timelineData.executionBlock.latestUpdate || 'No update yet'}</p>

          {(timelineData.updates || []).length ? (
            <ul>
              {timelineData.updates.slice(-8).reverse().map((entry, idx) => (
                <li key={`timeline-update-${idx}`}>
                  <strong>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Update'}</strong>: {entry.message}
                </li>
              ))}
            </ul>
          ) : (
            <p>No timeline entries published yet.</p>
          )}
        </section>
      ) : null}

      <section className="section-card">
        <h2>Deliberation Forum</h2>
        <p>Deliberation Forum — Coming in Phase C3</p>
        <Link className="button ghost" to="/conference">Open Popular Conference</Link>
      </section>
    </div>
  );
}
