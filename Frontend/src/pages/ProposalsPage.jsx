import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchGovernanceExecutionTimeline,
  fetchMyPassport,
  fetchMyProposals,
  fetchProposals,
} from '../lib/api';
import { getToken } from '../lib/auth';
import './ProposalEngine.css';

const CATEGORIES = [
  'all',
  'governance',
  'economy',
  'health',
  'learning',
  'housing',
  'justice',
  'culture',
  'infrastructure',
  'emergency',
];

const STATUS_FILTERS = [
  'all',
  'draft',
  'open',
  'endorsed',
  'in_deliberation',
  'voting',
  'accepted',
  'rejected',
  'needs_revision',
  'archived',
];

export default function ProposalsPage({ mode = 'public' }) {
  const isMine = mode === 'mine';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [verifiedCitizen, setVerifiedCitizen] = useState(false);
  const [timelineById, setTimelineById] = useState({});
  const [timelineLoadingById, setTimelineLoadingById] = useState({});
  const [timelineFetchedAtById, setTimelineFetchedAtById] = useState({});
  const [timelineErrorById, setTimelineErrorById] = useState({});

  useEffect(() => {
    let active = true;
    async function loadEligibility() {
      const token = getToken();
      if (!token) {
        if (active) setVerifiedCitizen(false);
        return;
      }
      try {
        const response = await fetchMyPassport();
        if (!active) return;
        const item = response?.item;
        const eligible = item?.passportStatus === 'verified' && item?.governanceToken === true;
        setVerifiedCitizen(Boolean(eligible));
      } catch (_error) {
        if (active) setVerifiedCitizen(false);
      }
    }

    loadEligibility();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadItems() {
      setLoading(true);
      setError('');
      try {
        if (isMine) {
          const response = await fetchMyProposals();
          if (!active) return;
          if (response?.ok) {
            setItems(Array.isArray(response.items) ? response.items : []);
            setPagination({
              page: 1,
              pages: 1,
              total: Array.isArray(response.items) ? response.items.length : 0,
              limit: 999,
            });
          } else {
            setError(response?.message || 'Failed to load your proposals.');
          }
          return;
        }

        const response = await fetchProposals({
          page,
          limit: 20,
          status: status === 'all' ? '' : status,
          category: category === 'all' ? '' : category,
          sort,
        });
        if (!active) return;
        if (response?.ok) {
          setItems(Array.isArray(response.items) ? response.items : []);
          setPagination(response.pagination || { page, pages: 1, total: 0, limit: 20 });
        } else {
          setError(response?.message || 'Failed to load proposals.');
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.message || 'Failed to load proposals.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadItems();
    return () => {
      active = false;
    };
  }, [isMine, page, status, category, sort]);

  const title = isMine ? 'My Proposal Submissions' : "The People's Proposal Board";

  const pagedInfo = useMemo(() => {
    if (isMine) return `${pagination.total} total`;
    return `Page ${pagination.page} of ${Math.max(1, pagination.pages)} · ${pagination.total} total`;
  }, [isMine, pagination.page, pagination.pages, pagination.total]);

  const loadTimeline = async (proposalKey, { force = false } = {}) => {
    if (!proposalKey) return;

    const fetchedAt = timelineFetchedAtById[proposalKey];
    if (!force && fetchedAt && Date.now() - fetchedAt < 30000) {
      return;
    }

    setTimelineLoadingById((state) => ({ ...state, [proposalKey]: true }));
    setTimelineErrorById((state) => ({ ...state, [proposalKey]: '' }));
    try {
      const response = await fetchGovernanceExecutionTimeline(proposalKey);
      setTimelineById((state) => ({
        ...state,
        [proposalKey]: response?.ok ? response.execution : null,
      }));
      setTimelineFetchedAtById((state) => ({ ...state, [proposalKey]: Date.now() }));
      if (!response?.ok) {
        setTimelineErrorById((state) => ({
          ...state,
          [proposalKey]: 'Timeline is currently unavailable.',
        }));
      }
    } catch (_error) {
      setTimelineById((state) => ({ ...state, [proposalKey]: null }));
      setTimelineErrorById((state) => ({
        ...state,
        [proposalKey]: 'Failed to load execution timeline.',
      }));
    } finally {
      setTimelineLoadingById((state) => ({ ...state, [proposalKey]: false }));
    }
  };

  return (
    <div className="proposal-page">
      <section className="section-card proposal-header">
        <div className="pill">Phase C2 · Proposal Engine</div>
        <h1>{title}</h1>
        <p>Public proposals move from idea to endorsement threshold, deliberation, and decision.</p>
        <div className="home-hero__actions">
          {!isMine && verifiedCitizen ? (
            <Link className="button" to="/proposals/submit">
              Submit a Proposal
            </Link>
          ) : null}
          {!isMine && getToken() ? (
            <Link className="button ghost" to="/proposals/my">
              My Submissions
            </Link>
          ) : null}
        </div>
      </section>

      {!isMine ? (
        <section className="section-card proposal-filters">
          <div className="proposal-pill-row">
            {CATEGORIES.map((entry) => (
              <button
                key={entry}
                type="button"
                className={`proposal-pill ${entry === category ? 'is-active' : ''}`}
                onClick={() => {
                  setCategory(entry);
                  setPage(1);
                }}
              >
                {entry === 'all' ? 'All categories' : entry}
              </button>
            ))}
          </div>
          <div className="proposal-filter-grid">
            <label>
              Status
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                {STATUS_FILTERS.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
              >
                <option value="recent">recent</option>
                <option value="popular">popular</option>
              </select>
            </label>
            <div className="proposal-pagination">
              <span>{pagedInfo}</span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-card proposal-grid">
        {loading ? <p>Loading proposals...</p> : null}
        {!loading && error ? <p>{error}</p> : null}
        {!loading && !error && items.length === 0 ? (
          <p>No proposals found for this filter.</p>
        ) : null}

        {!loading && !error
          ? items.map((proposal) => {
              const proposalKey = proposal.proposalId || proposal._id;
              const progress = Math.min(
                100,
                Math.round(
                  (Number(proposal.endorsementCount || 0) /
                    Number(proposal.endorsementThreshold || 10)) *
                    100,
                ),
              );
              const timeline = timelineById[proposalKey];
              const timelineFetchedAt = timelineFetchedAtById[proposalKey];
              const timelineError = timelineErrorById[proposalKey];
              const updates = Array.isArray(timeline?.updates) ? timeline.updates : [];
              const showExecutionTimeline = [
                'accepted',
                'in_execution',
                'completed',
                'outcome_published',
              ].includes(String(proposal.status || '').toLowerCase());

              return (
                <article key={proposalKey} className="proposal-card">
                  <div className="proposal-card-head">
                    <span className="proposal-badge">{proposal.category}</span>
                    <span className={`proposal-badge status-${proposal.status}`}>
                      {proposal.status}
                    </span>
                  </div>
                  <h3>
                    <Link to={`/proposals/${encodeURIComponent(proposalKey)}`}>
                      {proposal.title}
                    </Link>
                  </h3>
                  <p className="proposal-meta">
                    By {proposal?.submittedBy?.name || 'Unknown citizen'} ·{' '}
                    {proposal?.createdAt
                      ? new Date(proposal.createdAt).toLocaleDateString()
                      : 'Unknown date'}
                  </p>
                  <div>
                    <p className="proposal-meta">
                      {Number(proposal.endorsementCount || 0)}/
                      {Number(proposal.endorsementThreshold || 10)} endorsements
                    </p>
                    <div className="proposal-progress-track">
                      <div className="proposal-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <p>
                    {String(proposal.problem || '').slice(0, 220)}
                    {String(proposal.problem || '').length > 220 ? '…' : ''}
                  </p>

                  {showExecutionTimeline ? (
                    <div className="proposal-execution-panel">
                      <div className="proposal-execution-head">
                        <span>Execution Timeline</span>
                        <button
                          type="button"
                          className="button ghost"
                          onClick={() => loadTimeline(proposalKey, { force: true })}
                          disabled={Boolean(timelineLoadingById[proposalKey])}
                        >
                          {timelineLoadingById[proposalKey]
                            ? 'Loading…'
                            : updates.length
                              ? 'Refresh Updates'
                              : 'Load Updates'}
                        </button>
                      </div>

                      {timelineFetchedAt ? (
                        <p className="proposal-meta">
                          Last synced {new Date(timelineFetchedAt).toLocaleTimeString()}
                        </p>
                      ) : null}

                      {timeline?.executionBlock ? (
                        <p className="proposal-meta">
                          Progress {Number(timeline.executionBlock.progressPercent || 0)}% ·{' '}
                          {timeline.executionBlock.latestUpdate || 'No latest update posted'}
                        </p>
                      ) : null}

                      {timelineError ? <p className="proposal-meta">{timelineError}</p> : null}

                      {updates.length ? (
                        <ul className="proposal-execution-list">
                          {updates
                            .slice(-3)
                            .reverse()
                            .map((entry, idx) => (
                              <li key={`${proposalKey}-timeline-${idx}`}>
                                <strong>
                                  {entry.createdAt
                                    ? new Date(entry.createdAt).toLocaleDateString()
                                    : 'Update'}
                                  :
                                </strong>{' '}
                                {entry.message}
                              </li>
                            ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })
          : null}
      </section>

      {!isMine ? (
        <section className="section-card proposal-pagination">
          <button
            type="button"
            className="button ghost"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span>{pagedInfo}</span>
          <button
            type="button"
            className="button ghost"
            onClick={() => setPage((value) => Math.min(pagination.pages || 1, value + 1))}
            disabled={page >= (pagination.pages || 1)}
          >
            Next
          </button>
        </section>
      ) : null}
    </div>
  );
}
