import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import OpenClawFloatingAssistant from './OpenClawFloatingAssistant.jsx';
import { PUBLIC_ROUTES } from '../config/publicRoutes';
import { getToken, clearToken } from '../lib/auth';
import useArchiveTheme from '../hooks/useArchiveTheme.js';
import useConnectionMode from '../hooks/useConnectionMode.js';
import { getPreferredApiBase } from '../lib/apiBase';

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
  const navigate = useNavigate();
  const token = getToken();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pva:cart');
      setCartCount(raw ? JSON.parse(raw).length : 0);
    } catch { setCartCount(0); }
    const handler = () => {
      try {
        const raw = localStorage.getItem('pva:cart');
        setCartCount(raw ? JSON.parse(raw).length : 0);
      } catch { setCartCount(0); }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [location]);
  const hasUserAccess = Boolean(token);
  const hasAdminAccess = useMemo(() => {
    const payload = parseJwtPayload(token);
    return String(payload?.role || '').toLowerCase() === 'admin';
  }, [token]);

  const pathname = useMemo(() => {
    const raw = (location?.pathname || '/').trim();
    const normalized = raw.replace(/^\/+$/, '');
    return normalized || '/';
  }, [location?.pathname]);

  const routeIdentity = useMemo(() => {
    if (pathname === '/') {
      return { badge: 'Home', title: 'PVA Bazaar', description: 'Pure life knowledge marketplace connecting trade, education, provenance, writings, and public partnership.' };
    }
    if (pathname.startsWith('/deal/')) {
      return { badge: null, title: 'Deal Proposal', description: 'Read-only public proposal page with authenticated verification.' };
    }
    if (pathname === '/books/publish') {
      return { badge: 'Publishing', title: 'Book Publishing', description: 'Draft, design, and publish a book with covers, manuscript, PDF, EPUB, and web view.' };
    }
    if (pathname === '/books/published') {
      return { badge: 'Books', title: 'Published Books', description: 'Browse published books, open the online reader, and download PDF or EPUB editions.' };
    }
    if (pathname.startsWith('/books/read/')) {
      return { badge: 'Books', title: 'Book Reader', description: 'Read a published book with its online web view and download options.' };
    }
    const route = PUBLIC_ROUTES.find((item) => item.to === pathname);
    if (route) {
      return { badge: route.badge || null, title: route.title, description: route.description || '' };
    }
    return { badge: null, title: pathname === '/' ? 'Home' : pathname, description: '' };
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

  // Global ?ref= capture — works on every route (query lives inside the hash
  // with HashRouter). Stored under the same keys the Next app + checkout use so
  // any subsequent purchase is attributed to the referrer, and the referrer's
  // click is reported to the backend so it is visible online (not just in a browser).
  useEffect(() => {
    try {
      const hashRef = (globalThis.location.hash || '').match(/[?&]ref=([^&#]*)/);
      let ref = hashRef ? hashRef[1] : new URLSearchParams(globalThis.location.search || '').get('ref') || '';
      ref = decodeURIComponent(ref);
      if (ref) {
        const normalized = ref.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (normalized.length >= 4) {
          window.localStorage.setItem('pva:referral-code', normalized);
          window.localStorage.setItem('pva:inbound-ref', normalized);
          const base = getPreferredApiBase();
          if (base) {
            fetch(`${base}/api/referrals/${encodeURIComponent(normalized)}/click`, { method: 'POST' })
              .catch(() => { /* non-blocking */ });
          }
        }
      }
    } catch (_err) { /* non-blocking */ }
  }, []);

  const primaryNavRoutes = useMemo(() => (
    PUBLIC_ROUTES.filter((route) => route.navPlacement === 'primary' && route.access === 'public')
  ), []);

  return (
    <div className={`layout ${darkMode ? 'layout--dark' : 'layout--light'}`}>
      <Helmet>
        <title>{routeIdentity?.title ? `${routeIdentity.title} · PVA Bazaar` : 'PVA Bazaar | Pure Life Knowledge Marketplace'}</title>
        <meta name="description" content={routeIdentity.description || 'PVA Bazaar is a pure life knowledge marketplace connecting education, trade, provenance, writings, and public partnerships.'} />
      </Helmet>

      <header className="layout__header">
        <div className="layout__headerInner">
          <NavLink to="/" className="layout__brand layout__brandLink">
            <span className="layout__title">pvabazaar.org</span>
            <span className="layout__tagline">Knowledge · Commerce · Partnerships · Archive</span>
          </NavLink>

          <nav className="layout__nav" aria-label="Primary">
            {primaryNavRoutes.map((route) => (
              <NavLink
                key={route.to}
                to={route.to}
                className={({ isActive }) => `layout__navLink ${isActive ? 'layout__navLink--active' : ''}`}
              >
                {route.title}
              </NavLink>
            ))}
          </nav>

          <div className="layout__status" aria-live="polite">
            <NavLink className="layout__statusAction" to="/cart" style={{ fontWeight: 600, marginRight: '8px', position: 'relative' }} title="Shopping Cart">
              Cart{cartCount > 0 ? <span style={{ background: '#1a7d3a', color: '#fff', borderRadius: '50%', padding: '0 6px', fontSize: '11px', fontWeight: 700, marginLeft: '4px' }}>{cartCount}</span> : null}
            </NavLink>
            {hasUserAccess ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {hasAdminAccess && (
                  <span style={{ color: '#fbbf24', fontSize: '16px' }} title="Admin">&#9812;</span>
                )}
                <NavLink className="layout__statusAction" to="/dashboard">
                  My Account
                </NavLink>
                {hasAdminAccess && (
                  <span style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    Admin
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => { clearToken(); navigate('/login'); window.location.reload(); }}
                  style={{ background: 'none', border: 'none', color: '#76c97d', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' }}
                  title="Sign out"
                >
                  &#10005;
                </button>
              </div>
            ) : (
              <NavLink className="layout__statusAction" to="/login" style={{ fontWeight: 600, color: '#fbbf24' }}>
                Sign in
              </NavLink>
            )}
            <button
              type="button"
              className="layout__themeToggle"
              onClick={toggleTheme}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? '\u2600' : '\u263D'}
            </button>
            {connectionMode.status !== 'live' ? (
              <span className={`layout__connectionBadge layout__connectionBadge--${connectionMode.status}`}>
                {connectionMode.label}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main id="main-content" className="layout__main">
        {children}
      </main>

      <footer className="layout__footer">
        <div className="layout__footerInner">
          <p className="layout__footerText">© {new Date().getFullYear()} PVA Bazaar. Pure life knowledge marketplace.</p>
        </div>
      </footer>

      <OpenClawFloatingAssistant />
    </div>
  );
}
