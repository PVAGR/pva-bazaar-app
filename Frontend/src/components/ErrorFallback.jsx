import React from 'react';
import './ErrorFallback.css';

/**
 * Themed error fallback for React error boundaries
 * Matches Archive Library design baseline (dark blue/green theme)
 */
export default function ErrorFallback({ error, resetError }) {
  return (
    <div className="errorFallback">
      <div className="errorFallback__container">
        <div className="errorFallback__icon">⚠</div>
        <h1 className="errorFallback__title">Something went wrong</h1>
        <p className="errorFallback__message">
          We've been notified and will look into it. You can try reloading the page or return to the
          archive.
        </p>

        {error && import.meta.env.MODE === 'development' && (
          <details className="errorFallback__details">
            <summary>Error details (dev only)</summary>
            <pre className="errorFallback__stack">
              {error.toString()}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="errorFallback__actions">
          <button
            type="button"
            onClick={resetError}
            className="errorFallback__btn errorFallback__btn--primary"
          >
            Try again
          </button>
          <a href="/#/" className="errorFallback__btn errorFallback__btn--secondary">
            Go to Archive
          </a>
        </div>
      </div>
    </div>
  );
}
