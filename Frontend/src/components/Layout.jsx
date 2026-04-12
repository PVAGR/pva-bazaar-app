import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useArchiveTheme from '../hooks/useArchiveTheme.js';
import OpenClawFloatingAssistant from './OpenClawFloatingAssistant.jsx';

export default function Layout({ children }) {
  const { darkMode, toggleTheme } = useArchiveTheme();
  const location = useLocation();

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
          <NavLink to="/civilization-library">🧠 Civilization Library</NavLink>
          <NavLink to="/career-quiz">🧭 Career Quiz</NavLink>
          <NavLink to="/marketplace">🛒 Marketplace</NavLink>
          <NavLink to="/showroom">🏪 Showroom</NavLink>
          <NavLink to="/conference">🗳️ Popular Conference</NavLink>
          <NavLink to="/download-app">📲 Download App</NavLink>
          <NavLink to="/creator">✨ Creator Sign Up</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
        <button
          type="button"
          className="layout__themeToggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </header>
      <main id="content" className="layout__main">
        {children}
      </main>
      <OpenClawFloatingAssistant routePath={location.pathname || '/'} />
      <footer className="layout__footer">
        © {new Date().getFullYear()} · pvabazaar.org
      </footer>
    </div>
  );
}
