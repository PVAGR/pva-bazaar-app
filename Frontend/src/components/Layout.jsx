import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Layout({ children, onSearch, searchTerm }) {
  return (
    <div className="layout">
      <a className="sr-only" href="#content">Skip to content</a>
      <header className="layout__header">
        <div className="layout__brand">
          <div className="layout__title">pvabazaar.org</div>
          <div className="layout__tagline">A Life in Words</div>
        </div>
        <nav className="layout__nav" aria-label="Primary">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/journal">Journal</NavLink>
          <NavLink to="/archive">Archive</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/admin">Admin</NavLink>
          <a className="magnum-opus-link" href="/magnum-opus.html">✨ Magnum Opus</a>
        </nav>
        <div className="layout__search">
          <input
            type="search"
            placeholder="Search entries…"
            value={searchTerm}
            onChange={(e) => onSearch?.(e.target.value)}
            aria-label="Search entries"
          />
        </div>
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
