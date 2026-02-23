import React from 'react';
import './LoadingSpinner.css';

/**
 * Lightweight loading indicator for API-heavy sections.
 */
export default function LoadingSpinner({ size = 'medium', label }) {
  return (
    <div className={`loadingSpinner loadingSpinner--${size}`} role="status" aria-label={label || 'Loading'}>
      <div className="loadingSpinner__dot" />
      <div className="loadingSpinner__dot" />
      <div className="loadingSpinner__dot" />
      {label ? <span className="loadingSpinner__label">{label}</span> : null}
    </div>
  );
}
