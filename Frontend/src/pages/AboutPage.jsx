import React from 'react';
import { Link } from 'react-router-dom';
import { MISSION_STATEMENT, SITE_TAGLINE } from '../lib/philosophy.js';
import './InfoPages.css';

export default function AboutPage() {
  return (
    <section className="section-card info-page">
      <header className="info-page__header">
        <p className="info-page__eyebrow">About</p>
        <h2>Human-readable archive, preserved with intent</h2>
        <p className="info-page__lead">
          {SITE_TAGLINE}. This space is built to keep your writing findable, readable, and durable.
        </p>
      </header>

      <div className="info-grid">
        <article className="info-block">
          <h3>What this is</h3>
          <p>
            A focused journal and archive experience where your long-form writing stays central.
            The interface is designed for calm reading, reliable search, and durable publication.
          </p>
        </article>
        <article className="info-block">
          <h3>How it works</h3>
          <p>
            Content is served through the API and rendered with a consistent themed UI. Admin tools
            are available for controlled publishing and updates when you are authenticated.
          </p>
        </article>
      </div>

      <article className="info-highlight">
        <h3>Mission</h3>
        <p>{MISSION_STATEMENT}</p>
      </article>

      <div className="info-actions">
        <Link to="/" className="button">Open Archive</Link>
        <Link to="/search" className="button ghost">Search Writings</Link>
        <Link to="/manifesto" className="button ghost">Read Manifesto</Link>
      </div>
    </section>
  );
}
