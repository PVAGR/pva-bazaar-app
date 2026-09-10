import { useEffect, useMemo, useState, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { Helmet } from 'react-helmet-async';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import OpenClawFloatingAssistant from './OpenClawFloatingAssistant.jsx';
import UniversalSearch, { useUniversalSearchShortcut } from './UniversalSearch.jsx';
import { PUBLIC_ROUTES } from '../config/publicRoutes';
import { getToken, clearToken } from '../lib/auth';
import useArchiveTheme from '../hooks/useArchiveTheme.js';
import useConnectionMode from '../hooks/useConnectionMode.js';
import { apiUrl } from '../lib/apiBase';

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

// Primary nav items (simplified for Phase 6)
const PRIMARY_NAV = [
  { to: '/marketplace', title: 'Marketplace' },
  { to: '/books', title: 'Books' },
  { to: '/blog', title: 'Blog' },
  { to: '/archive', title: 'Archive' },
];

// Explore dropdown groups
const EXPLORE_GROUPS = [
  {
    label: 'Knowledge',
    links: [
      { to: '/civilization-library', title: 'Civilization Library' },
      { to: '/institutions', title: 'Institutions' },
    ],
  },
  {
    label: 'Community',
    links: [
      { to: '/partnerships', title: 'Partnerships' },
      { to: '/partners', title: 'Partner Program' },
      { to: '/forum', title: 'Forum' },
    ],
  },
  {
    label: 'Commerce',
    links: [
      { to: '/showroom', title: 'Showroom' },
      { to: '/creator', title: 'Supplier Portal' },
    ],
  },
  {
    label: 'About',
    links: [
      { to: '/about', title: 'About PVA' },
      { to: '/contact', title: 'Contact' },
      { to: '/provenance', title: 'Provenance' },
    ],
  },
];

export default function Layout({ children }) {
  const { darkMode, toggleTheme } = useArchiveTheme();
  const connectionMode = useConnectionMode();
  const location = useLocation();
  const navigate = useNavigate();
  const token = getToken();
  const [cartCount, setCartCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);

  // Universal search shortcut
  useUniversalSearchShortcut(useCallback(() => setSearchOpen(true), []));

  // Listen for pva:open-search custom event (from homepage)
  useEffect(() => {
    function handleOpenSearch() {
      setSearchOpen(true);
    }
    window.addEventListener('pva:open-search', handleOpenSearch);
    return () => window.removeEventListener('pva:open-search', handleOpenSearch);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setExploreOpen(false);
  }, [location.pathname]);

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

  // Global ?ref= capture
  useEffect(() => {
    try {
      const hashRef = (globalThis.location.hash || '').match(/[?&]ref=([^&#]*)/);
      let ref = hashRef ? hashRef[1] : new URLSearchParams(globalThis.location.search || '').get('ref') || '';
      ref = decodeURIComponent(ref);
      if (ref) {
        const normalized = ref.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (normalized.length >= 6) {
          window.localStorage.setItem('pva:referral-code', normalized);
          window.localStorage.setItem('pva:inbound-ref', normalized);
          const pingKey = `pva:ref-click-sent:${normalized}`;
          let alreadySent = false;
          try {
            alreadySent = window.sessionStorage.getItem(pingKey) === '1';
          } catch (_e) { /* storage unavailable — send once anyway */ }
          if (!alreadySent) {
            try {
              window.sessionStorage.setItem(pingKey, '1');
            } catch (_e) { /* ignore */ }
            fetch(apiUrl(`/referrals/${encodeURIComponent(normalized)}/click`), { method: 'POST' })
              .catch((pingErr) => {
                console.warn('[referral] click ping failed:', pingErr?.message || pingErr);
              });
          }
        }
      }
    } catch (_err) { /* non-blocking */ }
  }, []);

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
            {PRIMARY_NAV.map((route) => (
              <NavLink
                key={route.to}
                to={route.to}
                className={({ isActive }) => `layout__navLink ${isActive ? 'layout__navLink--active' : ''}`}
              >
                {route.title}
              </NavLink>
            ))}
            <div
              className="layout__explore"
              aria-expanded={exploreOpen}
              onMouseEnter={() => setExploreOpen(true)}
              onMouseLeave={() => setExploreOpen(false)}
            >
              <button
                type="button"
                className="layout__navLink layout__exploreToggle"
                onClick={() => setExploreOpen(!exploreOpen)}
                aria-haspopup="true"
              >
                Explore
              </button>
              <div className="layout__exploreDropdown">
                {EXPLORE_GROUPS.map((group) => (
                  <div key={group.label} className="layout__exploreGroup">
                    <div className="layout__exploreGroupLabel">{group.label}</div>
                    <div className="layout__exploreLinks">
                      {group.links.map((link) => (
                        <NavLink
                          key={link.to}
                          to={link.to}
                          className="layout__exploreLink"
                          onClick={() => setExploreOpen(false)}
                        >
                          {link.title}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </nav>

          <div className="layout__status" aria-live="polite">
            <button
              type="button"
              className="layout__navLink"
              onClick={() => setSearchOpen(true)}
              title="Search (Ctrl+K)"
            >
              Search
            </button>
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

          <button
            type="button"
            className="layout__hamburger"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <span />
            <span />
            <span />
          </button>

          <nav
            id="mobile-nav"
            className="layout__mobileNav"
            aria-hidden={!mobileMenuOpen}
          >
            <div className="layout__mobileNavGroup">
              <div className="layout__mobileNavLabel">Core</div>
              <div className="layout__mobileNavLinks">
                {PRIMARY_NAV.map((route) => (
                  <NavLink
                    key={route.to}
                    to={route.to}
                    className="layout__mobileNavLink"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {route.title}
                  </NavLink>
                ))}
              </div>
            </div>
            {EXPLORE_GROUPS.map((group) => (
              <div key={group.label} className="layout__mobileNavGroup">
                <div className="layout__mobileNavLabel">{group.label}</div>
                <div className="layout__mobileNavLinks">
                  {group.links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className="layout__mobileNavLink"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.title}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
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

      <UniversalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <OpenClawFloatingAssistant />
    </div>
  );
}
