import React, { useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import OpenClawFloatingAssistant from './OpenClawFloatingAssistant.jsx';
import { PUBLIC_ROUTES } from '../config/publicRoutes';
import { getToken } from '../lib/auth';
import useArchiveTheme from '../hooks/useArchiveTheme.js';
import useConnectionMode from '../hooks/useConnectionMode.js';

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
  const connectionMode = useConnectionMode();
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
        badge: null,
        title: 'Deal Proposal',
        description: 'Read-only public proposal page with authenticated verification.',
      };
    }

    if (pathname === '/books/publish') {
      return {
        badge: 'Publishing',
        title: 'Book Publishing',
        description: 'Draft, design, and publish a book with covers, manuscript, PDF, EPUB, and web view.',
      };
    }

    if (pathname === '/books/published') {
      return {
        badge: 'Books',
        title: 'Published Books',
        description: 'Browse published books, open the online reader, and download PDF or EPUB editions.',
      };
    }

    if (pathname.startsWith('/books/read/')) {
      return {
        badge: 'Books',
        title: 'Book Reader',
        description: 'Read a published book with its online web view and download options.',
      };
    }

    const route = PUBLIC_ROUTES.find((item) => item.to === pathname);
    if (route) {
      return {
        badge: route.badge || null,
        title: route.title,
        description: route.description || '',
      };
    }

    return {
      badge: null,
      title: pathname === '/' ? 'Home' : pathname,
      description: '',
    };
  }, [pathname]);

  useEffect(() => {
    if (!globalThis.document?.body) return undefined;

    globalThis.document.body.dataset.appContentReady = 'true';

    return () => {
      if (globalThis.document?.body?.dataset?.appContentReady) {
        delete globalThis.document.body.dataset.appContentReady;
      }
    };
  }, []);

  useEffect(() => {
    const baseTitle = 'pvabazaar.org';
    if (routeIdentity?.title) {
      globalThis.document.title = `${routeIdentity.title} · ${baseTitle}`;
    }
  }, [routeIdentity]);

  const primaryNavRoutes = useMemo(() => (
    PUBLIC_ROUTES.filter((route) => route.navPlacement === 'primary' && route.access === 'public')
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

  const footerKnowledgeRoutes = useMemo(() => [
    { key: 'archive', to: '/archive', title: 'Archive Library' },
    { key: 'books', to: '/books', title: 'Books' },
    { key: 'books-published', to: '/books/published', title: 'Published Books' },
    { key: 'civilization-library', to: '/civilization-library', title: 'Civilization Library' },
    { key: 'forum', to: '/forum', title: 'Forum' },
  ], []);

  const footerCommerceRoutes = useMemo(() => [
    { key: 'marketplace', to: '/marketplace', title: 'Marketplace' },
    { key: 'showroom', to: '/showroom', title: 'Showroom' },
    { key: 'creator', to: '/creator', title: 'Supplier Portal' },
    { key: 'heelkawn', to: '/heelkawn', title: 'HeelKawn' },
    { key: 'recovery', to: '/recovery', title: 'Recovery & Install' },
  ], []);

  const footerCivicRoutes = useMemo(() => [
    { key: 'proposals', to: '/proposals', title: 'Proposals' },
    { key: 'conference', to: '/conference', title: 'Conference' },
    { key: 'treasury', to: '/treasury', title: 'Treasury' },
    { key: 'citizens', to: '/citizens', title: 'Citizens' },
    { key: 'about', to: '/about', title: 'About' },
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
          <span className={`layout__connectionBadge layout__connectionBadge--${connectionMode.status}`}>
            {connectionMode.label}
          </span>
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
        {pathname !== '/' ? (
          <section className="section-card layout__routeIdentity" data-route-identity="true" aria-label="Current route identity">
            {routeIdentity.badge ? (
              <div className="pill" data-route-label="badge">{routeIdentity.badge}</div>
            ) : null}
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
        ) : null}
        {children}
      </main>
      {hasAdminAccess ? (
        <OpenClawFloatingAssistant routePath={location.pathname || '/'} />
      ) : null}
      <footer className="layout__footer">
        <div className="layout__footerGrid">
          <section className="layout__footerSection" aria-label="Knowledge">
            <h2>Knowledge</h2>
            <div className="layout__footerLinks">
              {footerKnowledgeRoutes.map((route) => (
                <NavLink key={route.key} to={route.to} end={route.to === '/'}>
                  {route.title}
                </NavLink>
              ))}
            </div>
          </section>

          <section className="layout__footerSection" aria-label="Commerce">
            <h2>Commerce</h2>
            <div className="layout__footerLinks">
              {footerCommerceRoutes.map((route) => (
                <NavLink key={route.key} to={route.to} end={route.to === '/'}>
                  {route.title}
                </NavLink>
              ))}
            </div>
          </section>

          <section className="layout__footerSection" aria-label="Civic">
            <h2>Civic</h2>
            <div className="layout__footerLinks">
              {footerCivicRoutes.map((route) => (
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
