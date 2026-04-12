import React from 'react';

const statusTagClass = (status) => {
  if (status === 'conference_queue') return 'gov-tag gov-tag-panel';
  if (status === 'threshold_reached') return 'gov-tag gov-tag-endorsed';
  if (status === 'accepted' || status === 'completed') return 'gov-tag gov-tag-passed';
  if (status === 'rejected') return 'gov-tag gov-tag-rejected';
  if (status === 'needs_revision') return 'gov-tag gov-tag-draft';
  if (status === 'in_execution') return 'gov-tag gov-tag-vote';
  return 'gov-tag gov-tag-draft';
};

const statusLabel = (status) => {
  if (status === 'public') return 'Public';
  if (status === 'threshold_reached') return 'Threshold Reached';
  if (status === 'conference_queue') return 'Conference Queue';
  if (status === 'accepted') return 'Accepted';
  if (status === 'rejected') return 'Rejected';
  if (status === 'needs_revision') return 'Needs Revision';
  if (status === 'in_execution') return 'In Execution';
  if (status === 'completed') return 'Completed';
  return 'Draft';
};

export default function ProposalCard({ proposal, onSupport, onUpvote, onVote }) {
  const supportCount = Number(proposal.supportCount ?? proposal.endorsements ?? 0);
  const comments = Array.isArray(proposal.comments) ? proposal.comments : [];
  const latestComment = comments.length ? comments[comments.length - 1] : null;
  const currentStatus = proposal.status || 'draft';
  const handleSupport = () => {
    if (typeof onSupport === 'function') return onSupport(proposal.id);
    if (typeof onUpvote === 'function') return onUpvote(proposal.id);
    return undefined;
  };

  return (
    <article className="gov-card">
      <div className="gov-card-meta">
        <span className={statusTagClass(currentStatus)}>{statusLabel(currentStatus)}</span>
        <span className="gov-tag gov-tag-cat">{proposal.committeeCategory || proposal.category || 'Governance'}</span>
        {String(proposal.urgency || '').toLowerCase() === 'high' ? <span className="gov-pill-urgent">Urgent</span> : null}
      </div>

      <h3 className="gov-card-title">{proposal.title}</h3>
      <p className="gov-card-excerpt"><strong>Problem:</strong> {proposal.problem || 'Not provided.'}</p>
      <p className="gov-card-excerpt"><strong>Proposal:</strong> {proposal.proposal || proposal.solution || 'Not provided.'}</p>
      <p className="gov-card-excerpt"><strong>Expected outcome:</strong> {proposal.expectedOutcome || proposal.outcome || 'Not provided.'}</p>
      {proposal.costResources ? (
        <p className="gov-card-excerpt"><strong>Cost/resources:</strong> {proposal.costResources}</p>
      ) : null}

      {proposal.adminDecision ? (
        <div className="gov-card" style={{ margin: '0.75rem 0', borderStyle: 'dashed' }}>
          <div className="gov-card-meta">
            <span className={statusTagClass(proposal.adminDecision)}>{statusLabel(proposal.adminDecision)}</span>
            <span className="gov-tag">Public moderator decision</span>
          </div>
          {proposal.adminReason ? <p className="gov-card-excerpt"><strong>Reason:</strong> {proposal.adminReason}</p> : null}
          {proposal.nextStep ? <p className="gov-card-excerpt"><strong>Next step:</strong> {proposal.nextStep}</p> : null}
          {proposal.targetTimeline ? <p className="gov-card-excerpt"><strong>Target timeline:</strong> {proposal.targetTimeline}</p> : null}
        </div>
      ) : null}

      {proposal.executionProject ? (
        <div className="gov-card" style={{ margin: '0.75rem 0', borderStyle: 'dashed' }}>
          <div className="gov-card-meta">
            <span className="gov-tag gov-tag-vote">Execution Tracker</span>
            <span className="gov-tag">{proposal.executionProject.progressPercent || 0}%</span>
          </div>
          <p className="gov-card-excerpt"><strong>Owner:</strong> {proposal.executionProject.owner || 'Unassigned'}</p>
          {proposal.executionProject.latestUpdate ? (
            <p className="gov-card-excerpt"><strong>Latest update:</strong> {proposal.executionProject.latestUpdate}</p>
          ) : null}
        </div>
      ) : null}

      <p className="gov-card-excerpt"><strong>Discussion:</strong> {comments.length} comment(s)</p>
      {latestComment ? (
        <p className="gov-card-excerpt"><strong>Latest:</strong> {latestComment.authorName}: {latestComment.body}</p>
      ) : null}

      <div className="gov-card-footer">
        <div className="gov-card-author">
          <span className="gov-avatar" style={{ background: proposal.authorColor || '#4a90a4' }}>{proposal.authorInitial || 'C'}</span>
          <span>{proposal.createdBy || proposal.author || 'Citizen'}</span>
          <span>·</span>
          <span>{proposal.id}</span>
        </div>

        <div className="gov-card-actions">
          <button
            type="button"
            className={proposal.userEndorsed ? 'gov-action-btn liked' : 'gov-action-btn'}
            onClick={handleSupport}
            disabled={proposal.userEndorsed}
          >
            ⬆ {supportCount}
          </button>

          {proposal.stage === 'vote' ? (
            <>
              <button
                type="button"
                className={proposal.userVote === 'yes' ? 'gov-action-btn voted-yes' : 'gov-action-btn'}
                onClick={() => onVote(proposal.id, 'yes')}
              >
                YES
              </button>
              <button
                type="button"
                className={proposal.userVote === 'no' ? 'gov-action-btn voted-no' : 'gov-action-btn'}
                onClick={() => onVote(proposal.id, 'no')}
              >
                NO
              </button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}