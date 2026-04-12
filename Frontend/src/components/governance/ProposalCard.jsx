import React from 'react';

const stageTagClass = (stage) => {
  if (stage === 'vote') return 'gov-tag gov-tag-vote';
  if (stage === 'panel') return 'gov-tag gov-tag-panel';
  if (stage === 'endorsed') return 'gov-tag gov-tag-endorsed';
  if (stage === 'passed') return 'gov-tag gov-tag-passed';
  if (stage === 'rejected') return 'gov-tag gov-tag-rejected';
  return 'gov-tag gov-tag-draft';
};

const stageLabel = (stage) => {
  if (stage === 'vote') return 'Live Vote';
  if (stage === 'panel') return 'Citizen Panel';
  if (stage === 'endorsed') return 'Endorsed';
  if (stage === 'passed') return 'Passed';
  if (stage === 'rejected') return 'Rejected';
  return 'Draft';
};

export default function ProposalCard({ proposal, onUpvote, onVote }) {
  return (
    <article className="gov-card">
      <div className="gov-card-meta">
        <span className={stageTagClass(proposal.stage)}>{stageLabel(proposal.stage)}</span>
        <span className="gov-tag gov-tag-cat">{proposal.category}</span>
        {proposal.urgency === 'High' ? <span className="gov-pill-urgent">Urgent</span> : null}
      </div>

      <h3 className="gov-card-title">{proposal.title}</h3>
      <p className="gov-card-excerpt"><strong>Problem:</strong> {proposal.problem || 'Not provided.'}</p>
      <p className="gov-card-excerpt"><strong>Solution:</strong> {proposal.solution || 'Not provided.'}</p>
      <p className="gov-card-excerpt"><strong>Outcome:</strong> {proposal.outcome || 'Not provided.'}</p>

      <div className="gov-card-footer">
        <div className="gov-card-author">
          <span className="gov-avatar" style={{ background: proposal.authorColor }}>{proposal.authorInitial}</span>
          <span>{proposal.author}</span>
          <span>·</span>
          <span>{proposal.id}</span>
        </div>

        <div className="gov-card-actions">
          <button
            type="button"
            className={proposal.userEndorsed ? 'gov-action-btn liked' : 'gov-action-btn'}
            onClick={() => onUpvote(proposal.id)}
            disabled={proposal.userEndorsed}
          >
            ⬆ {proposal.endorsements}
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