import React, { useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import OpenClawFloatingAssistant from './OpenClawFloatingAssistant.jsx';
import { PUBLIC_ROUTES } from '../config/publicRoutes';
import { getToken } from '../lib/auth';
import useArchiveTheme from '../hooks/useArchiveTheme.js';

const FOOTER_SUMMARY = 'PVA Bazaar is a sourcing bridge, provenance system, and living archive built to connect makers, buyers, and the long memory behind every object.';

function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const normalized = token.startsWith('Bearer ') ? token.slice(7) : token;
  const parts = normalized.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = globalThis.atob(base64);
    return JSON.parse(json);
  } catch (_err) {
    return null;
  }
}

export default function Layout({ children }) {
  const { darkMode, toggleTheme } = useArchiveTheme();
  const location = useLocation();
  const token = getToken();
  const hasUserAccess = Boolean(token);
  const hasAdminAccess = useMemo(() => {
    const payload = parseJwtPayload(token);
    return String(payload?.role || '').toLowerCase() === 'admin';
  }, [token]);
  const pathname = useMemo(() => {
    const raw = (location?.pathname || '/').trim();
    const normalized = raw.replace(/\/+$/, '');
    return normalized || '/';
  }, [location?.pathname]);

  const routeIdentity = useMemo(() => {
    if (pathname.startsWith('/deal/')) {
      return {
        section: 'Public Deal',
        title: 'Deal Proposal',
        description: 'Read-only public proposal page with authenticated verification.',
      };
    }

    const route = PUBLIC_ROUTES.find((item) => item.to === pathname);
    if (route) {
      return {
        section: route.group === 'core' ? 'Core Route' : route.group === 'support' ? 'Support Route' : 'Route',
        title: route.title,
        description: route.description || '',
      };
    }

    return {
      section: 'Route',
      title: pathname === '/' ? 'Home' : pathname,
      description: '',
    };
  }, [pathname]);

  useEffect(() => {
    const baseTitle = 'PVA Bazaar';
    if (routeIdentity?.title) {
      globalThis.document.title = `${routeIdentity.title} · ${baseTitle}`;
    }
  }, [routeIdentity]);

  const primaryNavRoutes = useMemo(() => (
    PUBLIC_ROUTES.filter((route) => route.navPlacement === 'primary' && route.access === 'public')
  ), []);

  const footerTradeRoutes = useMemo(() => [
    { key: 'marketplace', to: '/marketplace', title: 'Marketplace' },
    { key: 'showroom', to: '/showroom', title: 'Showroom' },
    { key: 'creator', to: '/creator', title: 'Supplier Portal' },
    { key: 'get-started', to: '/get-started', title: 'Get Started' },
  ], []);

  const footerContextRoutes = useMemo(() => [
    { key: 'home', to: '/', title: 'Start Here' },
    { key: 'books', to: '/books', title: 'Books' },
    { key: 'archive', to: '/archive', title: 'Archive Library' },
    { key: 'civilization', to: '/civilization-library', title: 'Civilization Library' },
    { key: 'about', to: '/about', title: 'About' },
  ], []);

  const footerNetworkRoutes = useMemo(() => [
    { key: 'proposals', to: '/proposals', title: 'Governance' },
    { key: 'conference', to: '/conference', title: 'Popular Conference' },
    { key: 'forum', to: '/forum', title: 'Forum' },
    { key: 'citizens', to: '/citizens', title: 'Citizens' },
  ], []);

  return (
    <div className="layout">
      <a className="sr-only" href="#content">Skip to content</a>
      <header className="layout__header">
        <NavLink to="/" end className="layout__brand layout__brandLink" aria-label="PVA Bazaar home">
          <div className="layout__title">pvabazaar.org</div>
          <div className="layout__tagline">Global sourcing · provenance · living archive</div>
        </NavLink>
        <nav className="layout__nav" aria-label="Primary">
          {primaryNavRoutes.map((route) => (
            <NavLink key={route.key} to={route.to} end={route.to === '/'}>
              {route.navLabel}
            </NavLink>
          ))}
        </nav>
        <div className="layout__status" aria-live="polite">
          <span className="layout__statusLabel">User Status</span>
          <NavLink className="layout__statusAction" to={hasUserAccess ? '/dashboard' : '/login'}>
            {hasUserAccess ? 'Authenticated' : 'Guest'}
          </NavLink>
        </div>
        <button
          type="button"
          className="layout__themeToggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {darkMode ? '☀ Day' : '🌙 Night'}
        </button>
      </header>
      <main id="content" className="layout__main">
        {children}
      </main>
      {hasAdminAccess ? (
        <OpenClawFloatingAssistant routePath={location.pathname || '/'} />
      ) : null}
      <footer className="layout__footer">
        <div className="layout__footerGrid">
          <section className="layout__footerSection" aria-label="Trade routes">
            <h2>Trade</h2>
            <div className="layout__footerLinks">
              {footerTradeRoutes.map((route) => (
                <NavLink key={route.key} to={route.to} end={route.to === '/'}>
                  {route.title}
                </NavLink>
              ))}
            </div>
          </section>

          <section className="layout__footerSection" aria-label="Context routes">
            <h2>Context</h2>
            <div className="layout__footerLinks">
              {footerContextRoutes.map((route) => (
                <NavLink key={route.key} to={route.to} end={route.to === '/'}>
                  {route.title}
                </NavLink>
              ))}
            </div>
          </section>

          <section className="layout__footerSection" aria-label="Network routes">
            <h2>Network</h2>
            <p style={{ margin: 0, lineHeight: 1.65 }}>{FOOTER_SUMMARY}</p>
            <div className="layout__footerLinks" style={{ marginTop: '0.65rem' }}>
              {footerNetworkRoutes.map((route) => (
                <NavLink key={route.key} to={route.to} end={route.to === '/'}>
                  {route.title}
                </NavLink>
              ))}
            </div>
          </section>
        </div>
        <div className="layout__footerMeta">© {new Date().getFullYear()} · pvabazaar.org</div>
      </footer>
    </div>
  );
}
