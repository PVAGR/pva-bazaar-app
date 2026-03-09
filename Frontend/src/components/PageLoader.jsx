import React from 'react';
import LoadingSpinner from './LoadingSpinner.jsx';
import './PageLoader.css';

/**
 * Loading fallback for lazy-loaded pages
 * Shows during page transitions with code splitting
 */
export default function PageLoader({ message = 'Loading page...' }) {
  return (
    <div className="page-loader">
      <div className="page-loader__content">
        <LoadingSpinner size="large" />
        <p className="page-loader__message">{message}</p>
      </div>
    </div>
  );
}

export function InlineLoader({ message = 'Loading...' }) {
  return (
    <div className="inline-loader">
      <LoadingSpinner size="small" inline />
      <span className="inline-loader__message">{message}</span>
    </div>
  );
}
