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
        <p className="about-tagline">A sovereign platform for memory, trade, and accountable decisions</p>
      </header>

      <FederationManifesto title="Why The Federation Exists" compact />

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
            <h2>Archive & Platform Overview</h2>
            <p>
              A clean, non-commercial journal and archive dedicated to preserving personal writings with intent. 
              Everything here is readable, searchable, and built to last—without marketplace clutter or unnecessary commercialization.
            </p>
            <p>
              This platform combines memory preservation with community accountability. Your writings are preserved, 
              your identity is verifiable, and your contributions to the ecosystem are tracked.
            </p>
            <div className="about-highlights">
              <div className="highlight-item">
                <h3>🔍 Searchable</h3>
                <p>Find any entry instantly with powerful search capabilities</p>
              </div>
              <div className="highlight-item">
                <h3>🛡️ Preserved</h3>
                <p>Content is durable and protected within the archive</p>
              </div>
              <div className="highlight-item">
                <h3>👤 Identified</h3>
                <p>Verified citizen identity with portable credentials</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mission' && (
          <div id="mission-panel" role="tabpanel" aria-labelledby="mission-tab">
            <h2>Our Mission</h2>
            <p>
              To create a civilization-scale platform that enables memory preservation, fair trade, and accountable community decisions.
            </p>
            <div className="mission-pillars">
              <div className="pillar">
                <h3>Memory & Archives</h3>
                <p>Preserve human knowledge and personal testimony across time and place</p>
              </div>
              <div className="pillar">
                <h3>Authentic Trade</h3>
                <p>Enable direct commerce between creators and collectors with full provenance</p>
              </div>
              <div className="pillar">
                <h3>Accountable Decisions</h3>
                <p>Build governance systems where every citizen can verify outcomes and participate</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'how-it-works' && (
          <div id="how-it-works-panel" role="tabpanel" aria-labelledby="how-it-works-tab">
            <h2>How It Works</h2>
            <p>
              Built with React and backed by an API with opt-in admin tools. Content stays textual and intentional.
            </p>
            <ol className="how-it-works-list">
              <li>
                <strong>Archive:</strong> Submit or browse curated entries across history, culture, and craft
              </li>
              <li>
                <strong>Verify Identity:</strong> Build your citizen passport with verifiable credentials
              </li>
              <li>
                <strong>Trade & Collect:</strong> Connect with creators, view artifacts, and participate in commerce
              </li>
              <li>
                <strong>Contribute & Govern:</strong> Vote on decisions, contribute to collective memory, shape the platform
              </li>
            </ol>
          </div>
        )}

        {activeTab === 'features' && (
          <div id="features-panel" role="tabpanel" aria-labelledby="features-tab">
            <h2>Key Features</h2>
            <div className="features-grid">
              <div className="feature">
                <h3>📚 Archive Library</h3>
                <p>Browse and search historical entries, essays, and curated content</p>
              </div>
              <div className="feature">
                <h3>🎫 Citizen Passport</h3>
                <p>Build verified identity credentials portable across the platform</p>
              </div>
              <div className="feature">
                <h3>🛍️ Marketplace</h3>
                <p>Discover authentic artifacts with complete provenance history</p>
              </div>
              <div className="feature">
                <h3>📝 Journal</h3>
                <p>Write and preserve your own long-form content</p>
              </div>
              <div className="feature">
                <h3>🔗 Blockchain Provenance</h3>
                <p>Verify authenticity and ownership history on-chain</p>
              </div>
              <div className="feature">
                <h3>🗳️ Governance</h3>
                <p>Participate in platform decisions as a verified citizen</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="about-actions">
        <Link to="/" className="button primary">Start Exploring</Link>
        <Link to="/archive" className="button ghost">Open Archive</Link>
        <Link to="/proposals" className="button ghost">Open Governance</Link>
      </div>
    </section>
  );
}
