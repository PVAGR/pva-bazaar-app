import React from 'react';
import { VERIFICATION_STANDARD } from '../lib/philosophy.js';

/**
 * Verification hub: where users see how artifacts are verified (hash + optional chain).
 * Why: Transparency—every claim is verifiable; no Druj.
 */
export default function VerificationPage() {
  return (
    <section className="section-card">
      <h2>Verification</h2>
      <p>{VERIFICATION_STANDARD}</p>
      <p>
        Verification scripts run in CI (e.g. GitHub Actions) so results are reproducible.
        You can re-run checks locally or inspect hashes and proofs for any artifact.
      </p>
      <p style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e8ecef', color: '#555' }}>
        Product pages show an <strong>AI-Verified</strong> badge when a verification record exists for that item.
        For the full flow (scripts, CI, API, badge), see <code>docs/VERIFICATION-SYSTEM.md</code> and <code>scripts/README-verification.md</code> in the repo.
      </p>
    </section>
  );
}
