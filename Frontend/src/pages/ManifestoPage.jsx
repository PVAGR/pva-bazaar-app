import React from 'react';
import { MISSION_STATEMENT, ANTI_DRUJ, SITE_TAGLINE } from '../lib/philosophy.js';

/**
 * Manifesto: mission and philosophy in one place.
 * Why: One canonical place for intent—so the "why" is never buried.
 */
export default function ManifestoPage() {
  return (
    <section className="section-card">
      <h2>Manifesto</h2>
      <p><strong>{SITE_TAGLINE}</strong></p>
      <p>{MISSION_STATEMENT}</p>
      <p>{ANTI_DRUJ}</p>
      <hr />
      <p style={{ color: '#555', fontSize: '0.95rem' }}>
        PVA Bazaar monetizes public-domain and scarce-knowledge artifacts through
        AI-verified preservation—starting with retro games and expanding to manuscripts
        and other at-risk cultural objects.
      </p>
    </section>
  );
}
