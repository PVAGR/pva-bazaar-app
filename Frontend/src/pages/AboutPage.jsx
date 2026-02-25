import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function AboutPage() {
  return (
    <>
      <Helmet><title>About | PVA Bazaar</title></Helmet>
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

        <p className="muted" style={{ marginTop: 32, fontSize: '0.9rem' }}>
          © {new Date().getFullYear()} pvabazaar.org
        </p>
      </div>
    </>
  );
}
