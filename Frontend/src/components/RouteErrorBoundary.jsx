import React from 'react';
import * as Sentry from '@sentry/react';
import { createLogger } from '../lib/logger';

const logger = createLogger('ErrorBoundary');

/**
 * React Error Boundary for catching component errors
 * Integrates with Sentry for error reporting
 */
class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('React component error', error, errorInfo);
    
    // Sentry will automatically capture this via its error boundary
    // but we can add additional context here if needed
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI for route-level errors
      return (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--site-text)',
        }}>
          <div style={{
            maxWidth: '480px',
            margin: '0 auto',
            padding: '32px',
            background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
            borderRadius: '12px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠</div>
            <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>
              This page encountered an error
            </h2>
            <p style={{
              margin: '0 0 24px',
              color: 'var(--site-text-muted, rgba(226, 232, 240, 0.7))',
              fontSize: '14px',
            }}>
              The error has been reported. Try refreshing the page or return to the archive.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  background: 'var(--accent, #38bdf8)',
                  color: 'var(--site-bg, #0a1628)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Reload page
              </button>
              <a
                href="/#/"
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: 'var(--site-text)',
                  border: '1px solid var(--card-border, rgba(255, 255, 255, 0.15))',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Go to Archive
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
