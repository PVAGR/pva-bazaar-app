import React from 'react';
import './SkeletonLoader.css';

/**
 * Skeleton loader for content placeholders while data loads
 * Provides visual feedback and reduces perceived loading time
 */

export function SkeletonText({ width = '100%', lines = 1, className = '' }) {
  return (
    <div className={`skeleton-text ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-text__line"
          style={{ width: i === lines - 1 && lines > 1 ? '70%' : width }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`skeleton-card ${className}`}>
      <div className="skeleton-card__header">
        <div className="skeleton-card__avatar" />
        <div className="skeleton-card__title-group">
          <SkeletonText width="60%" />
          <SkeletonText width="40%" />
        </div>
      </div>
      <div className="skeleton-card__body">
        <SkeletonText lines={3} />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3, className = '' }) {
  return (
    <div className={`skeleton-list ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-list__item">
          <div className="skeleton-list__icon" />
          <div className="skeleton-list__content">
            <SkeletonText width="80%" />
            <SkeletonText width="50%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonArticle({ className = '' }) {
  return (
    <div className={`skeleton-article ${className}`}>
      <div className="skeleton-article__header">
        <div className="skeleton-article__category" />
        <SkeletonText width="70%" />
        <div className="skeleton-article__meta">
          <SkeletonText width="120px" />
          <SkeletonText width="80px" />
        </div>
      </div>
      <div className="skeleton-article__body">
        <SkeletonText lines={6} />
        <div className="skeleton-article__image" />
        <SkeletonText lines={4} />
      </div>
    </div>
  );
}

export function SkeletonGrid({ columns = 3, rows = 2, className = '' }) {
  return (
    <div 
      className={`skeleton-grid ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {Array.from({ length: columns * rows }).map((_, i) => (
        <div key={i} className="skeleton-grid__item">
          <div className="skeleton-grid__image" />
          <SkeletonText width="90%" />
          <SkeletonText width="60%" />
        </div>
      ))}
    </div>
  );
}

// Default export for convenience
export default function SkeletonLoader({ variant = 'text', ...props }) {
  switch (variant) {
    case 'card':
      return <SkeletonCard {...props} />;
    case 'list':
      return <SkeletonList {...props} />;
    case 'article':
      return <SkeletonArticle {...props} />;
    case 'grid':
      return <SkeletonGrid {...props} />;
    case 'text':
    default:
      return <SkeletonText {...props} />;
  }
}
