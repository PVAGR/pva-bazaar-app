import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FederationManifesto from '../components/FederationManifesto.jsx';
import './AboutPage.css';

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'mission', label: 'Mission' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'features', label: 'Features' },
  ];

  return (
    <section className="about-page section-card">
      <header className="about-header">
        <h1>About PVA Bazaar</h1>
        <p className="about-tagline">A trade network, provenance system, and living archive built to outlast a lifetime</p>
      </header>

      <FederationManifesto title="Why this work lasts" compact />

      <div className="about-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${tab.id}-panel`}
            id={`${tab.id}-tab`}
            className={`about-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="about-content">
        {activeTab === 'overview' && (
          <div id="overview-panel" role="tabpanel" aria-labelledby="overview-tab">
            <h2>What PVA Bazaar does</h2>
            <p>
              PVA Bazaar is a bridge between suppliers, artisans, and makers around the world and buyers in America who
              want goods they can actually trust, understand, and resell with confidence.
            </p>
            <p>
              The platform brings together sourcing, presentation, archive writing, and provenance so the commercial
              side of the work never becomes detached from the people and stories behind it.
            </p>
            <div className="about-highlights">
              <div className="highlight-item">
                <h3>Direct trade paths</h3>
                <p>Move from discovery to supplier contact with a clearer business surface.</p>
              </div>
              <div className="highlight-item">
                <h3>Provenance and trust</h3>
                <p>Keep the maker, object, and record tied together instead of splitting story from sale.</p>
              </div>
              <div className="highlight-item">
                <h3>Long memory</h3>
                <p>Preserve the writings, context, and testimony that make the platform more than a catalog.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mission' && (
          <div id="mission-panel" role="tabpanel" aria-labelledby="mission-tab">
            <h2>Mission</h2>
            <p>
              To build a professional system that helps real people trade across borders while preserving the soul,
              context, and accountability of the work.
            </p>
            <div className="mission-pillars">
              <div className="pillar">
                <h3>Trade that respects origin</h3>
                <p>Connect global suppliers and artisans with buyers who need trustworthy goods, not anonymous inventory.</p>
              </div>
              <div className="pillar">
                <h3>Memory that survives commerce</h3>
                <p>Keep the archive, testimony, and cultural context attached to the platform instead of treating them as extras.</p>
              </div>
              <div className="pillar">
                <h3>Trust that scales</h3>
                <p>Use provenance, identity, and clear systems so relationships can continue even beyond the founder’s lifetime.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'how-it-works' && (
          <div id="how-it-works-panel" role="tabpanel" aria-labelledby="how-it-works-tab">
            <h2>How It Works</h2>
            <p>
              The platform is organized around a simple flow that keeps business and meaning connected.
            </p>
            <ol className="how-it-works-list">
              <li>
                <strong>Source:</strong> Discover products, suppliers, and featured collections through the marketplace and showroom.
              </li>
              <li>
                <strong>Verify:</strong> Use profiles, provenance, and archive context to understand the people and story behind the goods.
              </li>
              <li>
                <strong>Present and sell:</strong> Use the supplier portal and product pages to turn relationships into repeatable business.
              </li>
              <li>
                <strong>Preserve:</strong> Keep the writing, mission, and institutional memory alive so the system remains legible over time.
              </li>
            </ol>
          </div>
        )}

        {activeTab === 'features' && (
          <div id="features-panel" role="tabpanel" aria-labelledby="features-tab">
            <h2>Core surfaces</h2>
            <div className="features-grid">
              <div className="feature">
                <h3>Marketplace</h3>
                <p>The commercial surface for goods, listings, and sourcing opportunities.</p>
              </div>
              <div className="feature">
                <h3>Showroom</h3>
                <p>A curated presentation layer for the best products, makers, and collections.</p>
              </div>
              <div className="feature">
                <h3>Supplier Portal</h3>
                <p>The entry point for artisans, suppliers, and sourcing partners joining the network.</p>
              </div>
              <div className="feature">
                <h3>Archive Library</h3>
                <p>The memory layer: essays, records, and long-form material that explain the work.</p>
              </div>
              <div className="feature">
                <h3>Provenance and identity</h3>
                <p>Trust-building surfaces that keep people, records, and objects linked.</p>
              </div>
              <div className="feature">
                <h3>Governance</h3>
                <p>Public decision surfaces for the parts of the platform that need accountable stewardship.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="about-actions">
        <Link to="/" className="button primary">Start Here</Link>
        <Link to="/marketplace" className="button ghost">Open Marketplace</Link>
        <Link to="/archive" className="button ghost">Read the Archive</Link>
      </div>
    </section>
  );
}
