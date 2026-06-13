import React, { useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import OpenClawFloatingAssistant from './OpenClawFloatingAssistant.jsx';
import { PUBLIC_ROUTES } from '../config/publicRoutes';
import { getToken } from '../lib/auth';
import useArchiveTheme from '../hooks/useArchiveTheme.js';

const FEDERATION_SNIPPET =
  'PVA Bazaar is my personal archive, business bridge, and continuity layer. Nothing important should be hidden, lost, or silently replaced.';

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
    const baseTitle = 'pvabazaar.org';
    if (routeIdentity?.title) {
      globalThis.document.title = `${routeIdentity.title} · ${baseTitle}`;
    }
  }, [routeIdentity]);

  const primaryNavRoutes = useMemo(() => (
    PUBLIC_ROUTES.filter((route) => route.navPlacement === 'primary' && route.access === 'public')
  ), []);

  const footerExploreRoutes = useMemo(() => (
    PUBLIC_ROUTES.filter((route) => route.access === 'public')
  ), []);

  const traversal = useMemo(() => {
    const publicRoutes = PUBLIC_ROUTES.filter((route) => route.access === 'public');
    const currentIndex = publicRoutes.findIndex((route) => route.to === pathname);
    if (currentIndex < 0) {
      return { prev: null, next: null };
    }
    return {
      prev: currentIndex > 0 ? publicRoutes[currentIndex - 1] : null,
      next: currentIndex < publicRoutes.length - 1 ? publicRoutes[currentIndex + 1] : null,
    };
  }, [pathname]);

  const footerCitizenRoutes = useMemo(() => [
    { key: 'citizens', to: '/citizens', title: 'Citizens' },
    { key: 'passport', to: '/passport', title: 'Citizen Passport' },
    { key: 'conference', to: '/conference', title: 'Conference' },
    { key: 'treasury', to: '/treasury', title: 'Treasury' },
    { key: 'proposals', to: '/proposals', title: 'Proposals' },
  ], []);

  const footerEssentialRoutes = useMemo(() => [
    { key: 'home', to: '/', title: 'Home' },
    { key: 'about', to: '/about', title: 'About' },
    { key: 'marketplace', to: '/marketplace', title: 'Marketplace' },
    { key: 'archive', to: '/archive', title: 'Archive Library' },
    { key: 'recovery', to: '/recovery', title: 'Recovery' },
    { key: 'download', to: '/download-app', title: 'Download App' },
  ], []);

  return (
    <div className="layout">
      <a className="sr-only" href="#content">Skip to content</a>
      <header className="layout__header">
        <NavLink to="/" end className="layout__brand layout__brandLink" aria-label="PVA Bazaar home">
          <div className="layout__title">pvabazaar.org</div>
          <div className="layout__tagline">Personal site · Writings · Business · HeelKawn</div>
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
        <section className="section-card layout__routeIdentity" data-route-identity="true" aria-label="Current route identity">
          <div className="pill" data-route-label="section">{routeIdentity.section}</div>
          <h2 data-route-label="title" className="layout__routeTitle">
            {routeIdentity.title}
          </h2>
          {routeIdentity.description ? (
            <p data-route-label="description" className="layout__routeDescription">
              {routeIdentity.description}
            </p>
          ) : null}
          {(traversal.prev || traversal.next) ? (
            <div className="layout__routeTraversal" aria-label="Route traversal">
              {traversal.prev ? <NavLink to={traversal.prev.to}>← {traversal.prev.title}</NavLink> : <span />}
              {traversal.next ? <NavLink to={traversal.next.to}>{traversal.next.title} →</NavLink> : <span />}
            </div>
          ) : null}
        </section>
        {children}
      </main>
      {hasAdminAccess ? (
        <OpenClawFloatingAssistant routePath={location.pathname || '/'} />
      ) : null}
      <footer className="layout__footer">
        <div className="layout__footerGrid">
          <section className="layout__footerSection" aria-label="Essential routes">
            <h2>Essential</h2>
            <div className="layout__footerLinks">
              {footerEssentialRoutes.map((route) => (
                <NavLink key={route.key} to={route.to} end={route.to === '/'}>
                  {route.title}
                </NavLink>
              ))}
            </div>
          </section>

          <section className="layout__footerSection" aria-label="Explore routes">
            <h2>Explore</h2>
            <div className="layout__footerLinks">
              {footerExploreRoutes.map((route) => (
                <NavLink key={route.key} to={route.to} end={route.to === '/'}>
                  {route.title}
                </NavLink>
              ))}
            </div>
          </section>

          <section className="layout__footerSection" aria-label="Federation manifesto snippet">
            <h2>Manifesto</h2>
            <p style={{ margin: 0, lineHeight: 1.65 }}>{FEDERATION_SNIPPET}</p>
            <div className="layout__footerLinks" style={{ marginTop: '0.65rem' }}>
              {footerCitizenRoutes.map((route) => (
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
