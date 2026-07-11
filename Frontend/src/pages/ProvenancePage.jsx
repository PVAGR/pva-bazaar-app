import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import './PublicLandingPage.css';

const PROVENANCE_POINTS = [
  'Origin is recorded honestly.',
  'Supplier claims are reviewed against available records.',
  'Educational and cultural context stays attached to the item.',
  'Regulated goods are handled cautiously and only where lawful.',
  'Institutional requests are handled with clear scope and documentation.',
];

export default function ProvenancePage() {
  return (
    <section className="static-page">
      <Helmet>
        <title>PVA Bazaar Provenance | Product Origins and Trust</title>
        <meta
          name="description"
          content="PVA Bazaar provenance explains how product origins, supplier verification, and educational context are documented."
        />
        <link rel="canonical" href="https://pvabazaar.org/provenance" />
      </Helmet>

      <header className="static-page__hero">
        <p className="static-page__kicker">Provenance</p>
        <h1>Where every item keeps its story.</h1>
        <p>
          PVA Bazaar links goods to their origin, context, and educational value so buyers, schools, and partners can
          make informed decisions.
        </p>
        <div className="static-page__actions">
          <Link className="button" to="/marketplace">Browse listings</Link>
          <Link className="button ghost" to="/contact">Request sourcing help</Link>
        </div>
      </header>

      <section className="static-page__card">
        <h2>How we approach trust</h2>
        <ul className="static-page__list">
          {PROVENANCE_POINTS.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <div className="static-page__grid">
        <article className="static-page__card">
          <h2>For schools and museums</h2>
          <p>Request materials with enough context for teaching, display, and classroom use.</p>
        </article>
        <article className="static-page__card">
          <h2>For suppliers</h2>
          <p>Provide clear origin, handling, and product notes so your listing can stand on real information.</p>
        </article>
        <article className="static-page__card">
          <h2>For buyers</h2>
          <p>Use the provenance record to understand where an item comes from and why it matters.</p>
        </article>
      </div>
    </section>
  );
}
