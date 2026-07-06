import React from 'react';
import { Link } from 'react-router-dom';
import { MISSION_STATEMENT, ANTI_DRUJ, SITE_TAGLINE } from '../lib/philosophy.js';
import './InfoPages.css';

/**
 * Manifesto: mission and philosophy in one place.
 * Why: One canonical place for intent—so the "why" is never buried.
 */
export default function ManifestoPage() {
  return (
    <section className="section-card info-page">
      <header className="info-page__header">
        <p className="info-page__eyebrow">Manifesto</p>
        <h2>Build for truth, clarity, and continuity</h2>
        <p className="info-page__lead">
          <strong>{SITE_TAGLINE}</strong>
        </p>
      </header>

      <article className="info-highlight">
        <h3>Core mission</h3>
        <p>{MISSION_STATEMENT}</p>
      </article>

      <div className="info-grid">
        <article className="info-block">
          <h3>Anti-Druj standard</h3>
          <p>{ANTI_DRUJ}</p>
        </article>
        <article className="info-block">
          <h3>Practical direction</h3>
          <p>
            Preserve public-domain and scarce-knowledge artifacts with verifiable records, then
            expand coverage carefully while keeping trust and readability first.
          </p>
        </article>
      </div>

      <div className="info-actions">
        <Link to="/verification" className="button">
          See Verification
        </Link>
        <Link to="/about" className="button ghost">
          About the Archive
        </Link>
      </div>
    </section>
  );
}
