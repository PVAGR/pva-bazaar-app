import React from 'react';
import { Link } from 'react-router-dom';
import './OpeningHomePage.css';

export default function OpeningHomePage() {
  return (
    <div className="opening-home" aria-label="PVA Bazaar opening homepage">
      <section className="section-card opening-home__hero">
        <div className="opening-home__heroCopy">
          <p className="pill">PVA Bazaar · Personal site + business suite</p>
          <h1>Everything I keep building, in one living place.</h1>
          <p className="opening-home__lead">
            This site is my personal archive, business bridge, recovery layer, and public operating surface.
            It holds my words, my commerce work, the HeelKawn universe, and the live tools I use to keep everything
            organized and visible without hiding or breaking the record.
          </p>
          <div className="opening-home__actions">
            <Link className="opening-home__actionBtn opening-home__actionBtn--primary" to="/archive">
              Open archive
            </Link>
            <Link className="opening-home__actionBtn opening-home__actionBtn--secondary" to="/marketplace">
              Open business side
            </Link>
            <Link className="opening-home__actionBtn opening-home__actionBtn--ghost" to="/heelkawn">
              Open HeelKawn
            </Link>
          </div>
        </div>

        <aside className="opening-home__heroPanel" aria-label="Opening promise">
          <h2>What stays visible</h2>
          <ul>
            <li>My notes and writings stay part of the site, not hidden away.</li>
            <li>The business surface stays connected to suppliers, buyers, and operations.</li>
            <li>The game and the website can grow together without erasing the record.</li>
          </ul>
        </aside>
      </section>

      <section className="section-card opening-home__firstSection" aria-label="Primary pathways">
        <div className="opening-home__sectionHead">
          <div>
            <p className="pill">First Section</p>
            <h2>Choose the surface you need</h2>
          </div>
          <p>
            Every route is part of the same living website. Pick the surface you need now and keep moving through
            the rest whenever you want.
          </p>
        </div>

        <div className="opening-home__grid">
          <Link className="opening-home__card" to="/archive">
            <h3>Writings and archive</h3>
            <p>Read the long-form notes, preserved essays, and the personal record that should never be lost.</p>
          </Link>
          <Link className="opening-home__card" to="/marketplace">
            <h3>Business and trade</h3>
            <p>Run the marketplace, inventory, sourcing, fulfillment, and the buyer-supplier bridge.</p>
          </Link>
          <Link className="opening-home__card" to="/conference">
            <h3>Governance and public work</h3>
            <p>Track proposals, conference flow, and the public decisions that shape the site’s direction.</p>
          </Link>
          <Link className="opening-home__card" to="/heelkawn">
            <h3>HeelKawn</h3>
            <p>Open the game hub, download links, and repository pulse without leaving the main site.</p>
          </Link>
          <Link className="opening-home__card" to="/recovery">
            <h3>Recovery and install</h3>
            <p>Use the install page and continuity tools so the site can follow you from device to device.</p>
          </Link>
          <Link className="opening-home__card" to="/about">
            <h3>About and overview</h3>
            <p>Read the project description, personal context, and the larger purpose behind the whole system.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
