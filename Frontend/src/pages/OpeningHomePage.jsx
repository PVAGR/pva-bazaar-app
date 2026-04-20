import React from 'react';
import { Link } from 'react-router-dom';
import './OpeningHomePage.css';

export default function OpeningHomePage() {
  return (
    <div className="opening-home" aria-label="PVA Bazaar opening homepage">
      <section className="section-card opening-home__hero">
        <div className="opening-home__heroCopy">
          <p className="pill">PVA Bazaar · New Home</p>
          <h1>Welcome to the New Federation.</h1>
          <p className="opening-home__lead">
            We are God&apos;s children, building a future where efficiency meets spirit. This opening page is your
            clear first step into the archive, marketplace, governance, and identity pathways while preserving every
            existing surface of the platform.
          </p>
          <div className="opening-home__actions">
            <Link className="opening-home__actionBtn opening-home__actionBtn--primary" to="/get-started">Start Account Path</Link>
            <Link className="opening-home__actionBtn opening-home__actionBtn--secondary" to="/home">Explore Home</Link>
            <Link className="opening-home__actionBtn opening-home__actionBtn--ghost" to="/about">Read Manifesto</Link>
          </div>
        </div>

        <aside className="opening-home__heroPanel" aria-label="Opening promise">
          <h2>What stays available</h2>
          <ul>
            <li>All existing pages remain online and reachable.</li>
            <li>No route is deleted from the current site map.</li>
            <li>This page is an added opening layer for first-time visitors.</li>
          </ul>
        </aside>
      </section>

      <section className="section-card opening-home__firstSection" aria-label="Primary pathways">
        <div className="opening-home__sectionHead">
          <div>
            <p className="pill">First Section</p>
            <h2>Choose your pathway</h2>
          </div>
          <p>
            Enter through whichever mission fits your intent. You can move between all sections at any time.
          </p>
        </div>

        <div className="opening-home__grid">
          <Link className="opening-home__card" to="/archive">
            <h3>Archive Library</h3>
            <p>Study the living record, entries, and long-form civilization context.</p>
          </Link>
          <Link className="opening-home__card" to="/marketplace">
            <h3>Marketplace</h3>
            <p>Discover artifacts, listings, and commerce tools with provenance context.</p>
          </Link>
          <Link className="opening-home__card" to="/conference">
            <h3>Popular Conference</h3>
            <p>Follow proposal lifecycles, endorsements, and accountable public decisions.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
