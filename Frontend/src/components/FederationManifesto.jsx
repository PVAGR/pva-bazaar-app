import React from 'react';
import { FEDERATION_MANIFESTO } from '../lib/philosophy.js';

export default function FederationManifesto({ title = 'Federation Manifesto', compact = false, text = FEDERATION_MANIFESTO }) {
  return (
    <section className={`federation-manifesto section-card${compact ? ' federation-manifesto--compact' : ''}`} aria-label="Federation Manifesto">
      <p className="pill federation-manifesto__pill">New Federation</p>
      <h2 className="federation-manifesto__title">{title}</h2>
      <p className="federation-manifesto__text">{text}</p>
    </section>
  );
}
