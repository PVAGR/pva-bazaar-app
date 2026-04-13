import React, { useEffect, useMemo, useState } from 'react';
import { useGovernanceStore } from '../store/governanceStore';
import {
  fetchGovernanceAdminResponses,
  fetchGovernanceExecutionTimeline,
  postGovernanceExecutionUpdate,
  upsertGovernanceAdminResponse,
} from '../lib/api';

function parseMilestones(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => ({ id: `M-${idx + 1}`, title: line.replace(/^[-*]\s*/, ''), done: false }));
}

export default function AdminGovernancePage() {
  const proposals = useGovernanceStore((state) => state.proposals);
  const setAdminDecision = useGovernanceStore((state) => state.setAdminDecision);
  const setExecutionProject = useGovernanceStore((state) => state.setExecutionProject);
  const removeProposal = useGovernanceStore((state) => state.removeProposal);
  const hydrateAdminResponses = useGovernanceStore((state) => state.hydrateAdminResponses);

  const [filter, setFilter] = useState('active');
  const [decisionForms, setDecisionForms] = useState({});
  const [executionForms, setExecutionForms] = useState({});
  const [timelines, setTimelines] = useState({});
  const [timelineLoading, setTimelineLoading] = useState({});
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadAdminResponses = async () => {
      try {
        const data = await fetchGovernanceAdminResponses();
        if (cancelled) return;
        if (data?.ok && Array.isArray(data.items) && data.items.length) {
          hydrateAdminResponses(data.items);
        }
      } catch (_err) {
        if (!cancelled) {
          setSyncError('Unable to sync saved admin governance responses right now.');
        }
      }
    };

    loadAdminResponses();
    return () => {
      cancelled = true;
    };
  }, [hydrateAdminResponses]);

  const filteredProposals = useMemo(() => {
    if (filter === 'all') return proposals;
    if (filter === 'queue') return proposals.filter((proposal) => proposal.status === 'conference_queue' || proposal.status === 'threshold_reached');
    if (filter === 'execution') return proposals.filter((proposal) => proposal.status === 'accepted' || proposal.status === 'in_execution' || proposal.status === 'completed');
    return proposals.filter((proposal) => !['completed', 'rejected'].includes(proposal.status));
  }, [filter, proposals]);

  const getDecisionForm = (proposal) => {
    return decisionForms[proposal.id] || {
      decision: proposal.adminDecision || proposal.status || 'conference_queue',
      reason: proposal.adminReason || '',
      nextStep: proposal.nextStep || '',
      targetTimeline: proposal.targetTimeline || '',
    };
  };

  const getExecutionForm = (proposal) => {
    return executionForms[proposal.id] || {
      owner: proposal.executionProject?.owner || '',
      milestonesText: (proposal.executionProject?.milestones || []).map((milestone) => milestone.title).join('\n'),
      progressPercent: proposal.executionProject?.progressPercent || 0,
      latestUpdate: proposal.executionProject?.latestUpdate || '',
      completed: Boolean(proposal.executionProject?.completed),
    };
  };

  const updateDecisionField = (proposalId, key, value) => {
    setDecisionForms((state) => ({
      ...state,
      [proposalId]: {
        ...(state[proposalId] || {}),
        [key]: value,
      },
    }));
  };

  const updateExecutionField = (proposalId, key, value) => {
    setExecutionForms((state) => ({
      ...state,
      [proposalId]: {
        ...(state[proposalId] || {}),
        [key]: value,
      },
    }));
  };

  const applyDecision = async (proposal) => {
    const form = getDecisionForm(proposal);
    setSyncError('');

    try {
      await upsertGovernanceAdminResponse(proposal.id, {
        decision: form.decision,
        reason: form.reason,
        nextStep: form.nextStep,
        targetTimeline: form.targetTimeline,
      });
    } catch (_err) {
      setSyncError('Backend persistence is unavailable right now. Decision was applied locally for continuity but is not yet authoritative across devices.');
    }

    setAdminDecision(proposal.id, {
      decision: form.decision,
      reason: form.reason,
      nextStep: form.nextStep,
      targetTimeline: form.targetTimeline,
    });
  };

  const applyExecution = async (proposal) => {
    const form = getExecutionForm(proposal);
    setSyncError('');

    const executionBlock = {
      owner: form.owner,
      milestones: parseMilestones(form.milestonesText),
      progressPercent: Number(form.progressPercent || 0),
      latestUpdate: form.latestUpdate,
      completed: Boolean(form.completed),
    };

    try {
      await upsertGovernanceAdminResponse(proposal.id, {
        executionBlock,
      });

      if (executionBlock.latestUpdate) {
        await postGovernanceExecutionUpdate(proposal.id, {
          message: executionBlock.latestUpdate,
          progressPercent: executionBlock.progressPercent,
        });
      }
    } catch (_err) {
      setSyncError('Backend persistence is unavailable right now. Execution updates were saved locally for continuity but are not yet authoritative across devices.');
    }

    setExecutionProject(proposal.id, {
      owner: executionBlock.owner,
      milestones: executionBlock.milestones,
      progressPercent: executionBlock.progressPercent,
      latestUpdate: executionBlock.latestUpdate,
      completed: executionBlock.completed,
    });

    loadTimeline(proposal.id);
  };

  const loadTimeline = async (proposalId) => {
    setTimelineLoading((state) => ({ ...state, [proposalId]: true }));
    try {
      const response = await fetchGovernanceExecutionTimeline(proposalId);
      if (response?.ok) {
        setTimelines((state) => ({
          ...state,
          [proposalId]: response.execution,
        }));
      }
    } catch (_error) {
      // Keep admin page functional even if timeline endpoint is unavailable.
    } finally {
      setTimelineLoading((state) => ({ ...state, [proposalId]: false }));
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      <header
        style={{
          textAlign: 'center',
          marginBottom: '20px',
          padding: '20px',
          background: 'var(--site-panel)',
          borderRadius: '12px',
          border: '1px solid var(--site-border)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Admin Governance Decisions</h1>
        <p style={{ margin: '8px 0 0', color: 'var(--site-text-muted)' }}>
          Publish public decisions and move accepted proposals into tracked execution.
        </p>
      </header>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {[
          { value: 'active', label: 'Active' },
          { value: 'queue', label: 'Conference Queue' },
          { value: 'execution', label: 'Execution' },
          { value: 'all', label: 'All' },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--site-border)',
              background: filter === item.value ? 'var(--site-accent)' : 'var(--site-panel-soft)',
              color: filter === item.value ? '#ffffff' : 'var(--site-text)',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {syncError ? (
        <div
          role="alert"
          style={{
            marginBottom: '12px',
            border: '1px solid var(--site-border)',
            borderRadius: '10px',
            background: 'var(--site-panel-soft)',
            color: 'var(--site-text)',
            padding: '10px 12px',
          }}
        >
          {syncError}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: '14px' }}>
        {filteredProposals.map((proposal) => {
          const decision = getDecisionForm(proposal);
          const execution = getExecutionForm(proposal);

          return (
            <section
              key={proposal.id}
              style={{
                background: 'var(--site-panel)',
                border: '1px solid var(--site-border)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <h2 style={{ margin: '0 0 8px', fontSize: '18px' }}>{proposal.id} · {proposal.title}</h2>
              <p style={{ margin: '0 0 12px', color: 'var(--site-text-muted)' }}>
                Status: {proposal.status} · Supports: {proposal.supportCount}
              </p>

              <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
                <label>
                  <span style={{ display: 'block', marginBottom: '4px', fontWeight: 700 }}>Decision</span>
                  <select
                    value={decision.decision}
                    onChange={(event) => updateDecisionField(proposal.id, 'decision', event.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--site-border)', background: 'var(--site-panel-soft)', color: 'var(--site-text)' }}
                  >
                    <option value="public">public</option>
                    <option value="conference_queue">conference_queue</option>
                    <option value="accepted">accepted</option>
                    <option value="rejected">rejected</option>
                    <option value="needs_revision">needs_revision</option>
                    <option value="in_execution">in_execution</option>
                    <option value="completed">completed</option>
                  </select>
                </label>

                <label>
                  <span style={{ display: 'block', marginBottom: '4px', fontWeight: 700 }}>Reason (public)</span>
                  <textarea
                    value={decision.reason}
                    onChange={(event) => updateDecisionField(proposal.id, 'reason', event.target.value)}
                    style={{ width: '100%', minHeight: '78px', padding: '8px', borderRadius: '8px', border: '1px solid var(--site-border)', background: 'var(--site-panel-soft)', color: 'var(--site-text)' }}
                  />
                </label>

                <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <label>
                    <span style={{ display: 'block', marginBottom: '4px', fontWeight: 700 }}>Next Step</span>
                    <input
                      value={decision.nextStep}
                      onChange={(event) => updateDecisionField(proposal.id, 'nextStep', event.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--site-border)', background: 'var(--site-panel-soft)', color: 'var(--site-text)' }}
                    />
                  </label>
                  <label>
                    <span style={{ display: 'block', marginBottom: '4px', fontWeight: 700 }}>Target Timeline</span>
                    <input
                      value={decision.targetTimeline}
                      onChange={(event) => updateDecisionField(proposal.id, 'targetTimeline', event.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--site-border)', background: 'var(--site-panel-soft)', color: 'var(--site-text)' }}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => applyDecision(proposal)}
                  style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: 'var(--site-accent)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Publish Decision
                </button>
                <button
                  type="button"
                  onClick={() => removeProposal(proposal.id)}
                  style={{ padding: '8px 14px', border: '1px solid var(--site-border)', borderRadius: '8px', background: 'var(--site-panel-soft)', color: 'var(--site-text)', fontWeight: 700, cursor: 'pointer' }}
                >
                  Remove
                </button>
              </div>

              {['accepted', 'in_execution', 'completed'].includes(proposal.status) || proposal.executionProject ? (
                <div style={{ borderTop: '1px dashed var(--site-border)', paddingTop: '12px' }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: '16px' }}>Execution Tracker</h3>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <label>
                      <span style={{ display: 'block', marginBottom: '4px', fontWeight: 700 }}>Project Owner</span>
                      <input
                        value={execution.owner}
                        onChange={(event) => updateExecutionField(proposal.id, 'owner', event.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--site-border)', background: 'var(--site-panel-soft)', color: 'var(--site-text)' }}
                      />
                    </label>
                    <label>
                      <span style={{ display: 'block', marginBottom: '4px', fontWeight: 700 }}>Milestones (one per line)</span>
                      <textarea
                        value={execution.milestonesText}
                        onChange={(event) => updateExecutionField(proposal.id, 'milestonesText', event.target.value)}
                        style={{ width: '100%', minHeight: '76px', padding: '8px', borderRadius: '8px', border: '1px solid var(--site-border)', background: 'var(--site-panel-soft)', color: 'var(--site-text)' }}
                      />
                    </label>
                    <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                      <label>
                        <span style={{ display: 'block', marginBottom: '4px', fontWeight: 700 }}>Progress %</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={execution.progressPercent}
                          onChange={(event) => updateExecutionField(proposal.id, 'progressPercent', event.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--site-border)', background: 'var(--site-panel-soft)', color: 'var(--site-text)' }}
                        />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '26px' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(execution.completed)}
                          onChange={(event) => updateExecutionField(proposal.id, 'completed', event.target.checked)}
                        />
                        Completed
                      </label>
                    </div>
                    <label>
                      <span style={{ display: 'block', marginBottom: '4px', fontWeight: 700 }}>Latest Update</span>
                      <textarea
                        value={execution.latestUpdate}
                        onChange={(event) => updateExecutionField(proposal.id, 'latestUpdate', event.target.value)}
                        style={{ width: '100%', minHeight: '76px', padding: '8px', borderRadius: '8px', border: '1px solid var(--site-border)', background: 'var(--site-panel-soft)', color: 'var(--site-text)' }}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyExecution(proposal)}
                    style={{ marginTop: '10px', padding: '8px 14px', border: 'none', borderRadius: '8px', background: 'var(--site-accent)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Save Execution Block
                  </button>
                  <button
                    type="button"
                    onClick={() => loadTimeline(proposal.id)}
                    style={{ marginTop: '10px', marginLeft: '8px', padding: '8px 14px', border: '1px solid var(--site-border)', borderRadius: '8px', background: 'var(--site-panel-soft)', color: 'var(--site-text)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {timelineLoading[proposal.id] ? 'Loading…' : 'Load Timeline'}
                  </button>

                  {(timelines[proposal.id]?.updates || []).length ? (
                    <div style={{ marginTop: '12px', borderTop: '1px dashed var(--site-border)', paddingTop: '10px' }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>Execution History</h4>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {timelines[proposal.id].updates.slice(-5).reverse().map((entry, idx) => (
                          <div key={`${proposal.id}-update-${idx}`} className="gov-detail-body" style={{ background: 'var(--site-panel-soft)', border: '1px solid var(--site-border)', borderRadius: '8px', padding: '8px' }}>
                            <div style={{ marginBottom: '4px' }}>{entry.message}</div>
                            <div style={{ color: 'var(--site-text-muted)', fontSize: '12px' }}>
                              Progress: {Number(entry.progressPercent || 0)}% · {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'timestamp unavailable'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
