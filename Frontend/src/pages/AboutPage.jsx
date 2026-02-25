import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import SiteFooter from '../components/SiteFooter.jsx';

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About | PVA Bazaar</title>
        <meta name="description" content="About pvabazaar.org — journal, archive, marketplace. Chat with Richard, browse artifacts, explore the Oracle." />
        <meta property="og:title" content="About | PVA Bazaar" />
        <meta property="og:description" content="About pvabazaar.org — journal, archive, marketplace. Chat with Richard, browse artifacts, explore the Oracle." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pvabazaar.org/#/about" />
      </Helmet>
      <div className="about-page" style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
        <p style={{ marginBottom: 24 }}><Link to="/">← Back to Archive</Link></p>
        <h1>About pvabazaar.org</h1>
        <p>
          A clean, non-commercial journal and archive of personal writings. Everything here is meant
          to be readable, searchable, and preserved—without marketplace clutter.
        </p>
        <p>
          Built with React, backed by an API with opt-in admin tools for adding and editing entries.
          Content stays textual and intentional.
        </p>

        <h2 style={{ marginTop: 32 }}>Engage</h2>
        <ul style={{ lineHeight: 1.8 }}>
          <li><Link to="/chat">💬 Chat with Richard</Link> — Direct supply chain sourcer; ask about sourcing, vetting, or partnerships.</li>
          <li><Link to="/marketplace">🛒 Marketplace</Link> — Browse artifacts and crafts.</li>
          <li><Link to="/oracle">🔮 Oracle Assessment</Link> — Explore AI-powered insights.</li>
          <li><Link to="/">📚 Archive Library</Link> — 40+ works, 110,000+ words.</li>
        </ul>

        <h2 style={{ marginTop: 32 }}>Contact</h2>
        <p>
          Richard Torres · pvaglobalreach@gmail.com · <a href="https://pvabazaar.com" target="_blank" rel="noopener noreferrer">pvabazaar.com</a>
        </p>
        <p className="muted small">
          <Link to="/login">Log in</Link> or <Link to="/register">register</Link> to access Broker Hub, sell items, and manage deals.
        </p>

        <div style={{ marginTop: 32 }}>
          <SiteFooter style={{ borderTop: 'none', padding: 0, marginBottom: 8 }} />
          <p className="muted" style={{ fontSize: '0.9rem', margin: 0 }}>© {new Date().getFullYear()} pvabazaar.org</p>
        </div>
      </div>
    </>
  );
}
