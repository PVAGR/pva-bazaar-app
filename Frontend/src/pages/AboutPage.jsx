import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FederationManifesto from '../components/FederationManifesto.jsx';
import './AboutPage.css';

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'mission', label: 'Principles' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'features', label: 'What Lasts' },
  ];

  return (
    <section className="about-page section-card">
      <header className="about-header">
        <h1>About PVA Bazaar</h1>
        <p className="about-tagline">
          Pure life knowledge in a bazaar format: reading, trade, recovery, memory, and public life
          for real people
        </p>
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
              PVA Bazaar is a public home for pure life knowledge and practical trade. It connects
              readers, buyers, suppliers, and makers around the world with a site that keeps
              writings, recovery, and commerce in one place.
            </p>
            <p>
              The platform brings together archive writing, presentation, recovery, and provenance
              so the commercial side of the work never becomes detached from the people, stories,
              and first principles behind it.
            </p>
            <div className="about-highlights">
              <div className="highlight-item">
                <h3>Truth before spin</h3>
                <p>The site stays legible and honest instead of hiding labor, origin, or intent.</p>
              </div>
              <div className="highlight-item">
                <h3>Work with soul</h3>
                <p>
                  Commerce matters here, but not as empty churn; it serves real people and
                  meaningful craft.
                </p>
              </div>
              <div className="highlight-item">
                <h3>Trade that respects origin</h3>
                <p>
                  Keep the maker, object, and record tied together instead of splitting story from
                  sale.
                </p>
              </div>
              <div className="highlight-item">
                <h3>Continuity beyond one founder</h3>
                <p>
                  Preserve the writings, operating logic, and testimony so the work can remain
                  coherent over time.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mission' && (
          <div id="mission-panel" role="tabpanel" aria-labelledby="mission-tab">
            <h2>Principles</h2>
            <p>
              The mission is not only to move goods. It is to build a public system where knowledge,
              trade, memory, and human dignity remain tied together instead of being split apart.
            </p>
            <div className="mission-pillars">
              <div className="pillar">
                <h3>Truth over deception</h3>
                <p>
                  Reject fake provenance, hollow branding, and detached storytelling in favor of
                  clear, accountable trade.
                </p>
              </div>
              <div className="pillar">
                <h3>Service through meaningful work</h3>
                <p>
                  Connect global suppliers and artisans with buyers who need trustworthy goods, not
                  anonymous inventory.
                </p>
              </div>
              <div className="pillar">
                <h3>Memory that survives commerce</h3>
                <p>
                  Keep the archive, testimony, and cultural context attached to the platform so
                  relationships can continue beyond the founder.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'how-it-works' && (
          <div id="how-it-works-panel" role="tabpanel" aria-labelledby="how-it-works-tab">
            <h2>How It Works</h2>
            <p>
              The platform is organized around a simple flow that keeps knowledge and business
              connected.
            </p>
            <ol className="how-it-works-list">
              <li>
                <strong>Read the foundation:</strong> Start with the books if you need the clearest
                explanation of the worldview behind the platform.
              </li>
              <li>
                <strong>Source and verify:</strong> Discover products, suppliers, and featured
                collections, then use profiles, provenance, and archive context to understand the
                people behind the goods.
              </li>
              <li>
                <strong>Present and sell:</strong> Use the supplier portal and product pages to turn
                relationships into repeatable business without stripping away context.
              </li>
              <li>
                <strong>Preserve:</strong> Keep the writing, mission, and institutional memory alive
                so the system remains legible over time.
              </li>
            </ol>
          </div>
        )}

        {activeTab === 'features' && (
          <div id="features-panel" role="tabpanel" aria-labelledby="features-tab">
            <h2>What lasts</h2>
            <div className="features-grid">
              <div className="feature">
                <h3>Books first</h3>
                <p>
                  The books remain the clearest entrance into the values, discipline, and long-range
                  purpose of the project.
                </p>
              </div>
              <div className="feature">
                <h3>Marketplace and showroom</h3>
                <p>
                  The commercial surfaces keep goods moving while giving buyers more trust, context,
                  and presentation quality.
                </p>
              </div>
              <div className="feature">
                <h3>Supplier Portal</h3>
                <p>
                  The entry point for artisans, suppliers, and sourcing partners joining the
                  network.
                </p>
              </div>
              <div className="feature">
                <h3>Archive Library</h3>
                <p>
                  The memory layer: essays, records, and long-form material that explain the work.
                </p>
              </div>
              <div className="feature">
                <h3>Provenance and identity</h3>
                <p>
                  Trust-building surfaces keep people, records, and objects linked so the work stays
                  legible.
                </p>
              </div>
              <div className="feature">
                <h3>Stewardship and continuity</h3>
                <p>
                  Public governance and operational systems help the project remain understandable
                  and maintainable over time.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="about-actions">
        <Link to="/books" className="button primary">
          Read the Books
        </Link>
        <Link to="/" className="button primary">
          Start Here
        </Link>
        <Link to="/marketplace" className="button ghost">
          Open Marketplace
        </Link>
        <Link to="/archive" className="button ghost">
          Read the Archive
        </Link>
      </div>
    </section>
  );
}
