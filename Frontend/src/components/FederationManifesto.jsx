import React from 'react';

const MANIFESTO_TEXT = "Welcome to the New Federation. This is the first design of a utopian digital sovereign space. Here, we inspire those who wish to join us in the coming race between man and technology, holding fast to our consciousness and selves. We are God's children, building a future where efficiency meets spirit.";

export default function FederationManifesto({ title = 'Federation Manifesto', compact = false }) {
  return (
    <section className={`federation-manifesto section-card${compact ? ' federation-manifesto--compact' : ''}`} aria-label="Federation Manifesto">
      <p className="pill federation-manifesto__pill">New Federation</p>
      <h2 className="federation-manifesto__title">{title}</h2>
      <p className="federation-manifesto__text">{MANIFESTO_TEXT}</p>
    </section>
  );
}
