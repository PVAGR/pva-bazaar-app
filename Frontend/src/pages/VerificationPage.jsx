import React from 'react';
import { Link } from 'react-router-dom';
import { VERIFICATION_STANDARD } from '../lib/philosophy.js';
import './InfoPages.css';

/**
 * Verification hub: where users see how artifacts are verified (hash + optional chain).
 * Why: Transparency—every claim is verifiable; no Druj.
 */
export default function VerificationPage() {
  return (
    <section className="section-card info-page">
      <header className="info-page__header">
        <p className="info-page__eyebrow">Verification</p>
        <h2>Every claim should be checkable</h2>
        <p className="info-page__lead">{VERIFICATION_STANDARD}</p>
      </header>

      <div className="info-grid">
        <article className="info-block">
          <h3>How verification is produced</h3>
          <p>
            Verification runs through repeatable scripts and CI workflows so results can be reproduced,
            compared, and audited over time.
          </p>
        </article>
        <article className="info-block">
          <h3>What users see</h3>
          <p>
            Item pages display AI-Verified status when a verification record exists. If no record exists,
            the item remains transparent as unverified.
          </p>
        </article>
      </div>

      <article className="info-highlight">
        <h3>Verification checklist</h3>
        <ul className="info-list">
          <li>Deterministic hash generation for artifact content</li>
          <li>Stored verification metadata and confidence fields</li>
          <li>API retrieval for artifact verification lookup</li>
          <li>UI badge state that reflects verification truthfully</li>
        </ul>
      </article>

      <div className="info-actions">
        <Link to="/search" className="button">Find an Artifact</Link>
        <Link to="/" className="button ghost">Browse Archive</Link>
      </div>
    </section>
  );
}
