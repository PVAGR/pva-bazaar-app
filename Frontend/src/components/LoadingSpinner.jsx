import React from 'react';
import './LoadingSpinner.css';

/**
 * Themed loading spinner for async operations
 * Lightweight alternative to skeleton loaders for quick feedback
 */
export default function LoadingSpinner({ size = 'medium', label, inline = false, className = '' }) {
  const sizeClass = `loading-spinner--${size}`;
  const containerClass = inline ? 'loading-spinner--inline' : '';

  return (
    <div
      className={`loading-spinner ${sizeClass} ${containerClass} ${className}`}
      role="status"
      aria-label={label || 'Loading'}
    >
      <div className="loading-spinner__circle">
        <div className="loading-spinner__arc" />
      </div>
      {label && <span className="loading-spinner__label">{label}</span>}
    </div>
  );
}

export function LoadingDots({ size = 'medium', label, className = '' }) {
  const sizeClass = `loading-dots--${size}`;

  return (
    <div
      className={`loading-dots ${sizeClass} ${className}`}
      role="status"
      aria-label={label || 'Loading'}
    >
      <div className="loading-dots__dot" />
      <div className="loading-dots__dot" />
      <div className="loading-dots__dot" />
      {label && <span className="loading-dots__label">{label}</span>}
    </div>
  );
}
