import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { SITE_TAGLINE } from '../lib/philosophy.js';

export default function Layout({ children }) {
  const location = useLocation();
  const pathname = location?.pathname || '/';
  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    // Admin has its own full-screen shell and controls.
    return <>{children}</>;
  }

  const token =
    typeof window !== 'undefined' &&
    (localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('jwt'));
  return (
    <div className="layout">
      <a className="sr-only" href="#content">Skip to content</a>
      <header className="layout__header">
        <div className="layout__brand">
          <div className="layout__title">pvabazaar.org</div>
          <div className="layout__tagline">{SITE_TAGLINE}</div>
        </div>
        <nav className="layout__nav" aria-label="Primary">
          <NavLink to="/" end>📚 Archive</NavLink>
          <NavLink to="/verification">✓ Verification</NavLink>
          <NavLink to="/manifesto">Manifesto</NavLink>
          <NavLink to="/marketplace">🛒 Marketplace</NavLink>
          <NavLink to="/cart">Cart</NavLink>
          {token ? <NavLink to="/items/new">📦 Sell Item</NavLink> : null}
          <NavLink to="/oracle">🔮 Oracle Assessment</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
      </header>
      <main id="content" className="layout__main">
        {children}
      </main>
      <footer className="layout__footer">
        © {new Date().getFullYear()} · pvabazaar.org
      </footer>
    </div>
  );
}
