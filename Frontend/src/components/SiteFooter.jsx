import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Shared footer with engagement links. Use on public-facing pages.
 */
export default function SiteFooter({ style = {} }) {
  return (
    <footer className="site-footer" style={{ padding: 16, textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.1)', ...style }}>
      <Link to="/">Archive</Link>
      <span style={{ margin: '0 8px' }}>·</span>
      <Link to="/marketplace">Marketplace</Link>
      <span style={{ margin: '0 8px' }}>·</span>
      <Link to="/chat">Chat</Link>
      <span style={{ margin: '0 8px' }}>·</span>
      <Link to="/oracle">Oracle</Link>
      <span style={{ margin: '0 8px' }}>·</span>
      <Link to="/about">About</Link>
    </footer>
  );
}
