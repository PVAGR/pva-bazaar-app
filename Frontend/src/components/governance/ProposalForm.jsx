import React, { useState } from 'react';

export default function ProposalForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [proposal, setProposal] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [costResources, setCostResources] = useState('');
  const [urgency, setUrgency] = useState('standard');
  const [committeeCategory, setCommitteeCategory] = useState('governance');
  const [targetTimeline, setTargetTimeline] = useState('');

  const canSubmit = title.trim() && problem.trim() && proposal.trim() && expectedOutcome.trim();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      title: title.trim(),
      problem: problem.trim(),
      proposal: proposal.trim(),
      expectedOutcome: expectedOutcome.trim(),
      costResources: costResources.trim(),
      urgency,
      committeeCategory,
      targetTimeline: targetTimeline.trim(),
    });

    setTitle('');
    setProblem('');
    setProposal('');
    setExpectedOutcome('');
    setCostResources('');
    setTargetTimeline('');
  };

  return (
    <form className="gov-form-wrap" onSubmit={handleSubmit}>
      <div className="gov-form-group">
        <label className="gov-form-label" htmlFor="gov-title">Title</label>
        <input
          id="gov-title"
          className="gov-form-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Citizen proposal title"
        />
      </div>

      <div className="gov-form-group">
        <label className="gov-form-label" htmlFor="gov-problem">Problem</label>
        <textarea
          id="gov-problem"
          className="gov-form-textarea"
          value={problem}
          onChange={(event) => setProblem(event.target.value)}
          placeholder="What issue are we solving?"
        />
      </div>

      <div className="gov-form-row">
        <div className="gov-form-group">
          <label className="gov-form-label" htmlFor="gov-category">Committee Category</label>
          <select
            id="gov-category"
            className="gov-form-select"
            value={committeeCategory}
            onChange={(event) => setCommitteeCategory(event.target.value)}
          >
            <option value="governance">Governance</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="health">Health</option>
            <option value="economy">Economy</option>
            <option value="education">Education</option>
          </select>
        </div>
        <div className="gov-form-group">
          <label className="gov-form-label" htmlFor="gov-urgency">Urgency</label>
          <select
            id="gov-urgency"
            className="gov-form-select"
            value={urgency}
            onChange={(event) => setUrgency(event.target.value)}
          >
            <option value="standard">Standard</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="gov-form-group">
        <label className="gov-form-label" htmlFor="gov-proposal">Proposal</label>
        <textarea
          id="gov-proposal"
          className="gov-form-textarea"
          value={proposal}
          onChange={(event) => setProposal(event.target.value)}
          placeholder="What should be done?"
        />
      </div>

      <div className="gov-form-group">
        <label className="gov-form-label" htmlFor="gov-outcome">Expected Outcome</label>
        <textarea
          id="gov-outcome"
          className="gov-form-textarea"
          value={expectedOutcome}
          onChange={(event) => setExpectedOutcome(event.target.value)}
          placeholder="What measurable result should happen?"
        />
      </div>

      <div className="gov-form-group">
        <label className="gov-form-label" htmlFor="gov-cost">Cost / Resources</label>
        <textarea
          id="gov-cost"
          className="gov-form-textarea"
          value={costResources}
          onChange={(event) => setCostResources(event.target.value)}
          placeholder="Budget, people, equipment, or resource assumptions"
        />
      </div>

      <div className="gov-form-group">
        <label className="gov-form-label" htmlFor="gov-timeline">Target Timeline (optional)</label>
        <input
          id="gov-timeline"
          className="gov-form-input"
          value={targetTimeline}
          onChange={(event) => setTargetTimeline(event.target.value)}
          placeholder="Example: Pilot in 30 days"
        />
      </div>

      <div className="gov-form-actions">
        <button type="button" className="gov-btn gov-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="gov-btn gov-btn-primary" disabled={!canSubmit}>Submit Proposal</button>
      </div>
    </form>
  );
}