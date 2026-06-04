import React from 'react';

const MANIFESTO_TEXT = 'PVA Bazaar is built to preserve memory, protect provenance, and create fair trade between global makers and the buyers who value their work. It is meant to hold both the soul of the archive and the practical machinery of sourcing, shipping, and trust.';

export default function FederationManifesto({ title = 'Federation Manifesto', compact = false }) {
  return (
    <section className={`federation-manifesto section-card${compact ? ' federation-manifesto--compact' : ''}`} aria-label="Federation Manifesto">
      <p className="pill federation-manifesto__pill">New Federation</p>
      <h2 className="federation-manifesto__title">{title}</h2>
      <p className="federation-manifesto__text">{MANIFESTO_TEXT}</p>
    </section>
  );
}
