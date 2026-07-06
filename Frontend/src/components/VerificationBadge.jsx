import React, { useEffect, useState } from 'react';
import { fetchVerificationByArtifact } from '../lib/api';
import './VerificationBadge.css';

/**
 * Shows AI-Verified status (green check) or Integrity Compromised / Unverified.
 * Why (Anti-Druj): Truth is visible; no hiding failed verification.
 * theme: 'default' | 'alchemical' for light vs dark gold styling.
 */
export default function VerificationBadge({ artifactIdOrSlug, className = '', theme = 'default' }) {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artifactIdOrSlug) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    fetchVerificationByArtifact(artifactIdOrSlug).then((res) => {
      if (!mounted) return;
      setVerification(res.ok ? res.verification : null);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [artifactIdOrSlug]);

  const themeClass = theme === 'alchemical' ? ' verification-badge--alchemical' : '';

  if (loading) {
    return (
      <span
        className={`verification-badge verification-badge--loading${themeClass} ${className}`}
        aria-hidden="true"
      >
        …
      </span>
    );
  }

  if (!verification) {
    return null;
  }

  const isVerified = verification.is_authentic && verification.confidence_score >= 1.0;
  const isCompromised =
    verification.status === 'integrity_compromised' || verification.status === 'error';

  if (isVerified) {
    return (
      <span
        className={`verification-badge verification-badge--verified${themeClass} ${className}`}
        title={verification.message || 'Hash verified against trusted database'}
      >
        <span className="verification-badge__icon" aria-hidden="true">
          ✓
        </span>
        <span>AI-Verified</span>
      </span>
    );
  }

  if (isCompromised) {
    return (
      <span
        className={`verification-badge verification-badge--compromised${themeClass} ${className}`}
        title={verification.message || 'Integrity compromised'}
      >
        <span className="verification-badge__icon" aria-hidden="true">
          ⚠
        </span>
        <span>Integrity Compromised</span>
      </span>
    );
  }

  return (
    <span
      className={`verification-badge verification-badge--unknown${themeClass} ${className}`}
      title={verification.message || 'Not in trusted database'}
    >
      <span className="verification-badge__icon" aria-hidden="true">
        ?
      </span>
      <span>Unverified</span>
    </span>
  );
}
