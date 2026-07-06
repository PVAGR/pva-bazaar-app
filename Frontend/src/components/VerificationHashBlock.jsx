import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './VerificationHashBlock.css';

/**
 * Displays verification proof (certificate ID or hash) partially, expandable on interaction.
 * Alchemical Digital: precision without clutter; full hash on demand for transparency (Anti-Druj).
 */
export default function VerificationHashBlock({ verification, theme = 'alchemical' }) {
  const [expanded, setExpanded] = useState(false);
  const certificateId = verification?.certificateId || '';
  const hash = verification?.computed_hash || '';
  const displayValue = hash || certificateId;
  const partial =
    displayValue.length > 16
      ? `${displayValue.slice(0, 8)}…${displayValue.slice(-8)}`
      : displayValue;

  if (!displayValue) return null;

  const isVerified = verification?.is_authentic && (verification?.confidence_score ?? 0) >= 1.0;

  return (
    <div
      className={`verification-hash-block verification-hash-block--${theme}`}
      role="region"
      aria-label="Verification proof"
    >
      <div className="verification-hash-block__label">
        {hash ? 'Verification hash' : 'Certificate'}
      </div>
      <button
        type="button"
        className="verification-hash-block__trigger"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse full value' : 'Show full value'}
      >
        <code className="verification-hash-block__partial">{partial}</code>
        <span className="verification-hash-block__expand-icon" aria-hidden="true">
          {expanded ? '▲' : '▼'}
        </span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="verification-hash-block__full"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <code className="verification-hash-block__full-value">{displayValue}</code>
            {isVerified && <span className="verification-hash-block__status">AI-Verified</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
