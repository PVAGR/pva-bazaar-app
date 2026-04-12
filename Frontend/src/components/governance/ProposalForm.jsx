import React, { useState } from 'react';

export default function ProposalForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [outcome, setOutcome] = useState('');

  const canSubmit = title.trim() && problem.trim() && solution.trim() && outcome.trim();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      title: title.trim(),
      problem: problem.trim(),
      solution: solution.trim(),
      outcome: outcome.trim(),
      category: 'Governance',
      urgency: 'Standard',
    });

    setTitle('');
    setProblem('');
    setSolution('');
    setOutcome('');
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

      <div className="gov-form-group">
        <label className="gov-form-label" htmlFor="gov-solution">Solution</label>
        <textarea
          id="gov-solution"
          className="gov-form-textarea"
          value={solution}
          onChange={(event) => setSolution(event.target.value)}
          placeholder="What should be done?"
        />
      </div>

      <div className="gov-form-group">
        <label className="gov-form-label" htmlFor="gov-outcome">Outcome</label>
        <textarea
          id="gov-outcome"
          className="gov-form-textarea"
          value={outcome}
          onChange={(event) => setOutcome(event.target.value)}
          placeholder="What measurable result should happen?"
        />
      </div>

      <div className="gov-form-actions">
        <button type="button" className="gov-btn gov-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="gov-btn gov-btn-primary" disabled={!canSubmit}>Submit Proposal</button>
      </div>
    </form>
  );
}