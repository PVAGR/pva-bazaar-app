import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Layout({ children }) {
  return (
    <div className="layout">
      <a className="sr-only" href="#content">Skip to content</a>
      <header className="layout__header">
        <div className="layout__brand">
          <div className="layout__title">pvabazaar.org</div>
          <div className="layout__tagline">The Complete Archive</div>
        </div>
        <nav className="layout__nav" aria-label="Primary">
          <NavLink to="/" end>📚 Archive Library</NavLink>
          <NavLink to="/marketplace">🛒 Marketplace</NavLink>
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
