import React from 'react';
import './ErrorBanner.css';

/**
 * Reusable error display with optional retry.
 */
export default function ErrorBanner({ message, onRetry, onDismiss }) {
  if (!message) return null;
  return (
    <div className="errorBanner" role="alert">
      <span className="errorBanner__text">{message}</span>
      <div className="errorBanner__actions">
        {onRetry ? (
          <button type="button" className="btn ghost errorBanner__btn" onClick={onRetry}>
            Retry
          </button>
        ) : null}
        {onDismiss ? (
          <button type="button" className="btn ghost errorBanner__btn" onClick={onDismiss} aria-label="Dismiss">
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
