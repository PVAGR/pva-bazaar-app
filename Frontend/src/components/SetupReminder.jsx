import React from 'react';
import './SetupReminder.css';

export default function SetupReminder({ missingSteps = [], onDismiss = null }) {
  if (!missingSteps || missingSteps.length === 0) {
    return null;
  }

  return (
    <div className="setup-reminder">
      <div className="reminder-header">
        <span className="reminder-icon">📋</span>
        <span className="reminder-title">Complete your seller setup</span>
        {onDismiss && (
          <button className="reminder-close" onClick={onDismiss} aria-label="Dismiss">
            ✕
          </button>
        )}
      </div>

      <p className="reminder-intro">You still need to:</p>

      <ul className="reminder-steps">
        {missingSteps.map((step) => (
          <li key={step.id} className="reminder-step">
            <span className="step-label">{step.label}</span>
            <span className="step-hint">{step.hint}</span>
          </li>
        ))}
      </ul>

      <p className="reminder-note">
        Complete these before posting your first item to ensure buyers have confidence in your
        listings.
      </p>
    </div>
  );
}
