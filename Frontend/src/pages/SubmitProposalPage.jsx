import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createProposal,
  fetchMyPassport,
  publishProposal,
} from '../lib/api';
import './ProposalEngine.css';

const CATEGORIES = [
  { key: 'governance', icon: '🏛️', label: 'Governance' },
  { key: 'economy', icon: '💱', label: 'Economy' },
  { key: 'health', icon: '🩺', label: 'Health' },
  { key: 'learning', icon: '📚', label: 'Learning' },
  { key: 'housing', icon: '🏠', label: 'Housing' },
  { key: 'justice', icon: '⚖️', label: 'Justice' },
  { key: 'culture', icon: '🎭', label: 'Culture' },
  { key: 'infrastructure', icon: '🛠️', label: 'Infrastructure' },
  { key: 'emergency', icon: '🚨', label: 'Emergency' },
];

const DEFAULT_DRAFT = {
  category: '',
  title: '',
  problem: '',
  solution: '',
  expectedOutcome: '',
  estimatedCost: '',
  timeline: '',
};

export default function SubmitProposalPage() {
  const [eligible, setEligible] = useState(null);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [created, setCreated] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetchMyPassport();
        if (!active) return;
        const item = response?.item;
        const isEligible = item?.passportStatus === 'verified' && item?.governanceToken === true;
        setEligible(Boolean(isEligible));
      } catch (_error) {
        if (active) setEligible(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const canContinueStep2 = useMemo(() => Boolean(draft.category), [draft.category]);
  const canSubmit = useMemo(() => (
    Boolean(draft.category)
    && Boolean(draft.title.trim())
    && Boolean(draft.problem.trim())
    && Boolean(draft.solution.trim())
    && Boolean(draft.expectedOutcome.trim())
  ), [draft]);

  const submitDraft = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await createProposal(draft);
      if (!response?.ok || !response.item) {
        setMessage(response?.message || 'Failed to create proposal.');
      } else {
        setCreated(response.item);
        setMessage('Proposal draft created successfully.');
      }
    } catch (error) {
      setMessage(error?.message || 'Failed to create proposal.');
    } finally {
      setSaving(false);
    }
  };

  const publishNow = async () => {
    if (!created?.proposalId) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await publishProposal(created.proposalId);
      if (response?.ok && response.item) {
        setCreated(response.item);
        setMessage('Proposal published and now open for endorsements.');
      } else {
        setMessage(response?.message || 'Failed to publish proposal.');
      }
    } catch (error) {
      setMessage(error?.message || 'Failed to publish proposal.');
    } finally {
      setSaving(false);
    }
  };

  if (eligible === null) {
    return <section className="section-card"><p>Checking citizen eligibility...</p></section>;
  }

  if (!eligible) {
    return (
      <section className="section-card">
        <h1>Submit Proposal</h1>
        <p>Only verified citizens can submit proposals.</p>
        <Link className="button" to="/passport">Open Passport Verification</Link>
      </section>
    );
  }

  return (
    <div className="proposal-page">
      <section className="section-card proposal-header">
        <div className="pill">Phase C2</div>
        <h1>Submit a New Proposal</h1>
        <p>Three-step flow: category, policy details, and final preview.</p>
      </section>

      <section className="section-card">
        <p>Step {step} of 3</p>

        {step === 1 ? (
          <div className="proposal-category-grid">
            {CATEGORIES.map((category) => (
              <button
                type="button"
                key={category.key}
                className={`proposal-category-card ${draft.category === category.key ? 'active' : ''}`}
                onClick={() => setDraft((prev) => ({ ...prev, category: category.key }))}
              >
                <div>{category.icon}</div>
                <h3>{category.label}</h3>
              </button>
            ))}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="proposal-form">
            <label>
              Title
              <input value={draft.title} maxLength={150} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} />
            </label>
            <label>
              Problem
              <textarea value={draft.problem} maxLength={2000} rows={5} onChange={(event) => setDraft((prev) => ({ ...prev, problem: event.target.value }))} />
            </label>
            <label>
              Proposed solution
              <textarea value={draft.solution} maxLength={2000} rows={5} onChange={(event) => setDraft((prev) => ({ ...prev, solution: event.target.value }))} />
            </label>
            <label>
              Expected outcome
              <textarea value={draft.expectedOutcome} maxLength={1000} rows={4} onChange={(event) => setDraft((prev) => ({ ...prev, expectedOutcome: event.target.value }))} />
            </label>
            <label>
              Estimated cost (optional)
              <input value={draft.estimatedCost} onChange={(event) => setDraft((prev) => ({ ...prev, estimatedCost: event.target.value }))} />
            </label>
            <label>
              Timeline (optional)
              <input value={draft.timeline} onChange={(event) => setDraft((prev) => ({ ...prev, timeline: event.target.value }))} />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="proposal-detail-grid">
            <article><h3>Category</h3><p>{draft.category}</p></article>
            <article><h3>Title</h3><p>{draft.title || 'Missing title'}</p></article>
            <article><h3>Problem</h3><p>{draft.problem || 'Missing problem statement'}</p></article>
            <article><h3>Solution</h3><p>{draft.solution || 'Missing proposed solution'}</p></article>
            <article><h3>Expected outcome</h3><p>{draft.expectedOutcome || 'Missing expected outcome'}</p></article>
            <article><h3>Logistics</h3><p>{draft.estimatedCost || 'No cost set'} · {draft.timeline || 'No timeline set'}</p></article>
          </div>
        ) : null}

        <div className="home-hero__actions" style={{ marginTop: '0.9rem' }}>
          <button type="button" className="button ghost" onClick={() => setStep((value) => Math.max(1, value - 1))} disabled={step === 1}>Back</button>
          {step === 1 ? (
            <button type="button" className="button" onClick={() => setStep(2)} disabled={!canContinueStep2}>Continue</button>
          ) : null}
          {step === 2 ? (
            <button type="button" className="button" onClick={() => setStep(3)} disabled={!canSubmit}>Preview</button>
          ) : null}
          {step === 3 ? (
            <button type="button" className="button" onClick={submitDraft} disabled={!canSubmit || saving}>{saving ? 'Submitting...' : 'Submit Draft'}</button>
          ) : null}
        </div>
      </section>

      {created ? (
        <section className="section-card">
          <h2>Proposal created</h2>
          <p>Proposal ID: <strong>{created.proposalId}</strong></p>
          <p>Current status: <strong>{created.status}</strong></p>
          <div className="home-hero__actions">
            <button type="button" className="button" onClick={publishNow} disabled={saving || created.status !== 'draft'}>
              {created.status === 'draft' ? 'Publish Now' : 'Already Published'}
            </button>
            <Link className="button ghost" to={`/proposals/${encodeURIComponent(created.proposalId)}`}>Open Proposal</Link>
            <Link className="button secondary" to="/proposals/my">Keep as Draft</Link>
          </div>
        </section>
      ) : null}

      {message ? <section className="section-card"><p>{message}</p></section> : null}
    </div>
  );
}
